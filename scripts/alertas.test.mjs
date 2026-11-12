import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";
import vm from "node:vm";
import * as state from "../src/Iceplay.Api/wwwroot/alertas-estado.mjs";
import { utcParaLocal } from "../src/Iceplay.Api/wwwroot/historico-estado.mjs";

const alerta = (change = {}) => ({ id: 1, geladeiraId: 1, geladeiraNome: "FIXTURE <img onerror=erro>", origem: "Simulacao",
  tipo: "TemperaturaForaFaixa", gravidade: "Critico", situacao: "Aberto", inicioCondicaoEmUtc: "2026-11-12T12:00:00Z",
  abertoEmUtc: "2026-11-12T12:00:01Z", ultimaEvidenciaEmUtc: "2026-11-12T12:00:00Z", encerradoEmUtc: null,
  motivoEncerramento: null, leituraAberturaId: 1, temperaturaAberturaC: 0, temperaturaMinimaC: 1, temperaturaMaximaC: 5,
  toleranciaPortaAbertaSegundos: 30, ausenciaLeiturasSegundos: 60, ...change });
const filtros = (change = {}) => ({ geladeiraId: null, origem: null, tipo: null, gravidade: null, situacao: null,
  inicioUtc: null, fimUtc: null, pagina: 1, tamanhoPagina: 20, ...change });
const page = (f = filtros(), itens = [alerta()], total = itens.length) => ({ ...f, totalItens: total, totalPaginas: Math.ceil(total / f.tamanhoPagina), itens });
const resumo = (change = {}) => ({ origem: "Simulacao", consultadoEmUtc: "2026-11-12T12:00:10Z", abertos: 1, criticos: 1,
  equipamentosMonitorados: 1, equipamentosSemMonitoramentoNestaOrigem: 0,
  avaliador: { ultimoSucessoEmUtc: "2026-11-12T12:00:10Z", saudavel: true }, recentes: [alerta()], ...change });

test("filtros vazios permitem consulta global e URL preserva escolha e paginacao", () => {
  assert.deepEqual(state.filtrosDaUrl(""), filtros());
  const f = filtros({ geladeiraId: 2, origem: "Hardware", situacao: "Aberto", pagina: 2, tamanhoPagina: 50 });
  assert.deepEqual(state.filtrosDaUrl(state.criarConsulta(f)), f);
});
test("filtros invalidos nao viram consulta parcial silenciosa", () => {
  for (const query of ["geladeiraId=0", "origem=", "origem=hardware", "tipo=__proto__", "gravidade=Alta", "situacao=Resolvido",
    "pagina=0", "pagina=1.5", "tamanhoPagina=101", "pagina=2147483647&tamanhoPagina=100", "inicioUtc=2026-02-30T00:00:00Z"])
    assert.throws(() => state.filtrosDaUrl(query), query);
});
test("periodo valida UTC Z, calendario e ordem e converte horario local", () => {
  assert.equal(state.localParaUtc(""), null);
  assert.equal(state.localParaUtc("2026-11-12T10:15:30"), new Date("2026-11-12T10:15:30").toISOString());
  for (const value of ["2026-02-30T10:00:00", "invalido", "2026-11-12T25:00:00"]) assert.throws(() => state.localParaUtc(value));
  assert.throws(() => state.validarFiltros(filtros({ inicioUtc: "2026-11-13T00:00:00Z", fimUtc: "2026-11-12T00:00:00Z" })));
});
test("episodio valida zero como temperatura e distingue encerramento sem normalizacao", () => {
  assert.equal(state.validarAlerta(alerta()).temperaturaAberturaC, 0);
  assert.doesNotThrow(() => state.validarAlerta(alerta({ situacao: "Encerrado", encerradoEmUtc: "2026-11-12T12:01:00Z", motivoEncerramento: "SemDadosRecentes" })));
  for (const change of [{ id: 0 }, { origem: "hardware" }, { temperaturaAberturaC: Infinity }, { tipo: "__proto__" },
    { situacao: "Encerrado" }, { gravidade: "Alto" }, { toleranciaPortaAbertaSegundos: 0 }, { abertoEmUtc: "2026-02-30T00:00:00Z" }])
    assert.throws(() => state.validarAlerta(alerta(change)));
});
test("paginacao exige contagem, filtros e identidades coerentes", () => {
  assert.doesNotThrow(() => state.validarPagina(page(), filtros()));
  assert.doesNotThrow(() => state.validarPagina(page(filtros({ pagina: 2 }), [], 1), filtros({ pagina: 2 })));
  for (const value of [{ ...page(), totalItens: 9 }, { ...page(), pagina: 2 }, { ...page(), totalPaginas: 3 },
    page(filtros(), [alerta(), alerta()])]) assert.throws(() => state.validarPagina(value, filtros()));
  assert.throws(() => state.validarPagina(page(filtros({ origem: "Hardware" })), filtros({ origem: "Hardware" })));
});
test("resumo valida contagens, origem e situacao do avaliador", () => {
  assert.doesNotThrow(() => state.validarResumo(resumo(), "Simulacao"));
  for (const change of [{ abertos: -1 }, { criticos: 2 }, { origem: "Hardware" }, { avaliador: {} }, { recentes: [alerta({ origem: "Hardware" })] }])
    assert.throws(() => state.validarResumo(resumo(change), "Simulacao"));
});

