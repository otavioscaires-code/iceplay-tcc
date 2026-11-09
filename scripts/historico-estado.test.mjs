import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";
import vm from "node:vm";
import { instanteUtcValido, validarFiltros, filtrosDoFormulario, criarConsulta, validarHistorico, calcularSerie, dataLocalParaUtc, utcParaLocal } from "../src/Iceplay.Api/wwwroot/historico-estado.mjs";

const filtros = () => ({ geladeiraId: 1, origem: "Simulacao", inicioUtc: null, fimUtc: null, pagina: 1, tamanhoPagina: 20 });
const leitura = (id = 1, overrides = {}) => ({ id, geladeiraId: 1, temperaturaC: 0, portaAberta: false,
  medidoEmUtc: "2026-10-01T12:00:00.1234567Z", recebidoEmUtc: "2026-10-01T12:01:00Z", origem: "Simulacao", ...overrides });
const resposta = (itens = [leitura()], overrides = {}) => ({ ...filtros(), totalItens: itens.length, totalPaginas: itens.length ? 1 : 0, itens, ...overrides });

test("UTC exige Z e datas existentes, preservando até sete casas", () => {
  for (const fraction of ["", ".1", ".12", ".123", ".1234", ".12345", ".123456", ".1234567"]) assert.equal(instanteUtcValido(`2026-10-01T12:00:00${fraction}Z`), true);
  for (const value of ["2026-02-30T12:00:00Z", "0000-01-01T00:00:00Z", "2026-10-01T12:00:00", "2026-10-01T12:00:00+00:00", "2026-10-01T12:00:00.12345678Z", null]) assert.equal(instanteUtcValido(value), false);
});
test("formulário local converte instantes reais para UTC e opcionais ausentes para null", () => {
  const value = filtrosDoFormulario({ geladeiraId: "1", origem: "Simulacao", inicio: "2026-10-01T09:00:00", fim: "", tamanhoPagina: "50" });
  assert.equal(value.inicioUtc, new Date("2026-10-01T09:00:00").toISOString());
  assert.equal(value.fimUtc, null);
  assert.equal(value.pagina, 1);
  assert.equal(dataLocalParaUtc(utcParaLocal(value.inicioUtc)), value.inicioUtc);
  assert.throws(() => dataLocalParaUtc("2026-02-30T09:00:00"));
});
test("filtros rejeitam IDs/origens/paginação e intervalo invertido, inclusive em sete casas", () => {
  for (const change of [{ geladeiraId: 0 }, { geladeiraId: 1.5 }, { origem: "hardware" }, { pagina: 0 }, { tamanhoPagina: 101 },
    { pagina: 2147483647, tamanhoPagina: 100 }, { inicioUtc: "" }, { inicioUtc: "2026-10-01T12:00:00.0000002Z", fimUtc: "2026-10-01T12:00:00.0000001Z" }]) assert.throws(() => validarFiltros({ ...filtros(), ...change }));
  assert.doesNotThrow(() => validarFiltros({ ...filtros(), pagina: 2147483647, tamanhoPagina: 1 }));
});
test("query inclui identidade/origem/página, omitindo datas opcionais", () => {
  const query = criarConsulta(filtros());
  assert.equal(query.get("geladeiraId"), "1"); assert.equal(query.get("origem"), "Simulacao");
  assert.equal(query.has("inicioUtc"), false);
  assert.equal(query.get("tamanhoPagina"), "20");
});
test("DTO vazio e zero/false são dados válidos", () => {
  assert.equal(validarHistorico(resposta([]), filtros()).itens.length, 0);
  const value = validarHistorico(resposta(), filtros()).itens[0];
  assert.equal(value.temperaturaC, 0); assert.equal(value.portaAberta, false);
});
test("DTO não aceita mistura de equipamentos/origens, números em texto ou timestamp impossível", () => {
  for (const change of [{ geladeiraId: 2 }, { origem: "Hardware" }, { temperaturaC: "0" }, { temperaturaC: Infinity }, { portaAberta: "false" },
    { recebidoEmUtc: "2026-10-01T11:00:00Z" }, { medidoEmUtc: "2026-02-30T12:00:00Z" }]) assert.throws(() => validarHistorico(resposta([leitura(1, change)]), filtros()));
  assert.throws(() => validarHistorico(resposta([leitura(1), leitura(1)]), filtros()));
});
test("DTO valida paginação, contagens e filtros efetivamente utilizados", () => {
  for (const change of [{ pagina: 2 }, { tamanhoPagina: 50 }, { totalItens: -1 }, { totalItens: 2 }, { totalPaginas: 8 }, { origem: "Hardware" }, { inicioUtc: "2026-10-01T00:00:00Z" }]) assert.throws(() => validarHistorico(resposta([leitura()], change), filtros()));
  const page = { ...filtros(), pagina: 3, tamanhoPagina: 1 };
  assert.doesNotThrow(() => validarHistorico({ ...page, totalItens: 2, totalPaginas: 2, itens: [] }, page));
});
test("DTO confirma ordem temporal/ID e inclusividade sem perder submilissegundos", () => {
  const items = [leitura(3, { medidoEmUtc: "2026-10-01T12:00:00.1234568Z" }), leitura(2), leitura(1)];
  assert.doesNotThrow(() => validarHistorico(resposta(items), filtros()));
  assert.throws(() => validarHistorico(resposta([...items].reverse()), filtros()));
  const ranged = { ...filtros(), inicioUtc: items[1].medidoEmUtc, fimUtc: items[1].medidoEmUtc };
  assert.doesNotThrow(() => validarHistorico({ ...resposta(items.slice(1)), ...ranged }, ranged));
  assert.throws(() => validarHistorico({ ...resposta(items), ...ranged }, ranged));
});
test("gráfico vazio, um ponto e temperatura constante não inventam escala temporal", () => {
  assert.deepEqual(calcularSerie([]), { pontos: [], minimo: null, maximo: null, escalaMinima: null, escalaMaxima: null });
  const point = calcularSerie([leitura()]).pontos[0];
  assert.equal(point.x, 380); assert.equal(point.y, 130);
  const tied = calcularSerie([leitura(2), leitura(1)]).pontos;
  assert.equal(tied[0].id, 1); assert.equal(tied[0].x, tied[1].x);
  assert.equal(tied[0].y, tied[1].y);
});
test("escala constante acrescenta margem visual sem alterar extremos medidos nem timestamps", () => {
  const item = leitura(1, { temperaturaC: 4.25 });
  const serie = calcularSerie([item]);
  assert.equal(serie.minimo, 4.25); assert.equal(serie.maximo, 4.25);
  assert.equal(serie.escalaMinima, 3.75); assert.equal(serie.escalaMaxima, 4.75);
  assert.equal(serie.pontos[0].temperaturaC, item.temperaturaC);
  assert.equal(serie.pontos[0].medidoEmUtc, item.medidoEmUtc);
  assert.equal(serie.pontos[0].origem, "Simulacao");
  assert.ok(Math.abs(serie.pontos[0].y - 130) < 1e-10);
  const large = calcularSerie([leitura(1, { temperaturaC: 100 })]);
  assert.equal(large.escalaMinima, 95); assert.equal(large.escalaMaxima, 105);
});

