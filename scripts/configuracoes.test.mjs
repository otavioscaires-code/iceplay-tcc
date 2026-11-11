import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";
import vm from "node:vm";
import { validarParametros, parametrosDoFormulario, validarRespostaConfiguracao } from "../src/Iceplay.Api/wwwroot/configuracoes-estado.mjs";

const parametros = (change = {}) => ({ temperaturaMinimaC: 0, temperaturaMaximaC: 5, toleranciaPortaAbertaSegundos: 30,
  ausenciaLeiturasSegundos: 120, origemMonitorada: "Simulacao", monitoramentoAtivo: false, ...change });
const configuracao = (change = {}) => ({ ...parametros(), inicioMonitoramentoEmUtc: null, atualizadoEmUtc: "2026-11-09T20:00:00.1234567Z", ...change });
const resposta = (value = configuracao(), id = 1) => ({ geladeiraId: id, configuracao: value });

test("parâmetros aceitam zero, temperaturas negativas, limites finitos e habilitação false", () => {
  assert.equal(validarParametros(parametros()).temperaturaMinimaC, 0);
  assert.doesNotThrow(() => validarParametros(parametros({ temperaturaMinimaC: -Number.MAX_VALUE, temperaturaMaximaC: Number.MAX_VALUE })));
  assert.doesNotThrow(() => validarParametros(parametros({ toleranciaPortaAbertaSegundos: 1, ausenciaLeiturasSegundos: 2147483647 })));
});
test("validação rejeita faixa invertida/igual, não finitos, tipos errados e campos ausentes", () => {
  for (const change of [{ temperaturaMinimaC: 5 }, { temperaturaMinimaC: 6 }, { temperaturaMinimaC: "0" },
    { temperaturaMaximaC: null }, { temperaturaMinimaC: NaN }, { temperaturaMaximaC: Infinity }, { temperaturaMinimaC: undefined }])
    assert.throws(() => validarParametros(parametros(change)));
});
test("tempos exigem inteiros positivos representáveis e origem/booleano são explícitos", () => {
  for (const field of ["toleranciaPortaAbertaSegundos", "ausenciaLeiturasSegundos"])
    for (const value of [0, -1, 1.5, 2147483648, "30", null, undefined, Infinity]) assert.throws(() => validarParametros(parametros({ [field]: value })));
  for (const change of [{ origemMonitorada: "" }, { origemMonitorada: "hardware" }, { origemMonitorada: 0 },
    { monitoramentoAtivo: "false" }, { monitoramentoAtivo: null }, { monitoramentoAtivo: undefined }]) assert.throws(() => validarParametros(parametros(change)));
});
test("formulário vazio não vira zero e a escolha de origem não é presumida", () => {
  const fields = { minima: "0", maxima: "5", porta: "30", ausencia: "120", origem: "Simulacao", ativo: false };
  assert.deepEqual(parametrosDoFormulario(fields), parametros());
  for (const field of ["minima", "maxima", "porta", "ausencia"]) for (const value of ["", "  "])
    assert.throws(() => parametrosDoFormulario({ ...fields, [field]: value }));
  assert.throws(() => parametrosDoFormulario({ ...fields, origem: "" }));
});
test("resposta distingue configuração ausente e valida identidade e horários UTC", () => {
  assert.equal(validarRespostaConfiguracao(resposta(null), 1).configuracao, null);
  assert.equal(validarRespostaConfiguracao(resposta(), 1).configuracao.monitoramentoAtivo, false);
  assert.doesNotThrow(() => validarRespostaConfiguracao(resposta(configuracao({ monitoramentoAtivo: true,
    inicioMonitoramentoEmUtc: "2026-11-09T20:00:00.1234566Z" })), 1));
  for (const value of [{}, resposta(undefined, 2), { geladeiraId: 1 }, resposta(configuracao({ atualizadoEmUtc: "2026-02-30T20:00:00Z" })),
    resposta(configuracao({ inicioMonitoramentoEmUtc: "2026-11-09T19:00:00Z" })),
    resposta(configuracao({ monitoramentoAtivo: true, inicioMonitoramentoEmUtc: null })),
    resposta(configuracao({ monitoramentoAtivo: true, inicioMonitoramentoEmUtc: "2026-11-09T20:00:00.1234568Z" }))])
    assert.throws(() => validarRespostaConfiguracao(value, 1));
});

