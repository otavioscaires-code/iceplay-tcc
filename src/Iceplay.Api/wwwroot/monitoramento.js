import { validarMonitoramento, estadoDaLeitura, formatarIdade } from "./monitoramento-estado.mjs";

const origemSelect = document.getElementById("monitoramento-origem");
const referenciaSelect = document.getElementById("monitoramento-referencia");
const atualizarButton = document.getElementById("atualizar-monitoramento");
const origemNota = document.getElementById("monitoramento-origem-nota");
const idadeNota = document.getElementById("monitoramento-idade-nota");
const status = document.getElementById("monitoramento-status");
const resumo = document.getElementById("monitoramento-resumo");
const lista = document.getElementById("monitoramento-lista");
const consultado = document.getElementById("monitoramento-consultado");
let sequencia = 0;
let emConsulta = false;
let controlador = null;
let snapshot = null;
let recebidoNoNavegador = 0;
let estadosVisuais = [];

function elemento(tag, className, texto) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (texto !== undefined) node.textContent = texto;
  return node;
}

function mensagem(texto, estado = "info") {
  if (status.textContent !== texto) status.textContent = texto;
  status.dataset.state = estado;
}

function limparDados() {
  snapshot = null;
  estadosVisuais = [];
  lista.replaceChildren();
  resumo.textContent = "";
  consultado.textContent = "Não disponível";
  consultado.removeAttribute("datetime");
}

function atualizarNotas() {
  origemNota.textContent = origemSelect.value === "Simulacao"
    ? "Simulação selecionada: dados de teste, sem comprovar uma medição física."
    : "Hardware declarado: origem informada pelo emissor; não confirma sensor ou dispositivo autenticado.";
  const referencia = Number(referenciaSelect.value);
  idadeNota.textContent = referencia > 0
    ? `Mais de ${referencia} segundos desde a medição marca a leitura como desatualizada. Referência desta sessão; não configura limites nem gera alertas.`
    : "A idade será exibida sem classificação de recência. Esta opção não configura limites nem gera alertas.";
}

function atualizarIdades() {
  if (!snapshot) return;
  // O relógio local pode estar errado. A consulta ancora o horário do servidor;
  // performance.now mede o tempo transcorrido sem depender do relógio civil.
  const agoraServidor = Date.parse(snapshot.consultadoEmUtc) + performance.now() - recebidoNoNavegador;
  const referencia = Number(referenciaSelect.value);
  for (const visual of estadosVisuais) {
    const estado = estadoDaLeitura(visual.leitura, referencia, agoraServidor);
    visual.card.dataset.estado = estado.codigo;
    visual.estado.textContent = estado.rotulo;
    visual.estado.dataset.estado = estado.codigo;
    visual.idade.textContent = formatarIdade(estado.idadeSegundos);
  }
}

function adicionarDado(dl, titulo, valor) {
  const row = elemento("div");
  const dd = elemento("dd");
  dd.append(valor);
  row.append(elemento("dt", "", titulo), dd);
  dl.append(row);
}

function horario(value) {
  const time = elemento("time", "", new Date(value).toLocaleString("pt-BR"));
  time.dateTime = value;
  time.title = `Horário UTC recebido da API: ${value}`;
  return time;
}

