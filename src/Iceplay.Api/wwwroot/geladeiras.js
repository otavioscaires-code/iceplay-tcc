"use strict";

(() => {
  const workspace = document.getElementById("equipment-workspace");
  const form = document.getElementById("geladeira-form");
  const fields = document.getElementById("geladeira-fields");
  const formTitle = document.getElementById("geladeira-form-title");
  const formMode = document.getElementById("geladeira-form-mode");
  const nomeInput = document.getElementById("geladeira-nome");
  const localizacaoInput = document.getElementById("geladeira-localizacao");
  const saveButton = document.getElementById("salvar-geladeira");
  const cancelEditButton = document.getElementById("cancelar-edicao");
  const reloadButton = document.getElementById("recarregar-geladeiras");
  const status = document.getElementById("geladeiras-status");
  const list = document.getElementById("geladeiras-lista");
  const summary = document.getElementById("geladeiras-resumo");
  const details = document.getElementById("geladeira-detalhes");
  const detailsData = document.getElementById("geladeira-detalhes-dados");
  const closeDetailsButton = document.getElementById("fechar-detalhes");
  const confirmation = document.getElementById("confirmar-exclusao");
  const confirmationName = document.getElementById("exclusao-nome");
  const confirmDeleteButton = document.getElementById("excluir-confirmar");
  const cancelDeleteButton = document.getElementById("excluir-cancelar");
  const fieldElements = {
    nome: { input: nomeInput, error: document.getElementById("nome-erro") },
    localizacao: { input: localizacaoInput, error: document.getElementById("localizacao-erro") }
  };

  let busy = false;
  let needsReload = true;
  let editingId = null;
  let pendingDelete = null;
  let deleteReturnFocus = null;

  class ApiError extends Error {
    constructor(message, httpStatus = 0, errors = null, uncertain = false) {
      super(message);
      this.httpStatus = httpStatus;
      this.errors = errors;
      this.uncertain = uncertain;
    }
  }

  function setStatus(message, state = "info") {
    status.textContent = message;
    status.dataset.state = state;
  }

  function updateControls() {
    const locked = busy || pendingDelete !== null || needsReload;
    fields.disabled = locked;
    workspace.querySelectorAll("button").forEach(button => { button.disabled = locked; });
    reloadButton.disabled = busy || pendingDelete !== null;
    cancelEditButton.disabled = busy || pendingDelete !== null;
    confirmDeleteButton.disabled = busy;
    cancelDeleteButton.disabled = busy;
    workspace.setAttribute("aria-busy", String(busy));
  }

  function setBusy(value) {
    busy = value;
    updateControls();
  }

  function clearFieldErrors() {
    Object.values(fieldElements).forEach(field => {
      field.input.removeAttribute("aria-invalid");
      field.error.textContent = "";
      field.error.hidden = true;
    });
  }

  function showFieldError(name, message) {
    const field = fieldElements[name];
    field.input.setAttribute("aria-invalid", "true");
    field.error.textContent = message;
    field.error.hidden = false;
  }

  function trimWhitespace(value) {
    // A regra inclui espaços Unicode, como no tratamento de espaços do backend.
    return value.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, "");
  }

  function validateForm() {
    clearFieldErrors();
    let firstInvalid = null;
    if (nomeInput.value.length > 100) {
      showFieldError("nome", "O nome deve ter no máximo 100 caracteres.");
      firstInvalid = nomeInput;
    } else if (!trimWhitespace(nomeInput.value)) {
      showFieldError("nome", "Informe o nome da geladeira; apenas espaços não são aceitos.");
      firstInvalid = nomeInput;
    }
    if (localizacaoInput.value.length > 200) {
      showFieldError("localizacao", "A localização deve ter no máximo 200 caracteres.");
      firstInvalid ??= localizacaoInput;
    }
    if (firstInvalid) {
      setStatus("Revise os campos indicados antes de salvar.", "error");
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  function showServerValidation(errors) {
    let firstInvalid = null;
    if (!errors || typeof errors !== "object") return firstInvalid;
    Object.entries(errors).forEach(([key, messages]) => {
      const name = key.split(".").pop().toLowerCase();
      if (!Object.hasOwn(fieldElements, name) || !Array.isArray(messages)) return;
      const message = messages.filter(value => typeof value === "string").join(" ");
      if (!message) return;
      showFieldError(name, message);
      firstInvalid ??= fieldElements[name].input;
    });
    return firstInvalid;
  }

  async function apiRequest(path, method = "GET", body = undefined) {
    if (!["http:", "https:"].includes(window.location.protocol)) {
      throw new ApiError("Inicie o backend e abra o endereço HTTP da aplicação para consultar os cadastros.");
    }
    const mutating = method !== "GET";
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
    try {
      const headers = { "Accept": "application/json" };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      const response = await window.iceplayFetch(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        if (response.status === 401) throw new ApiError("Conecte este dispositivo na seção Acesso para continuar.", 401);
        if (response.status === 400 && !problem?.errors && problem?.detail) throw new ApiError(problem.detail, 400);
        if (response.status === 400) throw new ApiError("Os dados não foram aceitos. Revise o nome e a localização.", 400, problem?.errors);
        if (response.status === 404) throw new ApiError("Geladeira não encontrada. O cadastro pode ter sido removido; recarregue a lista.", 404);
        if (response.status === 409 && method === "DELETE") {
          throw new ApiError("Esta geladeira possui leituras registradas e não pode ser excluída. O cadastro e as leituras foram preservados. Você pode continuar consultando e editando os cadastros.", 409);
        }
        if (response.status === 503) throw new ApiError("A API está temporariamente indisponível. Verifique a aplicação e recarregue a lista.", 503);
        const message = mutating
          ? `A API não confirmou a operação (HTTP ${response.status}). A alteração pode ter ocorrido; recarregue a lista antes de tentar novamente.`
          : `Não foi possível concluir a consulta (HTTP ${response.status}). Recarregue a lista para tentar novamente.`;
        throw new ApiError(message, response.status, null, mutating);
      }
      const expectedStatus = { GET: 200, POST: 201, PUT: 200, DELETE: 204 }[method];
      if (response.status !== expectedStatus) {
        throw new ApiError("A API retornou uma resposta inesperada. Recarregue a lista para verificar os cadastros.", response.status, null, mutating);
      }
      return response.status === 204 ? null : await response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const reason = error.name === "AbortError"
        ? "A consulta excedeu 8 segundos."
        : error instanceof SyntaxError
          ? "A API retornou uma resposta inválida."
          : "Não foi possível obter a resposta da API.";
      const recovery = mutating
        ? " A alteração pode ter sido salva. Recarregue a lista antes de tentar novamente; a operação não será repetida automaticamente."
        : " Verifique se o backend está em execução e tente recarregar a lista.";
      throw new ApiError(reason + recovery, 0, null, mutating);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function isRecord(value) {
    return value !== null && typeof value === "object"
      && Number.isSafeInteger(value.id) && value.id > 0
      && typeof value.nome === "string"
      && (value.localizacao === null || typeof value.localizacao === "string")
      && typeof value.criadoEmUtc === "string"
      && !Number.isNaN(new Date(value.criadoEmUtc).getTime());
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function closeDetails() {
    details.hidden = true;
    detailsData.replaceChildren();
  }

  function markListUnavailable(message) {
    needsReload = true;
    list.replaceChildren();
    summary.textContent = message;
    closeDetails();
  }

  function resetForm() {
    editingId = null;
    form.reset();
    clearFieldErrors();
    formTitle.textContent = "Cadastrar geladeira";
    formMode.textContent = "O nome é obrigatório. A localização é opcional.";
    saveButton.textContent = "Cadastrar geladeira";
    cancelEditButton.hidden = true;
  }

  function renderList(records) {
    list.replaceChildren();
    records.forEach(record => {
      const card = element("article", "equipment-card");
      card.append(element("h4", "", record.nome));
      card.append(element("p", "equipment-location", record.localizacao ?? "Localização não informada"));
      card.append(element("p", "equipment-id", `Identificador #${record.id}`));
      const actions = element("div", "equipment-actions");
      const actionDefinitions = [
        ["Consultar", () => consultRecord(record.id), ""],
        ["Editar", () => editRecord(record.id), ""],
        ["Excluir", event => openDeleteConfirmation(record, event.currentTarget), " delete-action"]
      ];
      actionDefinitions.forEach(([label, handler, extraClass]) => {
        const button = element("button", `button button-secondary button-small${extraClass}`, label);
        button.type = "button";
        button.setAttribute("aria-label", `${label} ${record.nome}`);
        button.addEventListener("click", handler);
        actions.append(button);
      });
      card.append(actions);
      list.append(card);
    });
    summary.textContent = records.length === 0
      ? "Nenhuma geladeira cadastrada. Use o formulário para cadastrar o primeiro equipamento."
      : `${records.length.toLocaleString("pt-BR")} ${records.length === 1 ? "geladeira retornada" : "geladeiras retornadas"} pela API.`;
    needsReload = false;
  }

  async function fetchAndRenderList() {
    markListUnavailable("Consultando os cadastros na API…");
    const records = await apiRequest("/api/geladeiras");
    if (!Array.isArray(records) || !records.every(isRecord)) throw new ApiError("A API retornou uma lista inválida. Nenhum cadastro foi exibido.");
    renderList(records);
    const editRemoved = editingId !== null && !records.some(record => record.id === editingId);
    if (editRemoved) resetForm();
    return editRemoved;
  }

  async function reloadList() {
    if (busy || pendingDelete !== null) return;
    setBusy(true);
    setStatus("Consultando a lista de geladeiras…");
    try {
      const editRemoved = await fetchAndRenderList();
      setStatus(editRemoved ? "Lista atualizada. O cadastro em edição não está mais disponível; o formulário foi reiniciado." : "Lista consultada com sucesso.", "success");
    } catch (error) {
      markListUnavailable("Não foi possível consultar a lista. Nenhum dado anterior está sendo exibido. Use Recarregar lista para tentar novamente.");
      setStatus(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function getRecord(id) {
    const record = await apiRequest(`/api/geladeiras/${id}`);
    if (!isRecord(record) || record.id !== id) throw new ApiError("A API retornou dados inválidos para a geladeira solicitada.");
    return record;
  }

  function handleReadError(error) {
    if (error.httpStatus === 404 || error.httpStatus === 503) {
      markListUnavailable("A lista precisa ser consultada novamente. Use Recarregar lista antes de continuar.");
    }
    setStatus(error.message, "error");
  }

  async function consultRecord(id) {
    if (busy || pendingDelete !== null || needsReload) return;
    setBusy(true);
    closeDetails();
    setStatus("Consultando os detalhes da geladeira…");
    let loaded = false;
    try {
      const record = await getRecord(id);
      const rows = [["Identificador", `#${record.id}`], ["Nome", record.nome], ["Localização", record.localizacao ?? "Não informada"]];
      rows.forEach(([label, value]) => {
        const row = element("div");
        row.append(element("dt", "", label), element("dd", "", value));
        detailsData.append(row);
      });
      const createdRow = element("div");
      const time = element("time", "", new Date(record.criadoEmUtc).toLocaleString("pt-BR"));
      time.dateTime = record.criadoEmUtc;
      time.title = `Horário UTC recebido da API: ${record.criadoEmUtc}`;
      const createdValue = element("dd");
      createdValue.append(time);
      createdRow.append(element("dt", "", "Cadastrada em (hora local)"), createdValue);
      detailsData.append(createdRow);
      details.hidden = false;
      loaded = true;
      setStatus("Geladeira consultada com sucesso. Os detalhes estão abaixo da lista.", "success");
    } catch (error) {
      handleReadError(error);
    } finally {
      setBusy(false);
      if (loaded) details.focus();
    }
  }

  async function editRecord(id) {
    if (busy || pendingDelete !== null || needsReload) return;
    setBusy(true);
    closeDetails();
    setStatus("Consultando a geladeira para edição…");
    let loaded = false;
    try {
      const record = await getRecord(id);
      clearFieldErrors();
      editingId = record.id;
      nomeInput.value = record.nome;
      localizacaoInput.value = record.localizacao ?? "";
      formTitle.textContent = "Editar geladeira";
      formMode.textContent = `Editando o cadastro #${record.id}. O identificador e a data de criação são preservados.`;
      saveButton.textContent = "Salvar alterações";
      cancelEditButton.hidden = false;
      loaded = true;
      setStatus("Cadastro carregado no formulário. Altere os campos e salve, ou cancele a edição.");
    } catch (error) {
      handleReadError(error);
    } finally {
      setBusy(false);
      if (loaded) nomeInput.focus();
    }
  }

  async function refreshAfterChange(message) {
    window.dispatchEvent(new Event("iceplay:geladeiras-changed"));
    try {
      await fetchAndRenderList();
      setStatus(message, "success");
    } catch (error) {
      markListUnavailable("A alteração foi confirmada, mas a lista não pôde ser atualizada. Use Recarregar lista antes de continuar.");
      setStatus(`${message} A atualização da lista falhou. ${error.message}`, "error");
    }
  }

  function handleMutationError(error) {
    if (error.uncertain || error.httpStatus === 404 || error.httpStatus === 503) {
      markListUnavailable("O estado da lista precisa ser confirmado. Use Recarregar lista antes de fazer outra alteração.");
      window.dispatchEvent(new Event("iceplay:geladeiras-changed"));
    }
    setStatus(error.message, "error");
    return error.httpStatus === 400 ? showServerValidation(error.errors) : null;
  }

  async function saveRecord(event) {
    event.preventDefault();
    if (busy || pendingDelete !== null || needsReload || !validateForm()) return;
    const currentId = editingId;
    const body = { nome: trimWhitespace(nomeInput.value), localizacao: trimWhitespace(localizacaoInput.value) || null };
    setBusy(true);
    setStatus(currentId === null ? "Cadastrando geladeira…" : "Salvando as alterações…");
    let focusAfter = null;
    try {
      const record = await apiRequest(currentId === null ? "/api/geladeiras" : `/api/geladeiras/${currentId}`, currentId === null ? "POST" : "PUT", body);
      if (!isRecord(record) || (currentId !== null && record.id !== currentId)) {
        throw new ApiError("A API não confirmou os dados salvos. A alteração pode ter ocorrido; recarregue a lista antes de tentar novamente.", 0, null, true);
      }
      resetForm();
      await refreshAfterChange(currentId === null ? "Geladeira cadastrada com sucesso." : "Geladeira atualizada com sucesso.");
      focusAfter = needsReload ? reloadButton : nomeInput;
    } catch (error) {
      focusAfter = handleMutationError(error) ?? (needsReload ? reloadButton : null);
    } finally {
      setBusy(false);
      focusAfter?.focus();
    }
  }

  function openDeleteConfirmation(record, trigger) {
    if (busy || pendingDelete !== null || needsReload) return;
    pendingDelete = record;
    deleteReturnFocus = trigger;
    confirmationName.textContent = `${record.nome} · Identificador #${record.id}`;
    confirmation.hidden = false;
    updateControls();
    cancelDeleteButton.focus();
  }

  function closeDeleteConfirmation(restoreFocus = false) {
    pendingDelete = null;
    confirmation.hidden = true;
    updateControls();
    if (restoreFocus && deleteReturnFocus?.isConnected) deleteReturnFocus.focus();
    deleteReturnFocus = null;
  }

  async function deleteRecord() {
    if (busy || pendingDelete === null) return;
    const record = pendingDelete;
    setBusy(true);
    setStatus("Excluindo o cadastro da geladeira…");
    try {
      await apiRequest(`/api/geladeiras/${record.id}`, "DELETE");
      closeDeleteConfirmation();
      if (editingId === record.id) resetForm();
      await refreshAfterChange("Geladeira excluída com sucesso.");
    } catch (error) {
      closeDeleteConfirmation();
      handleMutationError(error);
    } finally {
      setBusy(false);
      reloadButton.focus();
    }
  }

  form.addEventListener("submit", saveRecord);
  reloadButton.addEventListener("click", reloadList);
  cancelEditButton.addEventListener("click", () => {
    if (busy || pendingDelete !== null) return;
    resetForm();
    updateControls();
    setStatus("Edição encerrada. O formulário está pronto para um novo cadastro.");
    if (needsReload) reloadButton.focus(); else nomeInput.focus();
  });
  closeDetailsButton.addEventListener("click", () => { closeDetails(); reloadButton.focus(); });
  confirmDeleteButton.addEventListener("click", deleteRecord);
  cancelDeleteButton.addEventListener("click", () => { if (!busy) closeDeleteConfirmation(true); });
  confirmation.addEventListener("keydown", event => {
    if (event.key === "Escape" && !busy) {
      event.preventDefault();
      closeDeleteConfirmation(true);
    }
  });

  window.addEventListener("iceplay:acesso-changed", () => {
    markListUnavailable("O acesso mudou. Consultando novamente…");
    if (!busy) { closeDeleteConfirmation(); resetForm(); reloadList(); }
  });
  reloadList();
})();