const clientSource = (await readFile(new URL("../src/Iceplay.Api/wwwroot/configuracoes.js", import.meta.url), "utf8")).replace(/^import[^\n]+\n/, "");

// Cliente real com DOM e respostas controlados. Não é execução de navegador ou SQLite.
async function interfaceFixture({ empty = false, stored = new Map(), delayedId = null, denyList = false, invalidList = false } = {}) {
  class Node {
    constructor(tag = "div") { this.tag = tag; this.children = []; this.handlers = {}; this.dataset = {}; this.attributes = {}; this.disabled = true; this.value = ""; this.checked = false; this._text = ""; }
    get textContent() { return this._text + this.children.map(child => typeof child === "string" ? child : child.textContent).join(""); }
    set textContent(value) { this._text = String(value); this.children = []; }
    append(child) { this.children.push(child); if (this.tag === "select" && !this.value) this.value = child.value; }
    replaceChildren() { this.children = []; this.value = ""; this._text = ""; }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    removeAttribute(key) { delete this.attributes[key]; }
    addEventListener(name, handler) { this.handlers[name] = handler; }
  }
  const nodes = new Map();
  for (const id of ["form", "geladeira", "recarregar", "campos", "minima", "maxima", "porta", "ausencia", "origem", "ativo", "salvar", "status", "resumo", "inicio", "atualizacao"])
    nodes.set(`configuracao-${id}`, new Node(["geladeira", "origem"].includes(id) ? "select" : "div"));
  const node = id => nodes.get(`configuracao-${id}`);
  const events = {}, requests = [];
  let getStatus = 200, putMode = "ok", release = null;
  const flush = async () => { for (let i = 0; i < 5; i++) await setImmediate(); };
  const window = { setTimeout, clearTimeout, addEventListener(name, handler) { events[name] = handler; },
    async iceplayFetch(path, options = {}) {
      requests.push({ path, method: options.method ?? "GET", body: options.body, signal: options.signal, headers: options.headers });
      if (path === "/api/geladeiras") {
        if (denyList) return new Response(null, { status: 401 });
        return Response.json(empty ? [] : invalidList ? [{ id: 1, nome: "" }] : [{ id: 1, nome: "FIXTURE CONFIG A" }, { id: 2, nome: "FIXTURE CONFIG B" }]);
      }
      const id = Number(path.match(/\/geladeiras\/(\d+)\/configuracao$/)?.[1]);
      if (options.method === "PUT") {
        if (putMode === "400") return new Response(null, { status: 400 });
        if (putMode === "401") return new Response(null, { status: 401 });
        if (putMode === "503") return new Response(null, { status: 503 });
        const existed = stored.has(id);
        stored.set(id, configuracao(JSON.parse(options.body)));
        if (putMode === "network") throw new TypeError("Resposta de gravação perdida na fixture");
        if (putMode === "invalid") return Response.json(resposta(null, id));
        return Response.json(resposta(stored.get(id), id), { status: existed ? 200 : 201 });
      }
      if (getStatus !== 200) return new Response(null, { status: getStatus });
      const response = () => Response.json(resposta(stored.get(id) ?? null, id));
      if (id === delayedId) return new Promise(resolve => { release = () => resolve(response()); });
      return response();
    } };
  vm.runInNewContext(clientSource, { window, document: { getElementById(id) { return nodes.get(id); }, createElement(tag) { return new Node(tag); } },
    AbortController, TypeError, parametrosDoFormulario, validarRespostaConfiguracao });
  await flush();
  function preencher(change = {}) {
    const fields = { minima: "0", maxima: "5", porta: "30", ausencia: "120", origem: "Simulacao", ativo: false, ...change };
    for (const [field, value] of Object.entries(fields)) if (field === "ativo") node(field).checked = value; else node(field).value = value;
  }
  return { node, requests, events, stored, flush, preencher,
    status(value) { getStatus = value; }, mode(value) { putMode = value; }, release() { release(); },
    async salvar() { await node("form").handlers.submit({ preventDefault() {} }); await flush(); },
    async recarregar() { node("recarregar").handlers.click(); await flush(); },
    async selecionar(id) { node("geladeira").value = String(id); node("geladeira").handlers.change(); await flush(); } };
}

