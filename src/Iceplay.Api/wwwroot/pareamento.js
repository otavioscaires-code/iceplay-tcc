(() => {
  const local = document.getElementById("pairing-local");
  if (!local) return;
  const issue = document.getElementById("pairing-issue");
  const cancel = document.getElementById("pairing-cancel");
  const display = document.getElementById("pairing-display");
  const image = document.getElementById("pairing-qr");
  const status = document.getElementById("pairing-status");
  const confirm = document.getElementById("pairing-confirm");
  const connect = document.getElementById("pairing-connect");
  const message = document.getElementById("pairing-message");
  const manual = document.getElementById("access-code-option");
  const mobileAddress = document.getElementById("pairing-mobile-address");
  let incoming = null;
  let busy = false;
  let timer = null;
  let session = null;
  let pendingSession = null;

  // O fragmento não vai na requisição HTTP. Removê-lo antes de qualquer await
  // evita mantê-lo na barra/histórico; o segredo permanece só nesta página.
  function captureFragment() {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (!fragment.has("parear")) return;
    const value = fragment.get("parear");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (busy) return;
    if (/^[A-Za-z0-9_-]{43}$/.test(value ?? "")) incoming = value;
    else message.textContent = "QR Code inválido. Gere outro no computador.";
    renderControls();
  }
  captureFragment();

  function renderControls() {
    if (!session) return;
    local.hidden = session.pareamentoDisponivel !== true;
    const requiresLogin = session.autenticacaoNecessaria && !session.autenticado;
    if (!requiresLogin) incoming = null;
    manual.hidden = !requiresLogin || !!incoming;
    confirm.hidden = !requiresLogin || !incoming;
    connect.disabled = !requiresLogin || !incoming || busy;
    window.iceplayQrReader?.setAvailable(requiresLogin && !incoming && !busy);
    if (mobileAddress && session.pareamentoDisponivel && typeof session.enderecoMovel === "string") {
      const address = new URL(session.enderecoMovel);
      if (address.protocol === "https:" && address.pathname === "/acesso" && !address.hash) {
        mobileAddress.href = address.href;
        mobileAddress.textContent = address.href;
      }
    }
  }

  // A leitura interna aceita apenas convites deste servidor. Nunca navega para
  // o endereço de um QR arbitrário nem envia seu conteúdo para outro site.
  window.iceplayPairing = Object.freeze({ acceptQr(value) {
    if (busy || !session?.autenticacaoNecessaria || session.autenticado) return false;
    let url;
    try { url = new URL(value); } catch { return false; }
    if (url.origin !== window.location.origin || url.protocol !== "https:" || url.pathname !== "/acesso"
        || url.username || url.password || !["", "?modo=qr"].includes(url.search)
        || !/^#parear=[A-Za-z0-9_-]{43}$/.test(url.hash)) return false;
    incoming = url.hash.slice("#parear=".length);
    manual.open = false;
    message.textContent = "QR Code reconhecido. Toque em Conectar este dispositivo para entrar.";
    renderControls();
    confirm.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    return true;
  } });

  function clearQr() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    image.replaceChildren();
    display.hidden = true;
    cancel.hidden = true;
  }

  function makeQr(url) {
    const QrCode = window.qrcodegen?.QrCode;
    if (!QrCode) throw new Error("A biblioteca do QR Code não carregou. Atualize a página.");
    const qr = QrCode.encodeText(url, QrCode.Ecc.MEDIUM);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${qr.size + 8} ${qr.size + 8}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "QR Code temporário para conectar o celular ao ICEPLAY");
    svg.setAttribute("shape-rendering", "crispEdges");
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", "#fff");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const modules = [];
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.getModule(x, y)) modules.push(`M${x + 4},${y + 4}h1v1h-1z`);
      }
    }
    path.setAttribute("d", modules.join(""));
    path.setAttribute("fill", "#000");
    svg.append(background, path);
    return svg;
  }

  async function syncSession() {
    if (pendingSession) return pendingSession;
    pendingSession = (async () => {
      const response = await window.iceplayFetch("/api/acesso", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível verificar o acesso. Atualize a página.");
      const value = await response.json();
      if (typeof value.autenticacaoNecessaria !== "boolean" || typeof value.autenticado !== "boolean")
        throw new Error("Não foi possível verificar o acesso. Atualize a página.");
      session = value;
      renderControls();
    })();
    try { await pendingSession; } finally { pendingSession = null; }
  }

  issue.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    issue.disabled = true;
    clearQr();
    status.textContent = "Gerando convite…";
    try {
      const response = await window.iceplayFetch("/api/acesso/pareamento", {
        method: "POST", headers: { "X-ICEPLAY-LOCAL": "1" }
      });
      if (!response.ok) throw new Error("Gere o QR Code pelo endereço localhost no computador que executa o ICEPLAY.");
      const invitation = await response.json();
      const url = new URL(invitation.url);
      if (url.protocol !== "https:" || url.pathname !== "/acesso" || !["", "?modo=qr"].includes(url.search) || url.username || url.password
          || !/^#parear=[A-Za-z0-9_-]{43}$/.test(url.hash) || invitation.validadeSegundos !== 120) {
        throw new Error("Convite inválido. Atualize a página e gere outro.");
      }
      image.replaceChildren(makeQr(url.href));
      display.hidden = false;
      cancel.hidden = false;
      const deadline = Date.now() + invitation.validadeSegundos * 1000;
      const tick = () => {
        const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        if (!seconds) {
          clearQr();
          status.textContent = "QR Code expirado. Gere outro para conectar o celular.";
        } else status.textContent = `No celular, toque em Ler QR Code. Prazo restante: ${seconds} s; uso único.`;
      };
      tick();
      timer = window.setInterval(tick, 1000);
    } catch (error) {
      clearQr();
      status.textContent = error.name === "AbortError" || error instanceof TypeError
        ? "Não foi possível confirmar a emissão. Verifique a rede e gere outro QR Code; isso invalida o anterior."
        : error.message;
    } finally { busy = false; issue.disabled = false; }
  });

  cancel.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    issue.disabled = true;
    clearQr();
    try {
      const response = await window.iceplayFetch("/api/acesso/pareamento", {
        method: "DELETE", headers: { "X-ICEPLAY-LOCAL": "1" }
      });
      if (response.status !== 204) throw new Error("Cancelamento não confirmado. O convite pode continuar válido até expirar; gerar outro o invalida.");
      status.textContent = "Convite cancelado. Gere outro quando quiser conectar um celular.";
    } catch {
      status.textContent = "Cancelamento não confirmado. O convite pode continuar válido até expirar; gerar outro o invalida.";
    } finally { busy = false; issue.disabled = false; }
  });

  connect.addEventListener("click", async () => {
    if (busy || !incoming) return;
    busy = true;
    connect.disabled = true;
    const token = incoming;
    incoming = null;
    renderControls();
    message.textContent = "Conectando este dispositivo…";
    try {
      const response = await window.iceplayFetch("/api/acesso/pareamento/entrar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token })
      });
      if (response.status !== 204) throw new Error(response.status === 429
        ? "Muitas tentativas. Aguarde um minuto e gere um novo QR Code."
        : response.status === 401 ? "QR Code expirado, inválido ou já utilizado. Gere outro no computador."
          : "Conexão não confirmada. Atualize a página ou gere um novo QR Code.");
      message.textContent = "Dispositivo conectado. Abrindo Visão geral…";
      window.location.assign("/dashboard");
    } catch (error) {
      message.textContent = error.name === "AbortError" || error instanceof TypeError
        ? "Conexão não confirmada. Atualize a página para conferir a sessão antes de gerar outro QR Code."
        : error.message;
    } finally {
      busy = false;
      renderControls();
    }
  });

  window.addEventListener("pagehide", () => {
    incoming = null;
    clearQr();
    confirm.hidden = true;
    connect.disabled = true;
    status.textContent = "Gere um novo QR Code para conectar outro dispositivo.";
  });
  window.addEventListener("iceplay:acesso-changed", () => {
    syncSession().catch(error => { message.textContent = error.message; });
  });
  window.addEventListener("hashchange", captureFragment);
  manual.addEventListener("toggle", () => {
    if (manual.open) window.iceplayQrReader?.stop();
  });
  window.addEventListener("pageshow", () => {
    captureFragment();
    syncSession().catch(error => { message.textContent = error.message; });
  });
  syncSession().catch(() => { message.textContent = "Não foi possível verificar o acesso. Atualize a página."; });
})();