test("coordenadas usam toda a largura disponível no celular e desktop", () => {
  for (const largura of [240, 375, 760, 960]) {
    const serie = calcularSerie([leitura(1), leitura(2, { temperaturaC: 10, medidoEmUtc: "2026-10-01T13:00:00Z" })], largura);
    assert.equal(serie.pontos[0].x, 80);
    assert.equal(serie.pontos[1].x, largura - 24);
    assert.equal(serie.pontos[0].y, 230); assert.equal(serie.pontos[1].y, 30);
  }
  for (const dimensao of [NaN, Infinity, -Infinity, "375"]) {
    assert.throws(() => calcularSerie([leitura()], dimensao));
    assert.throws(() => calcularSerie([leitura()], 760, dimensao));
  }
});

test("gráfico ordena somente os pontos fornecidos e mantém coordenadas finitas em extremos", () => {
  const serie = calcularSerie([leitura(3, { medidoEmUtc: "2026-10-01T13:00:00Z", temperaturaC: Number.MAX_VALUE }),
    leitura(1, { temperaturaC: -Number.MAX_VALUE })]);
  assert.deepEqual(serie.pontos.map(point => point.id), [1, 3]);
  for (const point of serie.pontos) assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
  assert.equal(serie.pontos.length, 2);
  assert.throws(() => calcularSerie([leitura(1, { temperaturaC: NaN })]));
  for (const temperaturaC of [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE, -Number.MIN_VALUE, 0]) {
    const constant = calcularSerie([leitura(1, { temperaturaC }), leitura(2, { temperaturaC })], 240);
    assert.ok(Number.isFinite(constant.escalaMinima) && Number.isFinite(constant.escalaMaxima));
    assert.ok(constant.escalaMinima < constant.escalaMaxima);
    for (const point of constant.pontos) {
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
      assert.ok(point.x >= 80 && point.x <= 216 && point.y >= 30 && point.y <= 230);
      assert.equal(point.temperaturaC, temperaturaC);
    }
  }
  const subnormal = calcularSerie([leitura(1, { temperaturaC: 0 }), leitura(2, { temperaturaC: Number.MIN_VALUE })]);
  for (const point of subnormal.pontos) assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
});

