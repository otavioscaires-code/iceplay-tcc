(() => {
  const section = document.getElementById("acesso-movel");
  const shortcut = document.getElementById("access-shortcut");
  const form = document.getElementById("access-form");
  const code = document.getElementById("access-code");
  const submit = document.getElementById("access-submit");
  const logout = document.getElementById("access-logout");
  const status = document.getElementById("access-status");
  let session = null;
  let generation = 0;
  let pendingSession = null;

  function renderSession(value) {
    const changed = session?.autenticado !== value.autenticado;
    session = value;
    section.hidden = !value.autenticacaoNecessaria;
    shortcut.hidden = !value.autenticacaoNecessaria;
    form.hidden = value.autenticado;
    logout.hidden = !value.autenticado;
    status.textContent = value.autenticado
      ? "Dispositivo conectado. Sessão válida por até 8 horas; reiniciar o servidor exige conectar novamente."
      : "Conecte este dispositivo para consultar os dados e gerenciar geladeiras.";
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

  form.addEventListener("submit", async event => {
    event.preventDefault();
    submit.disabled = true;
    status.textContent = "Conectando dispositivo…";
    try {
      await refreshSession();
      const response = await window.iceplayFetch("/api/acesso/entrar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo: code.value })
      });
      if (response.status !== 204) {
        throw new Error(response.status === 429 ? "Muitas tentativas. Aguarde um minuto antes de tentar novamente."
          : response.status === 401 ? "Código de acesso inválido. Confira o código no computador."
            : "A conexão não foi confirmada. Atualize a página e tente novamente.");
      }
      code.value = "";
      await refreshSession();
      document.getElementById("monitoramento").scrollIntoView({ behavior: "auto" });
    } catch (error) {
      status.textContent = error.name === "AbortError" || error instanceof TypeError
        ? "Não foi possível confirmar a conexão. Verifique a rede e atualize a página antes de tentar novamente."
        : error.message;
    }
    finally { submit.disabled = false; }
  });
  logout.addEventListener("click", async () => {
    logout.disabled = true;
    try {
      const response = await window.iceplayFetch("/api/acesso/sair", { method: "POST" });
      if (response.status !== 204 && response.status !== 401) throw new Error("Não foi possível confirmar a saída. Tente novamente.");
      renderSession({ ...session, autenticado: false });
      await refreshSession();
      code.focus();
    } catch (error) {
      status.textContent = error.name === "AbortError" || error instanceof TypeError
        ? "Não foi possível confirmar a saída. Verifique a rede e tente novamente."
        : error.message;
    }
    finally { logout.disabled = false; }
  });
  ready.catch(() => { status.textContent = "Não foi possível verificar o acesso. Atualize a página quando a API estiver disponível."; });
})();
