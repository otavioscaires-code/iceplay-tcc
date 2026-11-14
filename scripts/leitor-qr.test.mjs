import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const source = await readFile(new URL('../src/Iceplay.Api/wwwroot/leitor-qr.js', import.meta.url), 'utf8');
const encoder = await readFile(new URL('../src/Iceplay.Api/wwwroot/vendor/qrcodegen-v1.8.0.js', import.meta.url), 'utf8');
const decoder = await readFile(new URL('../src/Iceplay.Api/wwwroot/vendor/jsqr-v1.4.0.js', import.meta.url), 'utf8');
const expected = 'https://192.168.1.99:5443/acesso?modo=qr#parear=' + 'a'.repeat(43);
const libraries = vm.createContext({ Uint8ClampedArray });
vm.runInContext(encoder, libraries);
vm.runInContext(decoder, libraries);
const qr = libraries.qrcodegen.QrCode.encodeText(expected, libraries.qrcodegen.QrCode.Ecc.MEDIUM);
const width = (qr.size + 8) * 6;
const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
  if (qr.getModule(Math.floor(x / 6) - 4, Math.floor(y / 6) - 4)) {
    const index = (y * width + x) * 4;
    pixels[index] = pixels[index + 1] = pixels[index + 2] = 0;
  }
}

function fixture({ secure = true, mediaError = null, pending = false, accept = true,
  invalidQr = false, playError = false, libraryMissing = false } = {}) {
  const nodes = new Map();
  const mediaRequests = [];
  const tracks = [];
  const accepted = [];
  const timers = new Map();
  const windowEvents = {};
  const documentEvents = {};
  let release;
  let now = 0;
  let sequence = 0;
  for (const id of ['pairing-reader', 'reader-start', 'reader-stop', 'reader-video', 'reader-status']) {
    nodes.set(id, { hidden: true, disabled: false, textContent: '', handlers: {},
      addEventListener(type, fn) { this.handlers[type] = fn; }, pause() {},
      readyState: 2, videoWidth: width, videoHeight: width,
      async play() { if (playError) throw new Error('camera'); } });
  }
  const node = id => nodes.get(id);
  const canvas = { width: 0, height: 0, getContext() { return { drawImage() {},
    getImageData() { return { width, height: width, data: pixels }; } }; } };
  const document = { hidden: false, getElementById: node, createElement: () => canvas,
    addEventListener(type, fn) { documentEvents[type] = fn; } };
  const window = { isSecureContext: secure, jsQR: libraryMissing ? undefined
    : invalidQr ? () => ({ data: 'https://externo.invalid/qr' }) : libraries.jsQR,
    iceplayPairing: { acceptQr(value) { accepted.push(value); return accept; } },
    setTimeout(fn) { const id = ++sequence; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }, addEventListener(type, fn) { windowEvents[type] = fn; } };
  const navigator = { mediaDevices: { async getUserMedia(options) {
    mediaRequests.push(options);
    if (pending) await new Promise(resolve => { release = resolve; });
    if (mediaError) throw { name: mediaError };
    const track = { stops: 0, stop() { this.stops++; } };
    tracks.push(track);
    return { getTracks: () => [track] };
  } } };
  vm.runInNewContext(source, { window, document, navigator, Date: { now: () => now } });
  window.iceplayQrReader.setAvailable(true);
  return { node, window, document, canvas, mediaRequests, tracks, accepted, timers,
    click: id => node(id).handlers.click(), release: () => release(),
    hide() { document.hidden = true; documentEvents.visibilitychange(); },
    leave() { windowEvents.pagehide(); },
    advance(seconds) { now += seconds * 1000; const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); } };
}

test('decoder independente le os pixels do QR gerado para a URL completa', () => {
  assert.equal(libraries.jsQR(pixels, width, width).data, expected);
});

test('camera nao e solicitada automaticamente ao abrir a tela', () => {
  const f = fixture();
  assert.equal(f.mediaRequests.length, 0);
  assert.equal(f.node('pairing-reader').hidden, false);
});