function renderizar(data) {
  lista.replaceChildren();
  estadosVisuais = [];
  if (data.geladeiras.length === 0) {
    const vazio = elemento("p", "monitor-empty", "Nenhuma geladeira cadastrada. Cadastre um equipamento na seção Geladeiras para começar.");
    lista.append(vazio);
  }
  let comLeitura = 0;
  for (const geladeira of data.geladeiras) {
    const leitura = geladeira.ultimaLeitura;
    const card = elemento("article", "monitor-card");
    const header = elemento("div", "monitor-card-heading");
    header.append(elemento("h3", "", geladeira.nome), elemento("span", "monitor-source", data.origem === "Simulacao" ? "SIMULAÇÃO" : "HARDWARE DECLARADO"));
    card.append(header, elemento("p", "monitor-location", geladeira.localizacao ?? "Localização não informada"));
    const estado = elemento("p", "monitor-state");
    card.append(estado);
    const temperatura = elemento("p", "monitor-temperature", leitura ? `${leitura.temperaturaC.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} °C` : "—");
    temperatura.setAttribute("aria-label", leitura ? `Última temperatura: ${temperatura.textContent}` : "Temperatura sem dados");
    card.append(elemento("p", "monitor-caption", "Última temperatura registrada"), temperatura);
    const dl = elemento("dl", "monitor-data");
    const porta = elemento("span", "monitor-door", leitura ? (leitura.portaAberta ? "Aberta" : "Fechada") : "Sem dados");
    porta.dataset.estado = leitura ? (leitura.portaAberta ? "aberta" : "fechada") : "sem-dados";
    adicionarDado(dl, "Porta na medição", porta);
    adicionarDado(dl, "Medição (hora local)", leitura ? horario(leitura.medidoEmUtc) : elemento("span", "", "Não disponível"));
    adicionarDado(dl, "Recebimento (hora local)", leitura ? horario(leitura.recebidoEmUtc) : elemento("span", "", "Não disponível"));
    const idade = elemento("span");
    adicionarDado(dl, "Idade da medição", idade);
    card.append(dl, elemento("p", "monitor-caption", `Geladeira #${geladeira.id}${leitura ? ` · Leitura #${leitura.id}` : ""}`));
    lista.append(card);
    estadosVisuais.push({ card, estado, idade, leitura });
    if (leitura) comLeitura++;
  }
  resumo.textContent = `${data.geladeiras.length} geladeira(s) consultada(s); ${comLeitura} com leitura na origem selecionada.`;
  consultado.dateTime = data.consultadoEmUtc;
  consultado.textContent = new Date(data.consultadoEmUtc).toLocaleString("pt-BR");
  atualizarIdades();
}

async function consultar({ limpar = false, silencioso = false } = {}) {
  const minhaSequencia = ++sequencia;
  controlador?.abort();
  controlador = new AbortController();
  const meuControlador = controlador;
  const origem = origemSelect.value;
  if (limpar) limparDados();
  atualizarNotas();
  emConsulta = true;
  lista.setAttribute("aria-busy", "true");
  atualizarButton.disabled = true;
  atualizarButton.textContent = "Consultando…";
  if (!silencioso) mensagem("Consultando as últimas leituras na API…");
  const timeout = window.setTimeout(() => meuControlador.abort(), 8000);
  try {
    if (!["http:", "https:"].includes(window.location.protocol)) throw new Error("Abra a página pelo endereço HTTP da aplicação.");
    const response = await window.iceplayFetch(`/api/monitoramento?origem=${encodeURIComponent(origem)}`, {
      cache: "no-store", headers: { Accept: "application/json" }, signal: meuControlador.signal
    });
    if (!response.ok) {
      throw new Error(response.status === 401 ? "Conecte este dispositivo na seção Acesso para consultar as leituras."
        : response.status === 503
        ? "A API não conseguiu consultar o banco de dados. Tente atualizar o painel."
        : `A consulta não foi confirmada (HTTP ${response.status}). Tente atualizar o painel.`);
    }
    const data = validarMonitoramento(await response.json(), origem);
    if (minhaSequencia !== sequencia) return;
    snapshot = data;
    recebidoNoNavegador = performance.now();
    renderizar(data);
    mensagem(data.geladeiras.length ? "Consulta concluída. A recência é calculada pelo horário da medição." : "Consulta concluída. Nenhuma geladeira cadastrada.", "success");
  } catch (error) {
    if (minhaSequencia !== sequencia) return;
    limparDados();
    mensagem(error.name === "AbortError"
      ? "A consulta excedeu 8 segundos. Não foi possível confirmar as leituras; tente atualizar o painel."
      : error instanceof TypeError
        ? "Não foi possível comunicar com a API. Verifique o backend e tente atualizar o painel."
        : error instanceof SyntaxError
          ? "A API retornou uma resposta inválida. Tente atualizar o painel."
          : error.message, "error");
  } finally {
    window.clearTimeout(timeout);
    if (minhaSequencia === sequencia) {
      emConsulta = false;
      lista.setAttribute("aria-busy", "false");
      atualizarButton.disabled = false;
      atualizarButton.textContent = "Atualizar painel";
      window.dispatchEvent(new Event("iceplay:monitoramento-consultado"));
    }
  }
}

origemSelect.addEventListener("change", () => consultar({ limpar: true }));
referenciaSelect.addEventListener("change", () => { atualizarNotas(); atualizarIdades(); });
atualizarButton.addEventListener("click", () => consultar());
window.addEventListener("iceplay:geladeiras-changed", () => consultar());
window.addEventListener("iceplay:acesso-changed", () => consultar({ limpar: true }));
document.addEventListener("visibilitychange", () => { if (!document.hidden) consultar(); });
window.setInterval(() => { if (!document.hidden && !emConsulta) consultar({ silencioso: true }); }, 15000);
window.setInterval(() => { if (!document.hidden) atualizarIdades(); }, 1000);
consultar({ limpar: true });
