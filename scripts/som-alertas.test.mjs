import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";
import vm from "node:vm";
import { criarControleSom, origensDoSom } from "../src/Iceplay.Api/wwwroot/som-estado.mjs";
import { validarResumo } from "../src/Iceplay.Api/wwwroot/alertas-estado.mjs";

test("som exige ativacao e respeita 30 segundos sem depender da quantidade de alertas", () => {
  let tempo = 0; const c = criarControleSom(() => tempo);
  assert.equal(c.deveTocar(120, true), false); c.ativar();
  assert.equal(c.deveTocar(120, true), true);
  tempo = 29999; assert.equal(c.deveTocar(121, true), false);
  tempo = 30000; assert.equal(c.deveTocar(121, true), true);
  c.silenciar(); tempo = 60000; assert.equal(c.deveTocar(1, true), false);
});
test("normalizacao e troca de origem permitem aviso de nova ocorrencia", () => {
  const c = criarControleSom(() => 0); c.ativar();
  assert.equal(c.deveTocar(1, true), true);
  assert.equal(c.deveTocar(0, true), false);
  assert.equal(c.deveTocar(1, true), true);
  c.trocarOrigem(); assert.equal(c.deveTocar(2, true), true);
});
test("pagina oculta, avaliador sem saude e resposta invalida nao autorizam som", () => {
  const c = criarControleSom(() => 0); c.ativar();
  assert.equal(c.deveTocar(1, true, false), false);
  assert.equal(c.deveTocar(1, false), false);
  for (const n of [-1, NaN, 1.2, "1"]) assert.throws(() => c.deveTocar(n, true));
  assert.throws(() => c.deveTocar(1, undefined));
  assert.equal(c.deveTocar(1, true), true);
});
test("origem Todas consulta as duas origens explicitamente sem aceitar valor desconhecido", () => {
  assert.deepEqual(origensDoSom(""), ["Hardware", "Simulacao"]);
  assert.deepEqual(origensDoSom("Hardware"), ["Hardware"]);
  assert.deepEqual(origensDoSom("Simulacao"), ["Simulacao"]);
  assert.throws(() => origensDoSom("hardware"));
});