// Exercita o cliente real com DOM/fetch controlados; não equivale a um navegador.
const clientSource = (await readFile(new URL("../src/Iceplay.Api/wwwroot/historico.js", import.meta.url), "utf8")).replace(/^import[^\n]+\n/, "");
async function interfaceFixture({ empty = false, search = "", delayHistory = false, delayEquipment = false, denyEquipment = false, chartWidth = 760, constantTemperature = null } = {}) {
  class Node {
    constructor(tag = "div") { this.tag = tag; this.children = []; this.handlers = {}; this.dataset = {}; this.attributes = {}; this.disabled = false; this.value = ""; this._text = ""; }
    get textContent() { return this._text + this.children.map(child => typeof child === "string" ? child : child.textContent).join(""); }
    set textContent(value) { this._text = String(value); this.children = []; }
    append(...children) { this.children.push(...children); if (this.tag === "select" && !this.value && children[0]?.tag === "option") this.value = children[0].value; }
    replaceChildren(...children) { this._text = ""; this.children = []; if (this.tag === "select") this.value = ""; this.append(...children); }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    addEventListener(name, handler) { this.handlers[name] = handler; }
  }
  const nodes = new Map();
  for (const id of ["form", "geladeira", "origem", "inicio", "fim", "tamanho", "buscar", "status", "resumo", "tabela", "grafico", "anterior", "proxima", "pagina", "listagem"])
    nodes.set(`historico-${id}`, new Node(["geladeira", "origem", "tamanho"].includes(id) ? "select" : "div"));
  const node = id => nodes.get(`historico-${id}`);
  node("origem").value = "Simulacao"; node("tamanho").value = "20";
  node("grafico").clientWidth = chartWidth;
  const requests = [], navigations = [], events = {};
  let release = null, releaseEquipment = null, mode = "ok";
  function responseFor(path) {
    const query = new URLSearchParams(path.split("?")[1]);
    const page = Number(query.get("pagina")), size = Number(query.get("tamanhoPagina"));
    const items = Array.from({ length: Math.max(0, Math.min(size, 21 - (page - 1) * size)) }, (_, i) => {
      const id = 21 - (page - 1) * size - i;
      return leitura(id, { temperaturaC: constantTemperature ?? (id === 21 ? 0 : id), portaAberta: false, origem: query.get("origem"), medidoEmUtc: `2026-10-01T12:00:${String(id).padStart(2, "0")}Z` });
    });
    return Response.json({ geladeiraId: Number(query.get("geladeiraId")), origem: query.get("origem"), pagina: page, tamanhoPagina: size,
      inicioUtc: query.get("inicioUtc"), fimUtc: query.get("fimUtc"), totalItens: 21, totalPaginas: Math.ceil(21 / size), itens: items });
  }
  const window = { location: { search }, history: { replaceState(_state, _title, path) { navigations.push(path); window.location.search = path.includes("?") ? path.slice(path.indexOf("?")) : ""; } }, setTimeout, clearTimeout,
    addEventListener(name, handler) { events[name] = handler; },
    async iceplayFetch(path) {
      requests.push(path);
      if (path === "/api/geladeiras") {
        if (denyEquipment) return new Response(null, { status: 401 });
        const response = () => Response.json(empty ? [] : [{ id: 1, nome: "FIXTURE DE SOFTWARE" }]);
        return delayEquipment ? new Promise(resolve => { releaseEquipment = () => resolve(response()); }) : response();
      }
      if (mode === "401") return new Response(null, { status: 401 });
      if (delayHistory) return new Promise(resolve => { release = () => resolve(responseFor(path)); });
      return responseFor(path);
    }
  };
  vm.runInNewContext(clientSource, { document: { getElementById(id) { return nodes.get(id); }, createElement(tag) { return new Node(tag); }, createElementNS(_ns, tag) { return new Node(tag); } },
    window, URLSearchParams, AbortController, TypeError, filtrosDoFormulario, validarFiltros, criarConsulta, validarHistorico, calcularSerie, utcParaLocal });
  const flush = async () => { for (let i = 0; i < 4; i++) await setImmediate(); };
  await flush();
  return { node, requests, navigations, flush, events, release() { release(); }, releaseEquipment() { releaseEquipment(); }, deny() { mode = "401"; } };
}

