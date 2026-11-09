import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../src/Iceplay.Api/wwwroot/shell.js", import.meta.url), "utf8");
function fixture({ mobile = false, pathname = "/dashboard", hash = "", missingMenu = false } = {}) {
  const handlers = {}, attributes = new Map(), classes = new Set(), redirects = [];
  let focus = "";
  const link = { focus() { focus = "link"; } };
  const menu = { classList: { toggle(name, value) { if (value) classes.add(name); else classes.delete(name); } },
    contains(node) { return node === link; }, querySelector() { return link; } };
  const button = { hidden: true, textContent: "", setAttribute(key, value) { attributes.set(key, value); },
    addEventListener(event, fn) { handlers[`button:${event}`] = fn; }, contains(node) { return node === button; }, focus() { focus = "button"; } };
  const media = { matches: mobile, addEventListener(event, fn) { handlers[`media:${event}`] = fn; } };
  const document = { documentElement: { classList: { add(name) { classes.add(name); } } },
    getElementById(id) { return missingMenu ? null : id === "menu-toggle" ? button : menu; },
    addEventListener(event, fn) { handlers[`document:${event}`] = fn; } };
  vm.runInNewContext(source, { document, window: { location: { pathname, hash, replace(url) { redirects.push(url); } }, matchMedia() { return media; } } });
  return { attributes, classes, button, media, redirects,
    get focus() { return focus; },
    clickButton() { handlers["button:click"](); }, escape() { handlers["document:keydown"]({ key: "Escape" }); },
    clickInside() { handlers["document:click"]({ target: link }); }, clickOutside() { handlers["document:click"]({ target: {} }); },
    resize(value) { media.matches = value; handlers["media:change"](); } };
}
test("desktop mantém navegação lateral e oculta botão móvel", () => {
  const f = fixture();
  assert.equal(f.button.hidden, true);
  assert.equal(f.attributes.get("aria-expanded"), "false");
  assert.equal(f.classes.has("is-open"), false);
});
test("menu móvel abre por botão, informa expansão e foca link", () => {
  const f = fixture({ mobile: true });
  assert.equal(f.button.hidden, false);
  f.clickButton();
  assert.equal(f.attributes.get("aria-expanded"), "true");
  assert.equal(f.classes.has("is-open"), true);
  assert.equal(f.focus, "link");
  assert.equal(f.button.textContent, "Fechar menu");
});
test("Escape fecha menu e devolve foco ao botão", () => {
  const f = fixture({ mobile: true }); f.clickButton(); f.escape();
  assert.equal(f.attributes.get("aria-expanded"), "false");
  assert.equal(f.focus, "button");
});
test("clique externo fecha, clique no menu preserva expansão", () => {
  const f = fixture({ mobile: true }); f.clickButton(); f.clickInside();
  assert.equal(f.classes.has("is-open"), true);
  f.clickOutside(); assert.equal(f.classes.has("is-open"), false);
});
test("mudança de viewport restaura navegação e fecha expansão anterior", () => {
  const f = fixture({ mobile: true }); f.clickButton(); f.resize(false);
  assert.equal(f.button.hidden, true); assert.equal(f.classes.has("is-open"), false);
  f.resize(true); assert.equal(f.button.hidden, false); assert.equal(f.attributes.get("aria-expanded"), "false");
});
test("favoritos antigos apontam para documentos novos", () => {
  for (const [hash, target] of [["#geladeiras", "/geladeiras"], ["#acesso-movel", "/acesso"], ["#base-tecnica", "/sobre#base-tecnica"], ["#proximas-etapas", "/sobre#proximas-etapas"]]) {
    assert.deepEqual(fixture({ pathname: "/", hash }).redirects, [target]);
  }
});
test("rotas atuais e âncora do painel não são substituídas", () => {
  assert.deepEqual(fixture({ pathname: "/dashboard", hash: "#monitoramento" }).redirects, []);
  assert.deepEqual(fixture({ pathname: "/sobre", hash: "#base-tecnica" }).redirects, []);
  assert.deepEqual(fixture({ pathname: "/historico" }).redirects, []);
});
test("ausência de menu não quebra documento", () => {
  assert.doesNotThrow(() => fixture({ missingMenu: true }));
});