const source = (await readFile(new URL("../src/Iceplay.Api/wwwroot/som-alertas.js", import.meta.url), "utf8")).replace(/^import[^\n]+\n/gm, "");
async function fixture({ webkit = false, unsupported = false, resumeFails = false } = {}) {
  const events = {}, nodes = {}, requests = [], contexts = [], intervals = [];
  let contagem = 0, http = 200, saudavel = true, defer = null;
  for (const id of ["monitoramento-origem", "som-alertas", "som-ativar", "som-testar", "som-silenciar", "som-status"]) {
    nodes[id] = { value: id === "monitoramento-origem" ? "Hardware" : "", hidden: true, disabled: false,
      dataset: {}, attributes: {}, handlers: {}, textContent: "", setAttribute(k, v) { this.attributes[k] = v; },
      addEventListener(k, v) { this.handlers[k] = v; } };
  }
  class Audio {
    constructor() { this.state = "suspended"; this.currentTime = 0; this.destination = {}; this.notas = []; contexts.push(this); }
    async resume() { if (resumeFails) throw new Error("Áudio bloqueado pelo navegador."); this.state = "running"; }
    async close() { this.state = "closed"; }
    createOscillator() {
      const n = { frequency: {}, connect() {}, disconnect() {}, start(t) { this.inicio = t; }, stop(t) { this.fim = t; this.parou = true; } };
      this.notas.push(n); return n;
    }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  }
  const document = { hidden: false, getElementById(id) { return nodes[id] ?? null; }, addEventListener(k, v) { events[k] = v; } };
  const window = { setTimeout() { return 1; }, clearTimeout() {}, setInterval(fn) { intervals.push(fn); },
    addEventListener(k, v) { events[k] = v; }, async iceplayFetch(path, options) {
      requests.push({ path, options });
      if (defer) return defer;
      const origem = new URL(path, "http://fixture").searchParams.get("origem");
      return { ok: http === 200, status: http, async json() { return { origem, consultadoEmUtc: "2026-11-26T15:00:00Z", abertos: contagem,
        criticos: contagem, equipamentosMonitorados: 1, equipamentosSemMonitoramentoNestaOrigem: 0,
        avaliador: { saudavel, ultimoSucessoEmUtc: "2026-11-26T15:00:00Z" }, recentes: [] }; } };
    } };
  if (!unsupported) window[webkit ? "webkitAudioContext" : "AudioContext"] = Audio;
  vm.runInNewContext(source, { window, document, AbortController, performance: { now: () => 0 },
    validarResumo, criarControleSom, origensDoSom, Set, Promise, Error });
  const flush = async () => { for (let i = 0; i < 4; i++) await setImmediate(); };
  return { nodes, events, requests, contexts, document, intervals, flush,
    count(n) { contagem = n; }, http(n) { http = n; }, health(v) { saudavel = v; }, defer(p) { defer = p; },
    async click(id) { nodes[id].handlers.click(); await flush(); },
    async origin(value) { nodes["monitoramento-origem"].value = value; nodes["monitoramento-origem"].handlers.change(); await flush(); } };
}
test("carregamento nao cria AudioContext nem consulta; teste local toca tres notas sem armar", async () => {
  const f = await fixture(); assert.equal(f.contexts.length, 0); assert.equal(f.requests.length, 0);
  await f.click("som-testar"); assert.equal(f.contexts[0].notas.length, 3);
  assert.equal(f.requests.length, 0); assert.equal(f.nodes["som-ativar"].attributes["aria-pressed"], "false");
  assert.match(f.nodes["som-status"].textContent, /Teste enviado/);
});
test("alerta aberto na API agenda audio; zero encerra repeticao; silenciar nao faz POST", async () => {
  const f = await fixture(); f.count(1); await f.click("som-ativar");
  assert.equal(f.contexts[0].notas.length, 6); assert.match(f.nodes["som-status"].textContent, /Hardware: 1/);
  f.intervals[0](); await f.flush(); assert.equal(f.contexts[0].notas.length, 6);
  f.count(0); f.intervals[0](); await f.flush(); assert.match(f.nodes["som-status"].textContent, /Aguardando novos/);
  f.count(1); f.intervals[0](); await f.flush(); assert.equal(f.contexts[0].notas.length, 9);
  await f.click("som-silenciar"); f.intervals[0](); await f.flush();
  assert.equal(f.contexts[0].notas.length, 9); assert.ok(f.requests.every(r => !r.options.method));
});
test("fallback Safari funciona e troca de origem consulta ambos os resumos", async () => {
  const f = await fixture({ webkit: true }); await f.click("som-ativar"); await f.origin("");
  assert.deepEqual(f.requests.slice(-2).map(r => r.path), ["/api/alertas/resumo?origem=Hardware", "/api/alertas/resumo?origem=Simulacao"]);
  assert.match(f.nodes["som-status"].textContent, /Hardware e Simulação/);
});
test("falha HTTP e avaliador parado nao tocam dados antigos; recuperacao volta a consultar", async () => {
  const f = await fixture(); await f.click("som-ativar"); f.count(1); f.http(503);
  f.intervals[0](); await f.flush(); assert.equal(f.contexts[0].notas.length, 3);
  assert.equal(f.nodes["som-status"].dataset.state, "error");
  f.http(200); f.health(false); f.intervals[0](); await f.flush(); assert.equal(f.contexts[0].notas.length, 3);
  f.health(true); f.intervals[0](); await f.flush(); assert.equal(f.contexts[0].notas.length, 6);
});
test("mudanca de acesso cancela resposta atrasada e desarma", async () => {
  const f = await fixture(); let liberar; f.defer(new Promise(resolve => { liberar = resolve; }));
  await f.click("som-ativar"); f.events["iceplay:acesso-changed"]();
  liberar({ ok: true, async json() { throw new Error("Resposta antiga não deve tocar."); } }); await f.flush();
  assert.equal(f.contexts[0].notas.length, 3); assert.equal(f.nodes["som-ativar"].attributes["aria-pressed"], "false");
  assert.match(f.nodes["som-status"].textContent, /acesso mudou/);
});
test("ocultar pagina pausa consultas; AudioContext interrompido exige novo clique", async () => {
  const f = await fixture(); await f.click("som-ativar"); f.document.hidden = true; f.events.visibilitychange();
  const total = f.requests.length; f.intervals[0](); await f.flush(); assert.equal(f.requests.length, total);
  f.contexts[0].state = "suspended"; f.document.hidden = false; f.events.visibilitychange(); await f.flush();
  assert.match(f.nodes["som-status"].textContent, /Ativar som novamente/);
  assert.equal(f.nodes["som-ativar"].attributes["aria-pressed"], "false");
});
test("navegador sem audio ou resume recusado apresenta erro e permite tentar novamente", async () => {
  for (const options of [{ unsupported: true }, { resumeFails: true }]) {
    const f = await fixture(options); await f.click("som-ativar");
    assert.equal(f.nodes["som-status"].dataset.state, "error"); assert.equal(f.nodes["som-ativar"].disabled, false);
    assert.equal(f.requests.length, 0);
  }
});