test("cliente com banco sem geladeiras mostra vazio sem consultar leituras", async () => {
  const fixture = await interfaceFixture({ empty: true });
  assert.equal(fixture.requests.length, 1);
  assert.match(fixture.node("status").textContent, /Não há geladeiras/);
  assert.match(fixture.node("tabela").textContent, /Cadastre uma geladeira/);
  assert.equal(fixture.node("buscar").disabled, true);
});
test("cliente consulta o contrato e renderiza tabela/gráfico da página", async () => {
  const fixture = await interfaceFixture();
  assert.equal(fixture.node("tabela").children.length, 20);
  assert.match(fixture.node("tabela").children[0].textContent, /0 °CFechada/);
  assert.equal(fixture.node("grafico").children[0].attributes.role, "img");
  assert.match(fixture.node("pagina").textContent, /Página 1 de 2/);
  assert.match(fixture.navigations.at(-1), /^\/historico\?geladeiraId=1&origem=Simulacao/);
  assert.equal(fixture.node("anterior").disabled, true);
  assert.equal(fixture.node("proxima").disabled, false);
  assert.equal(fixture.node("geladeira").disabled, false);
});
test("cliente pagina mantendo filtros aplicados e representa somente a página recebida", async () => {
  const fixture = await interfaceFixture();
  fixture.node("proxima").handlers.click(); await fixture.flush();
  assert.equal(new URLSearchParams(fixture.requests.at(-1).split("?")[1]).get("pagina"), "2");
  assert.equal(fixture.node("tabela").children.length, 1);
  assert.match(fixture.node("pagina").textContent, /Página 2 de 2/);
  assert.equal(fixture.node("proxima").disabled, true);
  fixture.node("anterior").handlers.click(); await fixture.flush();
  assert.equal(fixture.node("tabela").children.length, 20);
});
test("cliente reabre URL de histórico diretamente na página e origem solicitadas", async () => {
  const fixture = await interfaceFixture({ search: "?geladeiraId=1&origem=Hardware&pagina=2&tamanhoPagina=20" });
  assert.equal(fixture.node("origem").value, "Hardware");
  assert.equal(fixture.node("tabela").children.length, 1);
  assert.match(fixture.node("resumo").textContent, /Hardware declarado/);
  assert.match(fixture.node("pagina").textContent, /Página 2 de 2/);
});
test("resposta atrasada não repõe dados após o usuário alterar os filtros", async () => {
  const fixture = await interfaceFixture({ delayHistory: true });
  fixture.node("origem").value = "Hardware";
  fixture.node("form").handlers.change();
  fixture.release(); await fixture.flush();
  assert.match(fixture.node("tabela").textContent, /Filtros alterados/);
  assert.match(fixture.node("status").textContent, /Filtros alterados/);
  assert.equal(fixture.node("proxima").disabled, true);
  assert.equal(fixture.navigations.length, 0);
});
test("401 remove os resultados anteriores e mantém instrução de acesso", async () => {
  const fixture = await interfaceFixture();
  fixture.deny(); fixture.node("form").handlers.submit({ preventDefault() {} }); await fixture.flush();
  assert.match(fixture.node("status").textContent, /página Acesso/);
  assert.match(fixture.node("tabela").textContent, /Histórico indisponível/);
  assert.equal(fixture.node("proxima").disabled, true);
  assert.equal(fixture.node("buscar").disabled, false);
});
test("período inválido no formulário não chama a API nem conserva um gráfico antigo", async () => {
  const fixture = await interfaceFixture();
  const count = fixture.requests.length;
  fixture.node("inicio").value = "2026-10-02T12:00:00"; fixture.node("fim").value = "2026-10-01T12:00:00";
  fixture.node("form").handlers.submit({ preventDefault() {} }); await fixture.flush();
  assert.equal(fixture.requests.length, count);
  assert.match(fixture.node("status").textContent, /início.*posterior/);
  assert.equal(fixture.node("grafico").children[0].tag, "p");
  assert.equal(fixture.node("proxima").disabled, true);
  assert.equal(fixture.node("anterior").disabled, true);
});
test("filtros aguardam a lista de equipamentos e eventos prematuros não cancelam a inicialização", async () => {
  const fixture = await interfaceFixture({ delayEquipment: true });
  assert.equal(fixture.node("origem").disabled, true);
  assert.equal(fixture.node("buscar").disabled, true);
  fixture.node("form").handlers.change();
  fixture.releaseEquipment(); await fixture.flush();
  assert.equal(fixture.node("origem").disabled, false);
  assert.equal(fixture.node("geladeira").disabled, false);
  assert.equal(fixture.node("tabela").children.length, 20);
});
test("falha de acesso à lista mantém equipamento e busca bloqueados sem dados fictícios", async () => {
  const fixture = await interfaceFixture({ denyEquipment: true });
  assert.equal(fixture.node("geladeira").disabled, true);
  assert.equal(fixture.node("buscar").disabled, true);
  assert.match(fixture.node("status").textContent, /página Acesso/);
  assert.equal(fixture.requests.length, 1);
});
test("mudança de acesso relê filtros e página da URL atual, não do carregamento inicial", async () => {
  const fixture = await interfaceFixture();
  fixture.node("proxima").handlers.click(); await fixture.flush();
  fixture.events["iceplay:acesso-changed"](); await fixture.flush();
  const query = new URLSearchParams(fixture.requests.at(-1).split("?")[1]);
  assert.equal(query.get("pagina"), "2");
  assert.match(fixture.node("pagina").textContent, /Página 2 de 2/);
  assert.equal(fixture.node("geladeira").disabled, false);
});

