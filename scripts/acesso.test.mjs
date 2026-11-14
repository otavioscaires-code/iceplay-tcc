import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";
import vm from "node:vm";

const source = await readFile(new URL("../src/Iceplay.Api/wwwroot/acesso.js", import.meta.url), "utf8");

async function browserFixture({ required = true, startupFailure = false, hasForm = true,
  hasMonitoramento = true, search = "", serverState = null } = {}) {
  const nodes = new Map();
  const events = [];
  const requests = [];
  const sessionState = serverState ?? { authenticated: !required };
  const navigations = [];
  let failed = false;
  let delayed = null;
  const presentIds = ["access-shortcut", "access-summary"];
  if (hasForm) presentIds.push("acesso-movel", "access-form", "access-code", "access-submit", "access-logout", "access-status");
  if (hasMonitoramento) presentIds.push("monitoramento");
  for (const id of presentIds) {
    nodes.set(id, { hidden: false, value: "", textContent: "", disabled: false, handlers: {},
      addEventListener(name, handler) { this.handlers[name] = handler; }, focus() {},
      scrollIntoView() { this.scrolled = true; } });
  }
  const node = id => nodes.get(id) ?? null;
  const fetch = async (path, options = {}) => {
    const headers = new Headers(options.headers);
    requests.push({ path, method: options.method ?? "GET", headers, credentials: options.credentials });
    if (path === "/api/acesso") {
      if (startupFailure && !failed) { failed = true; throw new TypeError("API indisponível"); }
      return Response.json({ modoMovel: required, autenticacaoNecessaria: required, autenticado: sessionState.authenticated,
        csrfToken: required ? (sessionState.authenticated ? "token-autenticado" : "token-anonimo") : null });
    }
    if (path === "/api/acesso/entrar") {
      if (JSON.parse(options.body).codigo !== "codigo-fixture") return new Response(null, { status: 401 });
      assert.equal(headers.get("X-ICEPLAY-CSRF"), "token-anonimo");
      sessionState.authenticated = true;
      return new Response(null, { status: 204 });
    }
    if (path === "/api/acesso/sair") {
      assert.equal(headers.get("X-ICEPLAY-CSRF"), "token-autenticado");
      sessionState.authenticated = false;
      return new Response(null, { status: 204 });
    }
    if (path === "/api/atrasada") return new Promise(resolve => { delayed = resolve; });
    return Response.json([], { status: required && !sessionState.authenticated ? 401 : 200 });
  };
  const window = { setTimeout, clearTimeout, location: { search, assign(path) { navigations.push(path); } },
    dispatchEvent(event) { events.push(event.type); } };
  vm.runInNewContext(source, { window, document: { getElementById: node }, fetch, Headers, Event, AbortController, URLSearchParams });
  await setImmediate();
  return { node, window, requests, events, navigations, release() { delayed(Response.json([])); },
    async login(code = "codigo-fixture") { node("access-code").value = code; await node("access-form").handlers.submit({ preventDefault() {} }); },
    async logout() { await node("access-logout").handlers.click(); } };
}

test("modo local mantém acesso sem código e não envia token CSRF", async () => {
  const fixture = await browserFixture({ required: false });
  const response = await fixture.window.iceplayFetch("/api/geladeiras", { method: "POST" });
  assert.equal(response.status, 200);
  assert.equal(fixture.node("acesso-movel").hidden, false);
  assert.match(fixture.node("access-status").textContent, /Acesso local/);
  assert.equal(fixture.node("access-form").hidden, true);
  assert.equal(fixture.node("access-logout").hidden, true);
  assert.equal(fixture.requests.at(-1).headers.has("X-ICEPLAY-CSRF"), false);
});

