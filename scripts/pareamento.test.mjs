import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { setImmediate } from "node:timers/promises";
import vm from "node:vm";

const source = await readFile(new URL("../src/Iceplay.Api/wwwroot/pareamento.js", import.meta.url), "utf8");
const vendor = await readFile(new URL("../src/Iceplay.Api/wwwroot/vendor/qrcodegen-v1.8.0.js", import.meta.url), "utf8");
const token = "a".repeat(43);
const invitation = { url: `https://192.168.1.99:5443/acesso#parear=${token}`, validadeSegundos: 120 };

async function fixture({ required = false, authenticated = false, hash = "", missingLibrary = false,
  issueResponse = null, cancelFailure = false, enterStatus = 204, delayIssue = false } = {}) {
  const nodes = new Map();
  const requests = [];
  const replaced = [];
  const navigations = [];
  const listeners = {};
  const intervals = new Map();
  let now = 0;
  let release;
  let sequence = 0;
  function element() {
    return { hidden: false, disabled: false, textContent: "", handlers: {}, children: [], attrs: {},
      addEventListener(name, handler) { this.handlers[name] = handler; },
      setAttribute(name, value) { this.attrs[name] = value; },
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; } };
  }
  const ids = ["pairing-local", "pairing-issue", "pairing-cancel", "pairing-display", "pairing-qr", "pairing-status",
    "pairing-confirm", "pairing-connect", "pairing-message", "access-code-option"];
  for (const id of ids) nodes.set(id, element());
  const node = id => nodes.get(id);
  const window = {
    location: { hash, pathname: "/acesso", search: "", assign(path) { navigations.push(path); } },
    history: { replaceState(state, title, path) { replaced.push(path); window.location.hash = ""; } },
    addEventListener(name, handler) { listeners[name] = handler; },
    setInterval(callback) { const id = ++sequence; intervals.set(id, callback); return id; },
    clearInterval(id) { intervals.delete(id); },
    async iceplayFetch(path, options = {}) {
      requests.push({ path, ...options, hashAtRequest: window.location.hash });
      if (path === "/api/acesso") return Response.json({ autenticacaoNecessaria: required, autenticado: authenticated,
        pareamentoDisponivel: !required });
      if (path === "/api/acesso/pareamento" && options.method === "POST") {
        if (delayIssue) await new Promise(resolve => { release = resolve; });
        return issueResponse ?? Response.json(invitation);
      }
      if (path === "/api/acesso/pareamento" && options.method === "DELETE") {
        if (cancelFailure) throw new TypeError("Rede indisponivel");
        return new Response(null, { status: 204 });
      }
      if (path === "/api/acesso/pareamento/entrar") return new Response(null, { status: enterStatus });
      throw new Error("Rota inesperada");
    }
  };
  const context = vm.createContext({ window, URL, URLSearchParams, Date: { now: () => now },
    document: { getElementById: node, createElementNS: () => element() } });
  if (!missingLibrary) {
    vm.runInContext(vendor, context);
    window.qrcodegen = context.qrcodegen;
  }
  vm.runInContext(source, context);
  await setImmediate();
  return { node, requests, replaced, navigations, window, intervals, release: () => release(),
    click: id => node(id).handlers.click(), hide: () => listeners.pagehide(),
    advance(seconds) { now += seconds * 1000; for (const callback of [...intervals.values()]) callback(); } };
}

test("pareamento so aparece no computador e nao emite convite automaticamente", async () => {
  const local = await fixture();
  assert.equal(local.node("pairing-local").hidden, false);
  assert.equal(local.node("access-code-option").hidden, true);
  assert.ok(local.requests.every(r => !r.method || r.method === "GET"));
  const mobile = await fixture({ required: true });
  assert.equal(mobile.node("pairing-local").hidden, true);
  assert.equal(mobile.node("access-code-option").hidden, false);
});

test("emissao explicita gera SVG com margem branca e modulo preto sem texto secreto", async () => {
  const f = await fixture();
  await f.click("pairing-issue");
  const svg = f.node("pairing-qr").children[0];
  assert.equal(svg.attrs.role, "img");
  assert.equal(svg.children[0].attrs.fill, "#fff");
  assert.equal(svg.children[1].attrs.fill, "#000");
  assert.ok(svg.children[1].attrs.d.length > 1000);
  assert.ok(!JSON.stringify(svg).includes(token));
  assert.equal(f.node("pairing-display").hidden, false);
  assert.equal(f.requests.at(-1).headers["X-ICEPLAY-LOCAL"], "1");
});

test("duplo clique durante emissao faz somente um POST", async () => {
  const f = await fixture({ delayIssue: true });
  const first = f.click("pairing-issue");
  await f.click("pairing-issue");
  assert.equal(f.node("pairing-issue").disabled, true);
  f.release();
  await first;
  assert.equal(f.requests.filter(r => r.method === "POST").length, 1);
});