test("gráfico do cliente cabe na largura móvel e preserva dados completos acessíveis", async () => {
  const fixture = await interfaceFixture({ chartWidth: 375, constantTemperature: 4.25 });
  const svg = fixture.node("grafico").children[0];
  assert.equal(svg.attributes.viewBox, "0 0 375 280");
  assert.equal(svg.children.find(child => child.tag === "path").attributes.d, "M80 30V230H351");
  const labels = svg.children.filter(child => child.tag === "text");
  assert.equal(labels[0].textContent, "4,75 °C");
  assert.equal(labels[1].textContent, "3,75 °C");
  for (const label of labels.slice(2)) assert.match(label.textContent, /^\d{2}:\d{2}:\d{2}$/);
  const circles = svg.children.filter(child => child.tag === "circle");
  assert.equal(circles.length, 20);
  for (const circle of circles) {
    const x = Number(circle.attributes.cx), y = Number(circle.attributes.cy);
    assert.ok(x >= 80 && x <= 351 && y >= 30 && y <= 230);
    assert.match(circle.textContent, /4,25 °C;.*01\/10\/2026.*UTC: 2026-10-01T12:00:/);
  }
  assert.match(svg.children.find(child => child.tag === "desc").textContent, /escala vertical.*não define limites de alerta/);
  const measured = fixture.node("tabela").children[0].children[4].children[0];
  assert.equal(measured.dateTime, "2026-10-01T12:00:21Z");
  assert.equal(measured.title, "UTC: 2026-10-01T12:00:21Z");
  assert.match(measured.textContent, /01\/10\/2026/);
  assert.match(fixture.node("resumo").textContent, /Origem: Simulação/);
});

test("largura do gráfico usa limite mínimo, máximo e fallback sem cortar pontos", async () => {
  for (const [chartWidth, expected] of [[180, 240], [760, 760], [1280, 960], [0, 760]]) {
    const fixture = await interfaceFixture({ chartWidth });
    const svg = fixture.node("grafico").children[0];
    assert.equal(svg.attributes.viewBox, `0 0 ${expected} 280`);
    for (const circle of svg.children.filter(child => child.tag === "circle")) {
      assert.ok(Number(circle.attributes.cx) >= 80 && Number(circle.attributes.cx) <= expected - 24);
    }
    const labels = svg.children.filter(child => child.tag === "text" && child.attributes.y === "261");
    if (expected >= 560) for (const label of labels) assert.match(label.textContent, /01\/10\/2026/);
  }
});

test("redimensionar redesenha somente a página aplicada sem consultar novamente nem restaurar dados removidos", async () => {
  const fixture = await interfaceFixture({ chartWidth: 375 });
  const requests = fixture.requests.length;
  fixture.node("grafico").clientWidth = 900;
  fixture.events.resize();
  let svg = fixture.node("grafico").children[0];
  assert.equal(svg.attributes.viewBox, "0 0 900 280");
  assert.equal(svg.children.find(child => child.tag === "path").attributes.d, "M80 30V230H876");
  assert.equal(fixture.requests.length, requests);
  fixture.node("proxima").handlers.click(); await fixture.flush();
  svg = fixture.node("grafico").children[0];
  assert.equal(svg.children.filter(child => child.tag === "circle").length, 1);
  const labels = svg.children.filter(child => child.tag === "text" && child.attributes.y === "261");
  assert.equal(labels.length, 1);
  assert.equal(labels[0].attributes["text-anchor"], "middle");
  fixture.node("form").handlers.change();
  fixture.node("grafico").clientWidth = 375; fixture.events.resize();
  assert.equal(fixture.node("grafico").children[0].tag, "p");
  assert.match(fixture.node("grafico").textContent, /Filtros alterados/);
});
