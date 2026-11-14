import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setImmediate } from 'node:timers/promises';
import vm from 'node:vm';

const access = await readFile(new URL('../src/Iceplay.Api/wwwroot/acesso.js', import.meta.url), 'utf8');
const pairing = await readFile(new URL('../src/Iceplay.Api/wwwroot/pareamento.js', import.meta.url), 'utf8');
const token = 'a'.repeat(43);

async function fixture(hash = '') {
  const nodes = new Map();
  const events = {};
  const requests = [];
  const navigations = [];
  let authenticated = false;
  for (const id of ['acesso-movel', 'access-shortcut', 'access-summary', 'access-form', 'access-code', 'access-submit',
    'access-logout', 'access-status', 'pairing-local', 'pairing-issue', 'pairing-cancel', 'pairing-display',
    'pairing-qr', 'pairing-status', 'pairing-confirm', 'pairing-connect', 'pairing-message', 'access-code-option']) {
    nodes.set(id, { hidden: true, disabled: true, value: '', textContent: '', handlers: {},
      addEventListener(name, fn) { this.handlers[name] = fn; }, focus() {}, scrollIntoView() {}, replaceChildren() {} });
  }
  const node = id => nodes.get(id) ?? null;
  const window = { setTimeout, clearTimeout,
    location: { hash, origin: 'https://192.168.1.99:5443', pathname: '/acesso', search: '?modo=qr', assign(url) { navigations.push(url); } },
    history: { replaceState() { window.location.hash = ''; } },
    addEventListener(name, fn) { (events[name] ??= []).push(fn); },
    dispatchEvent(event) { for (const fn of events[event.type] ?? []) fn(event); },
    iceplayQrReader: { setAvailable() {}, stop() {} } };
  const fetch = async (path, options = {}) => {
    requests.push({ path, method: options.method ?? 'GET' });
    if (path === '/api/acesso') return Response.json({ modoMovel: true, autenticacaoNecessaria: true,
      autenticado: authenticated, pareamentoDisponivel: false, csrfToken: authenticated ? 'autenticado' : 'anonimo' });
    if (path === '/api/acesso/pareamento/entrar') {
      assert.equal(new Headers(options.headers).get('X-ICEPLAY-CSRF'), 'anonimo');
      assert.deepEqual(JSON.parse(options.body), { token });
      authenticated = true;
      return new Response(null, { status: 204 });
    }
    if (path === '/api/geladeiras') return Response.json([], { status: authenticated ? 200 : 401 });
    throw new Error('Rota nao prevista: ' + path);
  };
  const context = vm.createContext({ window, document: { getElementById: node }, fetch,
    Headers, Event, AbortController, URL, URLSearchParams });
  vm.runInContext(access, context);
  vm.runInContext(pairing, context);
  await setImmediate();
  await setImmediate();
  return { node, window, requests, navigations };
}

test('scripts reais de acesso e pareamento preservam convite inicial e CSRF', async () => {
  const f = await fixture('#parear=' + token);
  assert.equal(f.node('pairing-confirm').hidden, false);
  assert.equal(f.node('access-code-option').hidden, true);
  await f.node('pairing-connect').handlers.click();
  assert.deepEqual(f.navigations, ['/dashboard']);
  assert.equal((await f.window.iceplayFetch('/api/geladeiras')).status, 200);
  assert.equal(f.requests.filter(r => r.method === 'POST').length, 1);
});

test('aba existente reconhece novo hash e conecta usando helper CSRF real', async () => {
  const f = await fixture();
  f.window.location.hash = '#parear=' + token;
  f.window.dispatchEvent(new Event('hashchange'));
  assert.equal(f.node('pairing-confirm').hidden, false);
  assert.equal(f.node('access-code-option').hidden, true);
  await f.node('pairing-connect').handlers.click();
  assert.deepEqual(f.navigations, ['/dashboard']);
});

test('leitura na propria pagina conecta sem solicitar codigo permanente', async () => {
  const f = await fixture();
  assert.equal(f.window.iceplayPairing.acceptQr('https://192.168.1.99:5443/acesso?modo=qr#parear=' + token), true);
  await f.node('pairing-connect').handlers.click();
  assert.deepEqual(f.navigations, ['/dashboard']);
  assert.ok(!f.requests.some(r => r.path === '/api/acesso/entrar'));
});
