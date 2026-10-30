import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";
import vm from "node:vm";

const source = await readFile(new URL("../src/Iceplay.Api/wwwroot/acesso.js", import.meta.url), "utf8");

async function browserFixture({ required = true, startupFailure = false } = {}) {
  const nodes = new Map();
  const events = [];
  const requests = [];
  let authenticated = !required;
  let failed = false;
  let delayed = null;
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { hidden: false, value: "", textContent: "", disabled: false, handlers: {},
      addEventListener(name, handler) { this.handlers[name] = handler; }, focus() {}, scrollIntoView() {} });
    return nodes.get(id);
  }
  const fetch = async (path, options = {}) => {
    const headers = new Headers(options.headers);
    requests.push({ path, method: options.method ?? "GET", headers, credentials: options.credentials });
    if (path === "/api/acesso") {
      if (startupFailure && !failed) { failed = true; throw new TypeError("API indisponível"); }
      return Response.json({ modoMovel: required, autenticacaoNecessaria: required, autenticado: authenticated,
        csrfToken: required ? (authenticated ? "token-autenticado" : "token-anonimo") : null });
    }
    if (path === "/api/acesso/entrar") {
      if (JSON.parse(options.body).codigo !== "codigo-fixture") return new Response(null, { status: 401 });
      assert.equal(headers.get("X-ICEPLAY-CSRF"), "token-anonimo");
      authenticated = true;
      return new Response(null, { status: 204 });
    }
    if (path === "/api/acesso/sair") {
      assert.equal(headers.get("X-ICEPLAY-CSRF"), "token-autenticado");
      authenticated = false;
      return new Response(null, { status: 204 });
    }
    if (path === "/api/atrasada") return new Promise(resolve => { delayed = resolve; });
    return Response.json([], { status: required && !authenticated ? 401 : 200 });
  };
  const window = { setTimeout, clearTimeout, dispatchEvent(event) { events.push(event.type); } };
  vm.runInNewContext(source, { window, document: { getElementById: node }, fetch, Headers, Event, AbortController });
  await setImmediate();
  return { node, window, requests, events, release() { delayed(Response.json([])); },
    async login(code = "codigo-fixture") { node("access-code").value = code; await node("access-form").handlers.submit({ preventDefault() {} }); },
    async logout() { await node("access-logout").handlers.click(); } };
}

test("modo local mantém acesso sem código e não envia token CSRF", async () => {
  const fixture = await browserFixture({ required: false });
  const response = await fixture.window.iceplayFetch("/api/geladeiras", { method: "POST" });
  assert.equal(response.status, 200);
  assert.equal(fixture.node("acesso-movel").hidden, true);
  assert.equal(fixture.requests.at(-1).headers.has("X-ICEPLAY-CSRF"), false);
});

test("origem móvel exige conexão e mantém segredo fora da URL", async () => {
  const fixture = await browserFixture();
  assert.equal(fixture.node("acesso-movel").hidden, false);
  assert.equal(fixture.node("access-form").hidden, false);
  await fixture.login();
  assert.equal(fixture.node("access-form").hidden, true);
  assert.equal(fixture.node("access-code").value, "");
  assert.ok(fixture.requests.every(request => !request.path.includes("codigo-fixture")));
});

test("após login as alterações usam token renovado e credenciais na mesma origem", async () => {
  const fixture = await browserFixture();
  await fixture.login();
  await fixture.window.iceplayFetch("/api/geladeiras", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const request = fixture.requests.at(-1);
  assert.equal(request.headers.get("X-ICEPLAY-CSRF"), "token-autenticado");
  assert.equal(request.headers.get("Content-Type"), "application/json");
  assert.equal(request.credentials, "same-origin");
});

test("GET não envia token de alteração", async () => {
  const fixture = await browserFixture();
  await fixture.login();
  await fixture.window.iceplayFetch("/api/geladeiras");
  assert.equal(fixture.requests.at(-1).headers.has("X-ICEPLAY-CSRF"), false);
});

test("código inválido mostra erro e não repete automaticamente o POST", async () => {
  const fixture = await browserFixture();
  await fixture.login("incorreto");
  assert.equal(fixture.requests.filter(request => request.path === "/api/acesso/entrar").length, 1);
  assert.match(fixture.node("access-status").textContent, /inválido/);
  assert.equal(fixture.node("access-submit").disabled, false);
});

test("saída usa CSRF, limpa acesso e informa a mudança aos módulos", async () => {
  const fixture = await browserFixture();
  await fixture.login();
  const before = fixture.events.length;
  await fixture.logout();
  assert.equal(fixture.node("access-form").hidden, false);
  assert.equal(fixture.node("access-logout").hidden, true);
  assert.ok(fixture.events.length > before);
  assert.equal((await fixture.window.iceplayFetch("/api/geladeiras")).status, 401);
});

test("consulta iniciada antes da saída não pode devolver dados à interface depois dela", async () => {
  const fixture = await browserFixture();
  await fixture.login();
  const pending = fixture.window.iceplayFetch("/api/atrasada");
  await fixture.logout();
  fixture.release();
  await assert.rejects(pending, /acesso mudou/);
});

test("falha inicial de rede permite recuperação posterior", async () => {
  const fixture = await browserFixture({ required: false, startupFailure: true });
  assert.equal((await fixture.window.iceplayFetch("/api/geladeiras")).status, 200);
  assert.equal(fixture.requests.filter(request => request.path === "/api/acesso").length, 2);
});
