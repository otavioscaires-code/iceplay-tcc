"use strict";

const healthPanel = document.getElementById("health-panel");
const healthBadge = document.getElementById("health-badge");
const healthBadgeText = document.getElementById("health-badge-text");
const apiStatus = document.getElementById("api-status");
const databaseStatus = document.getElementById("database-status");
const refrigeratorCount = document.getElementById("refrigerator-count");
const healthMessage = document.getElementById("health-message");
const checkedAt = document.getElementById("checked-at");
const checkButton = document.getElementById("check-health");
const requestTimeoutMs = 8000;
let healthCheckPending = false;

function setBadge(state, text) {
  healthBadge.dataset.state = state;
  healthBadgeText.textContent = text;
}

function clearReceivedValues() {
  refrigeratorCount.textContent = "—";
  checkedAt.textContent = "Não disponível";
  checkedAt.removeAttribute("datetime");
  checkedAt.removeAttribute("title");
}

function getCheckedDate(value) {
  if (typeof value !== "string" || !value.endsWith("Z")) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function showCheckedAt(value) {
  const date = getCheckedDate(value);
  if (!date) return;
  checkedAt.dateTime = value;
  checkedAt.title = `Horário UTC recebido da API: ${value}`;
  checkedAt.textContent = date.toLocaleString("pt-BR");
}

function showFailure(apiText, databaseText, message) {
  setBadge("error", "Indisponível");
  apiStatus.textContent = apiText;
  databaseStatus.textContent = databaseText;
  healthMessage.textContent = message;
}

async function checkHealth() {
  // A página deve ser servida pelo backend para que o estado represente a API real.
  if (!["http:", "https:"].includes(window.location.protocol)) {
    clearReceivedValues();
    showFailure("Não consultada", "Não consultado", "Inicie o backend e abra o endereço HTTP da aplicação. Abrir este arquivo diretamente não permite verificar a conexão.");
    return;
  }

  if (checkButton.disabled) {
    healthCheckPending = true;
    return;
  }
  checkButton.disabled = true;
  checkButton.textContent = "Verificando…";
  healthPanel.setAttribute("aria-busy", "true");
  setBadge("loading", "Verificando");
  apiStatus.textContent = "Consultando…";
  databaseStatus.textContent = "Aguardando API…";
  clearReceivedValues();
  healthMessage.textContent = "Consultando o estado da API e a conexão com o banco.";

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await window.iceplayFetch("/api/health", {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
      signal: controller.signal
    });
    const data = await response.json();
    const isObject = data !== null && typeof data === "object";

    if (response.ok && isObject && data.status === "healthy" && data.database === "connected"
      && Number.isSafeInteger(data.refrigeratorCount) && data.refrigeratorCount >= 0
      && getCheckedDate(data.checkedAtUtc)) {
      setBadge("healthy", "Conectada");
      apiStatus.textContent = "Operacional";
      databaseStatus.textContent = "Conectado";
      refrigeratorCount.textContent = data.refrigeratorCount.toLocaleString("pt-BR");
      showCheckedAt(data.checkedAtUtc);
      healthMessage.textContent = "A API respondeu e consultou o banco com sucesso. Esta verificação não representa uma leitura de sensores.";
    } else if (response.status === 401) {
      setBadge("unknown", "Acesso necessário");
      apiStatus.textContent = "Aguardando acesso";
      databaseStatus.textContent = "Não consultado";
      healthMessage.textContent = "Conecte este dispositivo na seção Acesso para consultar o estado real do banco.";
    } else if (response.status === 503 && isObject && data.status === "unhealthy" && data.database === "unavailable") {
      showFailure("Respondeu com erro", "Indisponível", "A API respondeu, mas não conseguiu consultar o banco. Verifique o backend e tente novamente.");
      showCheckedAt(data.checkedAtUtc);
    } else {
      showFailure("Resposta inesperada", "Não confirmado", `A resposta da API não confirmou a saúde da aplicação (HTTP ${response.status}). Verifique o backend e tente novamente.`);
    }
  } catch (error) {
    if (error.name === "AbortError") {
      showFailure("Sem resposta", "Não confirmado", "A consulta excedeu 8 segundos. Verifique se o backend está em execução e tente novamente.");
    } else if (error instanceof SyntaxError) {
      showFailure("Resposta inválida", "Não confirmado", "A API não retornou uma resposta JSON válida. Verifique o endereço e o backend.");
    } else {
      showFailure("Sem conexão", "Não confirmado", "Não foi possível consultar a API. Verifique se o backend está em execução e tente novamente.");
    }
  } finally {
    window.clearTimeout(timeoutId);
    healthPanel.setAttribute("aria-busy", "false");
    checkButton.disabled = false;
    checkButton.innerHTML = 'Verificar conexão <span aria-hidden="true">↻</span>';
    if (healthCheckPending) {
      healthCheckPending = false;
      checkHealth();
    }
  }
}

checkButton.addEventListener("click", checkHealth);
window.addEventListener("iceplay:geladeiras-changed", checkHealth);
window.addEventListener("iceplay:monitoramento-consultado", checkHealth);
window.addEventListener("iceplay:acesso-changed", checkHealth);
checkHealth();