test("cancelamento explicito limpa imagem e invalida convite pela API", async () => {
  const f = await fixture();
  await f.click("pairing-issue");
  await f.click("pairing-cancel");
  assert.equal(f.node("pairing-qr").children.length, 0);
  assert.equal(f.intervals.size, 0);
  assert.equal(f.requests.at(-1).method, "DELETE");
  assert.match(f.node("pairing-status").textContent, /cancelado/);
});

test("falha de cancelamento nao confirma revogacao inexistente", async () => {
  const f = await fixture({ cancelFailure: true });
  await f.click("pairing-issue");
  await f.click("pairing-cancel");
  assert.match(f.node("pairing-status").textContent, /não confirmado/);
  assert.equal(f.node("pairing-display").hidden, true);
});

test("expiracao visual remove QR e temporizador sem renovacao automatica", async () => {
  const f = await fixture();
  await f.click("pairing-issue");
  f.advance(120);
  assert.equal(f.node("pairing-display").hidden, true);
  assert.equal(f.intervals.size, 0);
  assert.match(f.node("pairing-status").textContent, /expirado/);
  assert.equal(f.requests.filter(r => r.method === "POST").length, 1);
});

test("fragmento e retirado antes de HTTP e conexao exige confirmacao", async () => {
  const f = await fixture({ required: true, hash: "#parear=" + token });
  assert.deepEqual(f.replaced, ["/acesso"]);
  assert.ok(f.requests.every(r => r.hashAtRequest === "" && !r.path.includes(token)));
  assert.equal(f.node("pairing-confirm").hidden, false);
  assert.equal(f.node("pairing-connect").disabled, false);
  assert.ok(f.requests.every(r => !r.method));
});

test("confirmacao envia token apenas no JSON e nao repete o login", async () => {
  const f = await fixture({ required: true, hash: "#parear=" + token });
  await Promise.all([f.click("pairing-connect"), f.click("pairing-connect")]);
  const posts = f.requests.filter(r => r.method === "POST");
  assert.equal(posts.length, 1);
  assert.equal(posts[0].path, "/api/acesso/pareamento/entrar");
  assert.deepEqual(JSON.parse(posts[0].body), { token });
  assert.deepEqual(f.navigations, ["/dashboard"]);
});

test("QR expirado informa falha, mantem alternativa manual e nao navega", async () => {
  const f = await fixture({ required: true, hash: "#parear=" + token, enterStatus: 401 });
  await f.click("pairing-connect");
  assert.match(f.node("pairing-message").textContent, /expirado/);
  assert.deepEqual(f.navigations, []);
  assert.equal(f.node("access-code-option").hidden, false);
});

test("sessao autenticada ignora token recebido e nao abre outra sessao", async () => {
  const f = await fixture({ required: true, authenticated: true, hash: "#parear=" + token });
  assert.equal(f.node("pairing-confirm").hidden, true);
  assert.equal(f.node("access-code-option").hidden, true);
  assert.ok(f.requests.every(r => !r.method));
});

test("fragmento invalido e removido sem enviar token para a API", async () => {
  const f = await fixture({ required: true, hash: "#parear=%3Cscript%3E" });
  assert.equal(f.node("pairing-confirm").hidden, true);
  assert.match(f.node("pairing-message").textContent, /inválido/);
  assert.deepEqual(f.replaced, ["/acesso"]);
});

test("resposta de convite sem HTTPS nao e apresentada", async () => {
  const f = await fixture({ issueResponse: Response.json({ ...invitation, url: invitation.url.replace("https:", "http:") }) });
  await f.click("pairing-issue");
  assert.equal(f.node("pairing-display").hidden, true);
  assert.match(f.node("pairing-status").textContent, /inválido/);
});

test("biblioteca indisponivel produz mensagem e mantem interface operavel", async () => {
  const f = await fixture({ missingLibrary: true });
  await f.click("pairing-issue");
  assert.match(f.node("pairing-status").textContent, /biblioteca/);
  assert.equal(f.node("pairing-issue").disabled, false);
});

test("sair da pagina limpa imagem sem alteracao automatica na API", async () => {
  const f = await fixture();
  await f.click("pairing-issue");
  const before = f.requests.length;
  f.hide();
  assert.equal(f.node("pairing-qr").children.length, 0);
  assert.equal(f.intervals.size, 0);
  assert.equal(f.requests.length, before);
});

test("biblioteca local preserva hash do artefato oficial e licenca MIT", () => {
  assert.equal(createHash("sha256").update(vendor).digest("hex"), "6a1116192ed1dd67fa1bf31e77f5817103d71c23bbac24c382e698b7668bdd01");
  assert.match(vendor, /MIT License/);
});
