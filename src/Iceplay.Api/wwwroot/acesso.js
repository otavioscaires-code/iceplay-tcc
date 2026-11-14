(() => {
  const section = document.getElementById("acesso-movel");
  const shortcut = document.getElementById("access-shortcut");
  const form = document.getElementById("access-form");
  const code = document.getElementById("access-code");
  const submit = document.getElementById("access-submit");
  const logout = document.getElementById("access-logout");
  const status = document.getElementById("access-status");
  const summary = document.getElementById("access-summary");
  let session = null;
  let generation = 0;
  let pendingSession = null;
  let signingIn = false;

  function updateLoginControls() {
    const locked = signingIn || !session?.autenticacaoNecessaria || session?.autenticado === true;
    if (code) code.disabled = locked;
    if (submit) submit.disabled = locked;
  }

  function showStatus(message) {
    if (status) status.textContent = message;
    if (summary) summary.textContent = message;
  }

  function returnPath() {
    // O retorno só aceita páginas próprias conhecidas; nunca uma URL externa.
    const allowed = ["/dashboard", "/geladeiras", "/historico", "/alertas", "/configuracoes", "/sobre"];
    const target = new URLSearchParams(window.location?.search ?? "").get("retorno");
    return allowed.includes(target) ? target : "/dashboard";
  }

  function renderSession(value) {
    const changed = session?.autenticado !== value.autenticado;
    session = value;
    updateLoginControls();
    if (section) section.hidden = false;
    if (shortcut) {
      shortcut.hidden = !value.autenticacaoNecessaria;
      shortcut.textContent = value.autenticado ? "Acesso do dispositivo" : "Ler QR Code / Entrar";
      shortcut.href = "/acesso?modo=qr";
    }
    if (form) form.hidden = !value.autenticacaoNecessaria || value.autenticado;
    if (logout) logout.hidden = !value.autenticacaoNecessaria || !value.autenticado;
    showStatus(!value.autenticacaoNecessaria
      ? "Acesso local neste computador. Não é necessário informar um código."
      : value.autenticado
      ? "Dispositivo conectado. Sessão válida por até 8 horas; reiniciar o servidor exige conectar novamente."
      : "Conecte este dispositivo na página Acesso para consultar os dados e gerenciar geladeiras.");
    if (changed) {
      generation++;
      window.dispatchEvent(new Event("iceplay:acesso-changed"));
    }
  }

  async function refreshSession() {
    if (pendingSession) return pendingSession;
    pendingSession = (async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch("/api/acesso", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        if (!response.ok) throw new Error("Não foi possível verificar o acesso. Atualize a página.");
        const value = await response.json();
        if (typeof value.autenticacaoNecessaria !== "boolean" || typeof value.autenticado !== "boolean"
          || value.autenticacaoNecessaria && typeof value.csrfToken !== "string") throw new Error("Resposta de acesso inválida.");
        renderSession(value);
      } finally { window.clearTimeout(timeout); }
    })();
    try { await pendingSession; } finally { pendingSession = null; }
  }

  const ready = refreshSession();
  // Todos os módulos usam a mesma sessão. Nenhuma gravação é repetida automaticamente.
  window.iceplayFetch = async (path, options = {}) => {
    if (!session) await refreshSession();
    const requestGeneration = generation;
    const headers = new Headers(options.headers);
    const method = (options.method ?? "GET").toUpperCase();
    if (session?.autenticacaoNecessaria && !["GET", "HEAD"].includes(method)) {
      headers.set("X-ICEPLAY-CSRF", session.csrfToken);
    }
    const controller = new AbortController();
    const timeout = options.signal ? null : window.setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(path, { ...options, headers, credentials: "same-origin", signal: options.signal ?? controller.signal });
    } finally { if (timeout !== null) window.clearTimeout(timeout); }
    if (requestGeneration !== generation) throw new Error("O acesso mudou durante a consulta. Consulte novamente.");
    if (response.status === 401 && session?.autenticacaoNecessaria) {
      renderSession({ ...session, autenticado: false });
    }
    return response;
  };

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    if (signingIn) return;
    const submittedCode = code.value;
    signingIn = true;
    updateLoginControls();
    showStatus("Conectando dispositivo…");
    try {
      await refreshSession();
      const response = await window.iceplayFetch("/api/acesso/entrar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo: submittedCode })
      });
      if (response.status !== 204) {
        throw new Error(response.status === 429 ? "Muitas tentativas. Aguarde um minuto antes de tentar novamente."
          : response.status === 401 ? "Código de acesso inválido. Confira o código no computador."
            : "A conexão não foi confirmada. Atualize a página e tente novamente.");
      }
      code.value = "";
      await refreshSession();
      const monitoramento = document.getElementById("monitoramento");
      if (monitoramento) monitoramento.scrollIntoView({ behavior: "auto" });
      else window.location.assign(returnPath());
    } catch (error) {
      showStatus(error.name === "AbortError" || error instanceof TypeError
        ? "Não foi possível confirmar a conexão. Verifique a rede e atualize a página antes de tentar novamente."
        : error.message);
    }
    finally { signingIn = false; updateLoginControls(); }
  });
  logout?.addEventListener("click", async () => {
    logout.disabled = true;
    try {
      const response = await window.iceplayFetch("/api/acesso/sair", { method: "POST" });
      if (response.status !== 204 && response.status !== 401) throw new Error("Não foi possível confirmar a saída. Tente novamente.");
      renderSession({ ...session, autenticado: false });
      await refreshSession();
      code?.focus();
    } catch (error) {
      showStatus(error.name === "AbortError" || error instanceof TypeError
        ? "Não foi possível confirmar a saída. Verifique a rede e tente novamente."
        : error.message);
    }
    finally { logout.disabled = false; }
  });
  ready.catch(() => {
    if (section) section.hidden = false;
    if (shortcut) shortcut.hidden = false;
    showStatus("Não foi possível verificar o acesso. Atualize a página quando a API estiver disponível ou abra a página Acesso.");
  });
})();