test("sem geladeiras não há configuração nem envio automático", async () => {
  const f = await interfaceFixture({ empty: true });
  assert.equal(f.requests.length, 1); assert.equal(f.node("salvar").disabled, true);
  assert.match(f.node("status").textContent, /Não há geladeiras/);
});
test("configuração inexistente abre campos vazios, sem defaults ou PUT", async () => {
  const f = await interfaceFixture();
  assert.equal(f.requests.length, 2); assert.equal(f.node("salvar").disabled, false);
  for (const field of ["minima", "maxima", "porta", "ausencia", "origem"]) assert.equal(f.node(field).value, "");
  assert.equal(f.node("ativo").checked, false); assert.match(f.node("resumo").textContent, /ainda não possui/);
  await f.salvar(); assert.equal(f.requests.length, 2); assert.match(f.node("status").textContent, /Preencha/);
});
test("salvar cria pela mesma API e apresenta somente confirmação do servidor", async () => {
  const f = await interfaceFixture(); f.preencher(); await f.salvar();
  const request = f.requests.at(-1);
  assert.equal(request.method, "PUT"); assert.equal(request.path, "/api/geladeiras/1/configuracao");
  assert.deepEqual(JSON.parse(request.body), parametros());
  assert.equal(request.headers["Content-Type"], "application/json");
  assert.equal(f.node("minima").value, "0"); assert.match(f.node("status").textContent, /salva no banco.*não gera alertas/);
  assert.equal(f.node("salvar").disabled, false); assert.equal(f.node("atualizacao").dateTime, configuracao().atualizadoEmUtc);
});
test("salvar novamente envia atualização sem trocar equipamento ou inventar horários", async () => {
  const f = await interfaceFixture({ stored: new Map([[1, configuracao()]]) });
  assert.equal(f.node("maxima").value, "5"); f.preencher({ maxima: "8" }); await f.salvar();
  assert.equal(f.requests.filter(x => x.method === "PUT").length, 1);
  assert.equal(f.node("maxima").value, "8"); assert.match(f.node("resumo").textContent, /geladeira #1/);
});
test("envios simultâneos geram um único PUT e mantêm controles bloqueados durante a gravação", async () => {
  const f = await interfaceFixture(); f.preencher();
  const first = f.salvar();
  assert.equal(f.node("salvar").disabled, true); assert.equal(f.node("geladeira").disabled, true);
  await Promise.all([first, f.salvar()]);
  assert.equal(f.requests.filter(x => x.method === "PUT").length, 1);
  assert.equal(f.node("salvar").disabled, false);
});
test("habilitação planejada apresenta os instantes confirmados sem anunciar alertas ativos", async () => {
  const inicio = "2026-11-09T19:59:00.1234567Z";
  const f = await interfaceFixture({ stored: new Map([[1, configuracao({ monitoramentoAtivo: true, inicioMonitoramentoEmUtc: inicio })]]) });
  assert.equal(f.node("ativo").checked, true); assert.equal(f.node("inicio").dateTime, inicio);
  assert.match(f.node("inicio").title, /UTC: 2026-11-09T19:59:00.1234567Z/);
  assert.match(f.node("resumo").textContent, /Habilitação planejada: ativa.*alertas ainda não está implementada/);
});
test("selecionar geladeira sem configuração limpa todos os parâmetros do equipamento anterior", async () => {
  const f = await interfaceFixture({ stored: new Map([[1, configuracao()]]) });
  assert.equal(f.node("maxima").value, "5"); await f.selecionar(2);
  for (const field of ["minima", "maxima", "porta", "ausencia", "origem"]) assert.equal(f.node(field).value, "");
  assert.match(f.node("resumo").textContent, /geladeira #2 ainda não possui/);
  assert.equal(f.node("salvar").disabled, false); assert.equal(f.requests.filter(x => x.method === "PUT").length, 0);
});
test("nova página relê parâmetros devolvidos pela API, sem valores apenas locais", async () => {
  const stored = new Map(); const first = await interfaceFixture({ stored }); first.preencher({ maxima: "7" }); await first.salvar();
  const next = await interfaceFixture({ stored });
  assert.equal(next.node("maxima").value, "7"); assert.equal(next.requests.filter(x => x.method === "PUT").length, 0);
  assert.match(next.node("resumo").textContent, /Configuração salva/);
});
test("lista inválida ou acesso negado mantém edição bloqueada e informa o problema", async () => {
  for (const options of [{ denyList: true }, { invalidList: true }]) {
    const f = await interfaceFixture(options);
    assert.equal(f.node("salvar").disabled, true); assert.equal(f.node("minima").value, "");
    assert.match(f.node("status").textContent, options.denyList ? /página Acesso/ : /lista.*inválida/);
    assert.equal(f.requests.length, 1);
  }
});
test("401 e 404 da consulta limpam valores anteriores e exigem nova consulta", async () => {
  for (const status of [401, 404]) {
    const f = await interfaceFixture({ stored: new Map([[1, configuracao()]]) }); f.status(status); await f.recarregar();
    assert.equal(f.node("minima").value, ""); assert.equal(f.node("salvar").disabled, true);
    assert.match(f.node("status").textContent, status === 401 ? /página Acesso/ : /não existe/);
  }
});
test("resposta atrasada de outra geladeira não restaura parâmetros antigos", async () => {
  const f = await interfaceFixture({ delayedId: 1, stored: new Map([[1, configuracao()], [2, configuracao({ temperaturaMaximaC: 9 })]]) });
  assert.equal(f.node("salvar").disabled, true); await f.selecionar(2);
  assert.equal(f.node("maxima").value, "9"); f.release(); await f.flush();
  assert.equal(f.node("maxima").value, "9"); assert.match(f.node("resumo").textContent, /geladeira #2/);
});
test("faixa inválida é recusada antes de chamar PUT", async () => {
  const f = await interfaceFixture(); f.preencher({ minima: "5", maxima: "5" }); await f.salvar();
  assert.equal(f.requests.filter(x => x.method === "PUT").length, 0); assert.match(f.node("status").textContent, /menor/);
});
test("400 preserva edição e informa validação sem alegar gravação", async () => {
  const f = await interfaceFixture(); f.mode("400"); f.preencher(); await f.salvar();
  assert.equal(f.node("maxima").value, "5"); assert.equal(f.node("salvar").disabled, false);
  assert.match(f.node("status").textContent, /recusou/); assert.match(f.node("resumo").textContent, /ainda não possui/);
});
test("gravação com resposta perdida não é repetida e só libera após recarregar", async () => {
  const f = await interfaceFixture(); f.mode("network"); f.preencher(); await f.salvar();
  assert.equal(f.node("salvar").disabled, true); assert.equal(f.node("minima").value, "");
  assert.match(f.node("status").textContent, /não foi confirmado.*recarregue/);
  await f.salvar(); assert.equal(f.requests.filter(x => x.method === "PUT").length, 1);
  f.mode("ok"); await f.recarregar(); assert.equal(f.node("salvar").disabled, false); assert.equal(f.node("minima").value, "0");
  assert.equal(f.requests.filter(x => x.method === "PUT").length, 1);
});
test("503, 401 e resposta de sucesso incompatível não são apresentados como gravação confirmada", async () => {
  for (const mode of ["503", "401", "invalid"]) {
    const f = await interfaceFixture(); f.mode(mode); f.preencher(); await f.salvar();
    assert.equal(f.node("salvar").disabled, true); assert.equal(f.node("minima").value, "");
    assert.match(f.node("status").textContent, mode === "401" ? /página Acesso/ : /não foi confirmado/);
  }
});
test("mudança de acesso relê estado e não conserva edição de outra sessão", async () => {
  const f = await interfaceFixture({ stored: new Map([[1, configuracao()]]) }); f.preencher({ maxima: "99" });
  f.events["iceplay:acesso-changed"](); await f.flush();
  assert.equal(f.node("maxima").value, "5"); assert.equal(f.requests.filter(x => x.method === "PUT").length, 0);
});
test("HTML inicia bloqueado sem JavaScript, tem unidades explícitas e não anuncia alertas funcionando", async () => {
  const html = await readFile(new URL("../src/Iceplay.Api/wwwroot/configuracoes.html", import.meta.url), "utf8");
  assert.match(html, /id="configuracao-form" method="post"/);
  assert.match(html, /<fieldset id="configuracao-campos" disabled>/);
  assert.match(html, /id="configuracao-salvar"[^>]*disabled/);
  assert.match(html, /type="number" step="1" min="1" max="2147483647" inputmode="numeric"/);
  assert.match(html, /geração de alertas ainda não está implementada/);
  assert.match(html, /referência visual de 60 segundos/);
});