const strip = text => text.replace(/^import[^\n]+\n/gm, "").replace(/^export /gm, "");
const renderSource = strip(await readFile(new URL("../src/Iceplay.Api/wwwroot/alertas-render.mjs", import.meta.url), "utf8"));
const listSource = strip(await readFile(new URL("../src/Iceplay.Api/wwwroot/alertas.js", import.meta.url), "utf8"));
const summarySource = strip(await readFile(new URL("../src/Iceplay.Api/wwwroot/alertas-resumo.js", import.meta.url), "utf8"));
async function fixture(summary = false) {
  class Node {
    constructor(tag = "div") { this.tag = tag; this.children = []; this.handlers = {}; this.attributes = {}; this.dataset = {}; this.value = ""; this._text = ""; this.disabled = false; }
    get textContent() { return this._text + this.children.map(c => typeof c === "string" ? c : c.textContent).join(" "); }
    set textContent(v) { this._text = String(v); this.children = []; }
    set innerHTML(value) { throw new Error("HTML dinamico nao permitido no teste"); }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = [...nodes]; this._text = ""; }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    addEventListener(k, fn) { this.handlers[k] = fn; }
  }
  const nodes = new Map(), events = {}, requests = [], intervals = [];
  const node = id => { if (!nodes.has(id)) nodes.set(id, new Node()); return nodes.get(id); };
  node("monitoramento-origem").value = "Simulacao";
  node("alertas-tamanho").value = "20";
  let mode = "ok", release = null, summaryValue = resumo();
  const flush = async () => { for (let i = 0; i < 5; i++) await setImmediate(); };
  const window = { setTimeout, clearTimeout, location: { search: "" }, history: { replaceState(...args) { window.url = args[2]; } },
    setInterval(fn) { intervals.push(fn); }, addEventListener(k, fn) { events[k] = fn; },
    async iceplayFetch(path, options = {}) {
      requests.push({ path, options });
      if (mode === "network") throw new TypeError("Rede indisponivel na fixture");
      if (mode === "401" || mode === "503") return new Response(null, { status: Number(mode) });
      if (path === "/api/geladeiras") return Response.json([{ id: 1, nome: "FIXTURE" }]);
      if (path.startsWith("/api/alertas/resumo")) return Response.json(summaryValue);
      const f = state.filtrosDaUrl(new URL(path, "http://localhost").search);
      const all = Array.from({ length: 24 }, (_, i) => alerta({ id: 24 - i, origem: f.origem ?? "Simulacao" }));
      const data = page(f, all.slice((f.pagina - 1) * f.tamanhoPagina, f.pagina * f.tamanhoPagina), all.length);
      if (mode === "delay") return new Promise(resolve => { release = () => resolve(Response.json(data)); });
      return Response.json(mode === "invalid" ? {} : data);
    } };
  const context = vm.createContext({ ...state, utcParaLocal, window, document: { hidden: false, getElementById: node, createElement: tag => new Node(tag) },
    AbortController, URLSearchParams, Date, Error, TypeError, Set, Object, Number });
  vm.runInContext(renderSource, context);
  vm.runInContext(summary ? summarySource : listSource, context);
  await flush();
  return { node: id => node(summary ? id : `alertas-${id}`), events, requests, intervals, window, flush,
    mode(v) { mode = v; }, summary(v) { summaryValue = v; }, release: () => release?.(),
    submit: () => node("alertas-form").handlers.submit({ preventDefault() {} }),
    change: () => node("alertas-form").handlers.change() };
}
test("cliente real consulta API, renderiza texto seguro e mantem pagina na URL", async () => {
  const f = await fixture();
  assert.equal(f.node("lista").children.length, 20);
  assert.match(f.node("lista").textContent, /<img onerror=erro>/);
  assert.match(f.window.url, /pagina=1/);
  assert.equal(f.node("anterior").disabled, true);
  assert.equal(f.node("proxima").disabled, false);
});
test("cliente pagina ocorrencias e consulta conserva filtros aplicados", async () => {
  const f = await fixture();
  f.node("proxima").handlers.click(); await f.flush();
  assert.equal(f.node("lista").children.length, 4);
  assert.match(f.node("pagina").textContent, /Página 2 de 2/);
  f.node("anterior").handlers.click(); await f.flush();
  assert.equal(f.node("lista").children.length, 20);
});
test("alterar filtros cancela resultados anteriores ate nova busca", async () => {
  const f = await fixture();
  f.node("origem").value = "Hardware"; f.change();
  assert.match(f.node("lista").textContent, /Filtros alterados/);
  f.submit(); await f.flush();
  assert.match(f.node("lista").textContent, /HARDWARE DECLARADO/);
  assert.match(f.window.url, /origem=Hardware/);
});
for (const mode of ["401", "503", "network", "invalid"]) test(`falha ${mode} limpa dados sem anunciar zero confirmado`, async () => {
  const f = await fixture(); f.mode(mode); f.submit(); await f.flush();
  assert.equal(f.node("status").dataset.state, "error");
  assert.match(f.node("lista").textContent, /indisponíveis/);
  assert.equal(f.node("resumo").textContent, "");
});
test("resposta antiga nao reaparece depois de trocar origem", async () => {
  const f = await fixture(); f.mode("delay"); f.submit(); await f.flush();
  f.node("origem").value = "Hardware"; f.change(); f.mode("ok"); f.submit(); await f.flush();
  f.release(); await f.flush();
  assert.match(f.node("lista").textContent, /HARDWARE DECLARADO/);
  assert.doesNotMatch(f.node("lista").textContent, /SIMULAÇÃO/);
});
test("resumo real exibe contagem e distingue zero sem monitoramento ativo", async () => {
  const f = await fixture(true);
  assert.equal(f.node("resumo-alertas").textContent, "1");
  f.summary(resumo({ abertos: 0, criticos: 0, equipamentosMonitorados: 0, equipamentosSemMonitoramentoNestaOrigem: 1, recentes: [] }));
  f.intervals[0](); await f.flush();
  assert.equal(f.node("resumo-alertas").textContent, "0");
  assert.match(f.node("alertas-visao-status").textContent, /0 equipamento\(s\) monitorado\(s\); 1 sem monitoramento/);
});
test("avaliador sem confirmacao recente nao apresenta zero como situacao normal", async () => {
  const f = await fixture(true);
  f.summary(resumo({ abertos: 0, criticos: 0, avaliador: { ultimoSucessoEmUtc: null, saudavel: false } }));
  f.intervals[0](); await f.flush();
  assert.equal(f.node("resumo-alertas").textContent, "—");
  assert.match(f.node("alertas-visao-status").textContent, /sem confirmação recente/);
  f.mode("503"); f.intervals[0](); await f.flush();
  assert.equal(f.node("alertas-visao-lista").children.length, 0);
});