test('leitura interna solicita camera traseira sem audio e entrega convite correto', async () => {
  const f = fixture();
  await f.click('reader-start');
  assert.equal(f.mediaRequests.length, 1);
  assert.equal(f.mediaRequests[0].audio, false);
  assert.equal(f.mediaRequests[0].video.facingMode.ideal, 'environment');
  assert.deepEqual(f.accepted, [expected]);
  assert.equal(f.tracks[0].stops, 1);
  assert.equal(f.node('reader-video').srcObject, null);
  assert.equal(f.timers.size, 0);
});

test('permissao negada informa problema e permite tentar novamente', async () => {
  const f = fixture({ mediaError: 'NotAllowedError' });
  await f.click('reader-start');
  assert.match(f.node('reader-status').textContent, /não autorizada/);
  assert.equal(f.node('reader-start').disabled, false);
  assert.equal(f.accepted.length, 0);
});

test('HTTP inseguro nao solicita camera', async () => {
  const f = fixture({ secure: false });
  await f.click('reader-start');
  assert.match(f.node('reader-status').textContent, /HTTPS/);
  assert.equal(f.mediaRequests.length, 0);
});

test('camera indisponivel possui mensagem distinta', async () => {
  const f = fixture({ mediaError: 'NotFoundError' });
  await f.click('reader-start');
  assert.match(f.node('reader-status').textContent, /Nenhuma câmera/);
});

test('QR estrangeiro nao conecta e permite continuar enquadramento', async () => {
  const f = fixture({ invalidQr: true, accept: false });
  await f.click('reader-start');
  assert.match(f.node('reader-status').textContent, /não é um convite/);
  assert.equal(f.tracks[0].stops, 0);
  assert.equal(f.timers.size, 1);
  await f.click('reader-stop');
  assert.equal(f.tracks[0].stops, 1);
  assert.equal(f.timers.size, 0);
});

test('permissao resolvida depois de cancelar encerra stream tardio', async () => {
  const f = fixture({ pending: true });
  const task = f.click('reader-start');
  await f.click('reader-stop');
  f.release();
  await task;
  assert.equal(f.tracks[0].stops, 1);
  assert.equal(f.accepted.length, 0);
  assert.equal(f.node('reader-video').srcObject, null);
});

test('duplo clique com permissao pendente nao pede camera duas vezes', async () => {
  const f = fixture({ pending: true });
  const task = f.click('reader-start');
  await f.click('reader-start');
  assert.equal(f.mediaRequests.length, 1);
  f.release();
  await task;
});

test('ocultar ou sair da pagina encerra camera e temporizador', async () => {
  for (const action of ['hide', 'leave']) {
    const f = fixture({ invalidQr: true, accept: false });
    await f.click('reader-start');
    f[action]();
    assert.equal(f.tracks[0].stops, 1);
    assert.equal(f.timers.size, 0);
  }
});

test('limite de 90 segundos encerra captura sem renovar o convite', async () => {
  const f = fixture({ invalidQr: true, accept: false });
  await f.click('reader-start');
  f.advance(90);
  assert.equal(f.tracks[0].stops, 1);
  assert.match(f.node('reader-status').textContent, /Leitura encerrada/);
});

test('falha de video encerra camera sem confirmar leitura', async () => {
  const f = fixture({ playError: true });
  await f.click('reader-start');
  assert.equal(f.tracks[0].stops, 1);
  assert.equal(f.accepted.length, 0);
});

test('biblioteca ausente nao solicita camera', async () => {
  const f = fixture({ libraryMissing: true });
  await f.click('reader-start');
  assert.equal(f.mediaRequests.length, 0);
  assert.match(f.node('reader-status').textContent, /não carregou/);
});

test('artefato decoder preserva hash e licenca local', async () => {
  assert.equal(createHash('sha256').update(decoder).digest('hex'), 'bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859');
  const license = await readFile(new URL('../src/Iceplay.Api/wwwroot/vendor/jsqr-LICENSE.txt', import.meta.url), 'utf8');
  assert.match(license, /Apache License/);
});
