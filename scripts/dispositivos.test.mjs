import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";
import { instanteUtc, tipos, gravidades, motivos } from "../src/Iceplay.Api/wwwroot/alertas-estado.mjs";

const strip = s => s.replace(/^import[^\n]+\n/gm, "").replace(/^export /gm, "");
const renderSource = strip(await readFile(new URL("../src/Iceplay.Api/wwwroot/alertas-render.mjs", import.meta.url), "utf8"));
const source = strip(await readFile(new URL("../src/Iceplay.Api/wwwroot/dispositivos.js", import.meta.url), "utf8"));
async function fixture({ deny = false, empty = false } = {}) {
  class Node {
    constructor(tag = "div") { this.tag = tag; this.children = []; this.handlers = {}; this.attributes = {}; this.dataset = {}; this.value = ""; this._text = ""; this.disabled = true; this.hidden = false; }
    get textContent() { return this._text + this.children.map(c => typeof c === "string" ? c : c.textContent).join(" "); }
    set textContent(v) { this._text = String(v); this.children = []; }
    set innerHTML(v) { throw new Error("HTML dinamico nao permitido"); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = [...children]; this._text = ""; }
    setAttribute(k, v) { this.attributes[k] = v; }
    addEventListener(k, fn) { this.handlers[k] = fn; }
  }
  const nodes = new Map(), events = {}, requests = [], stored = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, new Node()); return nodes.get(id); };
  let mode = "ok", release = null, counter = 0;
  const flush = async () => { for (let i = 0; i < 5; i++) await setImmediate(); };
  const window = { setTimeout, clearTimeout, addEventListener(k, fn) { events[k] = fn; },
    async iceplayFetch(path, options = {}) {
      const method = options.method ?? "GET"; requests.push({ path, method });
      if (deny) return new Response(null, { status: 401 });
      if (path === "/api/geladeiras") return Response.json(empty ? [] : [{ id: 1, nome: "FIXTURE A" }, { id: 2, nome: "FIXTURE B" }]);
      const match = /\/geladeiras\/(\d+)\/dispositivos(?:\/(\d+)\/revogar)?$/.exec(path), id = Number(match[1]), deviceId = Number(match[2]);
      if (method === "GET") {
        const data = [...stored.values()].filter(d => d.geladeiraId === id);
        if (mode === "delay") return new Promise(resolve => { release = () => resolve(Response.json(data)); });
        return Response.json(data);
      }
      if (mode === "503") return new Response(null, { status: 503 });
      if (deviceId) { const d = stored.get(deviceId); d.revogadoEmUtc = "2026-11-12T12:01:00Z"; return Response.json(d); }
      const d = { id: ++counter, geladeiraId: id, nome: JSON.parse(options.body).nome, criadoEmUtc: "2026-11-12T12:00:00Z", revogadoEmUtc: null };
      stored.set(d.id, d);
      if (mode === "lost") throw new TypeError("Resposta perdida na fixture");
      return Response.json({ dispositivo: d, credencial: `icp_${d.id}_${"a".repeat(64)}` }, { status: 201 });
    } };
  const context = vm.createContext({ window, document: { getElementById: node, createElement: tag => new Node(tag) }, instanteUtc,
    tipos, gravidades, motivos, AbortController, Date, Error, TypeError, Object, Number, Set, RegExp, JSON });
  vm.runInContext(renderSource, context); vm.runInContext(source, context); await flush();
  function findButton(text) { const walk = n => { if (n.tag === "button" && n.textContent === text) return n; for (const child of n.children) if (typeof child !== "string") { const result = walk(child); if (result) return result; } };
    return walk(node("dispositivo-lista")); }
  return { node: id => node(`dispositivo-${id}`), events, requests, flush, stored, mode(v) { mode = v; }, release: () => release?.(),
    submit() { node("dispositivo-form").handlers.submit({ preventDefault() {} }); }, button: findButton };
}
test("inicio consulta metadados sem criar credencial automaticamente", async () => {
  const f = await fixture();
  assert.equal(f.requests.filter(r => r.method === "POST").length, 0);
  assert.equal(f.node("emitir").disabled, false);
  assert.equal(f.node("segredo").hidden, true);
});
test("emissao exige confirmacao explicita e cancelar nao altera dados", async () => {
  const f = await fixture(); f.node("nome").value = "ESP32 FIXTURE"; f.submit();
  assert.equal(f.node("confirmacao").hidden, false);
  assert.equal(f.requests.filter(r => r.method === "POST").length, 0);
  f.node("cancelar").handlers.click();
  assert.equal(f.node("confirmacao").hidden, true);
  assert.equal(f.stored.size, 0);
});
test("nome vazio e recusado antes de preparar alteracao", async () => {
  const f = await fixture(); f.node("nome").value = "  "; f.submit();
  assert.equal(f.node("status").dataset.state, "error");
  assert.equal(f.requests.filter(r => r.method === "POST").length, 0);
});
test("emissao mostra segredo uma vez e limpeza remove copia da tela", async () => {
  const f = await fixture(); f.node("nome").value = "ESP32 <img>"; f.submit(); await f.node("confirmar").handlers.click();
  assert.equal(f.node("segredo").hidden, false); assert.match(f.node("credencial").value, /^icp_1_/);
  assert.match(f.node("lista").textContent, /ESP32 <img>/);
  assert.equal(f.node("emitir").disabled, true);
  f.node("ocultar").handlers.click(); assert.equal(f.node("credencial").value, ""); assert.equal(f.node("segredo").hidden, true);
});
test("recarregar metadados nao recupera segredo e mantem bloqueio de segundo ativo", async () => {
  const f = await fixture(); f.node("nome").value = "ESP32"; f.submit(); await f.node("confirmar").handlers.click();
  await f.node("recarregar").handlers.click(); await f.flush();
  assert.equal(f.node("credencial").value, ""); assert.equal(f.node("emitir").disabled, true);
  assert.ok(f.button("Revogar credencial"));
});
test("revogar exige confirmacao e libera nova emissao depois da resposta", async () => {
  const f = await fixture(); f.node("nome").value = "ESP32"; f.submit(); await f.node("confirmar").handlers.click();
  f.button("Revogar credencial").handlers.click(); assert.equal(f.stored.get(1).revogadoEmUtc, null);
  await f.node("confirmar").handlers.click();
  assert.equal(f.stored.get(1).revogadoEmUtc, "2026-11-12T12:01:00Z"); assert.equal(f.node("emitir").disabled, false);
});
for (const mode of ["lost", "503"]) test(`falha ${mode} bloqueia repeticao ate consulta e limpa segredo`, async () => {
  const f = await fixture(); f.mode(mode); f.node("nome").value = "ESP32"; f.submit(); await f.node("confirmar").handlers.click();
  assert.equal(f.node("emitir").disabled, true); assert.equal(f.node("credencial").value, "");
  assert.match(f.node("status").textContent, /Recarregar dispositivos/);
  const count = f.requests.filter(r => r.method === "POST").length; f.submit();
  assert.equal(f.requests.filter(r => r.method === "POST").length, count);
});
test("mudanca de acesso e saida limpam segredo sem localStorage", async () => {
  const f = await fixture(); f.node("nome").value = "ESP32"; f.submit(); await f.node("confirmar").handlers.click();
  f.events["pagehide"](); assert.equal(f.node("credencial").value, "");
  await f.events["iceplay:acesso-changed"](); await f.flush(); assert.equal(f.node("credencial").value, "");
});
test("falha de acesso ou banco vazio nao permite emissao", async () => {
  for (const options of [{ deny: true }, { empty: true }]) { const f = await fixture(options); assert.equal(f.node("emitir").disabled, true); assert.equal(f.requests.filter(r => r.method === "POST").length, 0); }
});
test("consulta atrasada de outra geladeira nao substitui selecao atual", async () => {
  const f = await fixture(); f.mode("delay"); f.node("geladeira").value = "1"; f.node("geladeira").handlers.change(); await f.flush();
  f.mode("ok"); f.node("geladeira").value = "2"; f.node("geladeira").handlers.change(); await f.flush();
  f.release(); await f.flush();
  f.node("nome").value = "ESP32 B"; f.submit(); await f.node("confirmar").handlers.click();
  assert.equal(f.stored.get(1).geladeiraId, 2);
});