test("origem móvel exige conexão e mantém segredo fora da URL", async () => {
  const fixture = await browserFixture();
  assert.equal(fixture.node("acesso-movel").hidden, false);
  assert.equal(fixture.node("access-form").hidden, false);
  assert.equal(fixture.node("access-shortcut").textContent, "Ler QR Code / Entrar");
  await fixture.login();
  assert.equal(fixture.node("access-form").hidden, true);
  assert.equal(fixture.node("access-code").value, "");
  assert.equal(fixture.node("access-shortcut").textContent, "Acesso do dispositivo");
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
  assert.equal(fixture.node("access-shortcut").textContent, "Ler QR Code / Entrar");
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

test("página sem formulário consulta sessão e pode consumir API sem elementos inexistentes", async () => {
  const fixture = await browserFixture({ required: false, hasForm: false, hasMonitoramento: false });
  assert.equal(fixture.node("access-form"), null);
  assert.equal(fixture.node("acesso-movel"), null);
  assert.match(fixture.node("access-summary").textContent, /Acesso local/);
  assert.equal((await fixture.window.iceplayFetch("/api/geladeiras")).status, 200);
});

test("página móvel sem formulário mantém link para Acesso e informa 401 na barra", async () => {
  const fixture = await browserFixture({ hasForm: false, hasMonitoramento: false });
  assert.equal(fixture.node("access-shortcut").hidden, false);
  assert.match(fixture.node("access-summary").textContent, /página Acesso/);
  assert.equal((await fixture.window.iceplayFetch("/api/geladeiras")).status, 401);
  assert.ok(fixture.events.includes("iceplay:acesso-changed"));
});

test("falha inicial sem formulário é visível na barra e mantém caminho para Acesso", async () => {
  const fixture = await browserFixture({ hasForm: false, hasMonitoramento: false, startupFailure: true });
  assert.match(fixture.node("access-summary").textContent, /Não foi possível verificar/);
  assert.equal(fixture.node("access-shortcut").hidden, false);
});

test("login na página própria redireciona para retorno interno permitido", async () => {
  const fixture = await browserFixture({ hasMonitoramento: false, search: "?retorno=%2Fhistorico" });
  await fixture.login();
  assert.deepEqual(fixture.navigations, ["/historico"]);
});

test("sem retorno, login na página própria abre Visão geral", async () => {
  const fixture = await browserFixture({ hasMonitoramento: false });
  await fixture.login();
  assert.deepEqual(fixture.navigations, ["/dashboard"]);
});

test("retornos externos ou não previstos nunca são usados no redirecionamento", async () => {
  for (const path of ["https://externo.invalid", "//externo.invalid", "/\\externo.invalid", "javascript:alert(1)", "/api/health", "/historico?codigo=fixture"]) {
    const fixture = await browserFixture({ hasMonitoramento: false, search: "?retorno=" + encodeURIComponent(path) });
    await fixture.login();
    assert.deepEqual(fixture.navigations, ["/dashboard"]);
  }
});

test("compatibilidade com painel existente mantém scroll sem redirecionar", async () => {
  const fixture = await browserFixture();
  await fixture.login();
  assert.equal(fixture.node("monitoramento").scrolled, true);
  assert.deepEqual(fixture.navigations, []);
});

test("nova página consulta sessão já autenticada e obtém seu token renovado", async () => {
  const serverState = { authenticated: false };
  const firstPage = await browserFixture({ hasMonitoramento: false, serverState });
  await firstPage.login();
  const nextPage = await browserFixture({ hasForm: false, hasMonitoramento: false, serverState });
  assert.equal(nextPage.requests[0].path, "/api/acesso");
  assert.match(nextPage.node("access-summary").textContent, /Dispositivo conectado/);
  await nextPage.window.iceplayFetch("/api/geladeiras", { method: "PUT" });
  assert.equal(nextPage.requests.at(-1).headers.get("X-ICEPLAY-CSRF"), "token-autenticado");
});

test("formulário sem JavaScript não envia código em GET e inicia bloqueado", async () => {
  const html = await readFile(new URL("../src/Iceplay.Api/wwwroot/acesso.html", import.meta.url), "utf8");
  const form = html.match(/<form\b[^>]*id="access-form"[^>]*>/)[0];
  assert.match(form, /method="post"/);
  assert.match(form, /action="\/acesso"/);
  assert.match(html, /<input\b[^>]*id="access-code"[^>]*\bdisabled/);
  assert.match(html, /<button\b[^>]*id="access-submit"[^>]*\bdisabled/);
  assert.match(html, /<noscript>/);
});

test("envios simultâneos de login geram somente um POST e bloqueiam controles", async () => {
  const fixture = await browserFixture();
  assert.equal(fixture.node("access-code").disabled, false);
  const first = fixture.login();
  assert.equal(fixture.node("access-code").disabled, true);
  assert.equal(fixture.node("access-submit").disabled, true);
  await Promise.all([first, fixture.login()]);
  assert.equal(fixture.requests.filter(request => request.path === "/api/acesso/entrar").length, 1);
  assert.equal(fixture.node("access-submit").disabled, true);
  await fixture.logout();
  assert.equal(fixture.node("access-code").disabled, false);
});
