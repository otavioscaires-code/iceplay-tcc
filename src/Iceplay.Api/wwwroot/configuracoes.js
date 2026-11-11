import { parametrosDoFormulario, validarRespostaConfiguracao } from "./configuracoes-estado.mjs?v=20261109-config";

const ids = ["form", "geladeira", "recarregar", "campos", "minima", "maxima", "porta", "ausencia", "origem", "ativo", "salvar", "status", "resumo", "inicio", "atualizacao"];
const ui = Object.fromEntries(ids.map(id => [id, document.getElementById(`configuracao-${id}`)]));
const editaveis = [ui.minima, ui.maxima, ui.porta, ui.ausencia, ui.origem, ui.ativo];
let sequencia = 0, controlador = null, ocupado = "", pronta = false, equipamentoId = null, equipamentos = [];

function mensagem(text, state = "info") { ui.status.textContent = text; ui.status.dataset.state = state; }
function atualizarControles() {
  const locked = !!ocupado || !pronta;
  ui.campos.disabled = locked;
  for (const field of editaveis) field.disabled = locked;
  ui.salvar.disabled = locked;
  ui.geladeira.disabled = !equipamentos.length || ocupado === "lista" || ocupado === "salvar";
  ui.recarregar.disabled = ocupado === "lista" || ocupado === "salvar";
  ui.form.setAttribute("aria-busy", String(!!ocupado));
  ui.salvar.textContent = ocupado === "salvar" ? "Salvando…" : "Salvar configurações";
}
function horario(node, value) {
  node.textContent = value ? new Date(value).toLocaleString("pt-BR") : "Não definido";
  if (value) { node.dateTime = value; node.title = `UTC: ${value}`; }
  else { node.removeAttribute("datetime"); node.removeAttribute("title"); }
}
function limpar() {
  for (const field of editaveis) field.value = "";
  ui.ativo.checked = false;
  ui.resumo.textContent = "Nenhuma configuração confirmada nesta consulta.";
  horario(ui.inicio, null); horario(ui.atualizacao, null);
  pronta = false; equipamentoId = null;
}
function renderizar(data) {
  limpar();
  const value = data.configuracao;
  if (value) {
    ui.minima.value = String(value.temperaturaMinimaC); ui.maxima.value = String(value.temperaturaMaximaC);
    ui.porta.value = String(value.toleranciaPortaAbertaSegundos); ui.ausencia.value = String(value.ausenciaLeiturasSegundos);
    ui.origem.value = value.origemMonitorada; ui.ativo.checked = value.monitoramentoAtivo;
    const origem = value.origemMonitorada === "Simulacao" ? "Simulação" : "Hardware declarado";
    ui.resumo.textContent = `Configuração salva para a geladeira #${data.geladeiraId}. Origem: ${origem}. Habilitação planejada: ${value.monitoramentoAtivo ? "ativa" : "inativa"}. A geração de alertas ainda não está implementada.`;
    horario(ui.inicio, value.inicioMonitoramentoEmUtc); horario(ui.atualizacao, value.atualizadoEmUtc);
  } else ui.resumo.textContent = `A geladeira #${data.geladeiraId} ainda não possui configuração. Preencha os parâmetros; nenhum limite foi presumido.`;
  equipamentoId = data.geladeiraId; pronta = true;
}
function iniciarOperacao(tipo) {
  const seq = ++sequencia;
  controlador?.abort(); controlador = new AbortController(); ocupado = tipo;
  return { seq, controller: controlador };
}
async function requisitar(path, controller, options = {}) {
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    return await window.iceplayFetch(path, { cache: "no-store", ...options, signal: controller.signal,
      headers: { Accept: "application/json", ...options.headers } });
  } finally { window.clearTimeout(timeout); }
}
function erroHttp(response) {
  const error = new Error(response.status === 401 ? "Conecte este dispositivo na página Acesso para consultar ou salvar configurações."
    : response.status === 404 ? "A geladeira não existe mais. Recarregue a lista de equipamentos."
      : response.status === 400 ? "A API recusou os valores. Confira limites, tempos e origem."
        : response.status === 503 ? "O banco de dados está indisponível. Recarregue para confirmar os parâmetros."
          : `A operação não foi confirmada (HTTP ${response.status}). Recarregue os dados.`);
  error.httpStatus = response.status;
  return error;
}
function erroConsulta(error) {
  return error.name === "AbortError" ? "A consulta excedeu 8 segundos. Selecione Recarregar dados para tentar novamente."
    : error instanceof TypeError ? "Não foi possível comunicar com a API. Verifique o servidor e recarregue os dados."
      : error instanceof SyntaxError ? "A API devolveu uma resposta inválida. Recarregue os dados." : error.message;
}
async function carregarConfiguracao(id) {
  if (!equipamentos.some(item => item.id === id)) return;
  const { seq, controller } = iniciarOperacao("configuracao");
  limpar(); atualizarControles(); mensagem("Consultando a configuração salva…");
  try {
    const response = await requisitar(`/api/geladeiras/${id}/configuracao`, controller);
    if (seq !== sequencia) return;
    if (!response.ok) throw erroHttp(response);
    const data = await response.json();
    if (seq !== sequencia) return;
    renderizar(validarRespostaConfiguracao(data, id));
    mensagem(data.configuracao ? "Configuração consultada na API." : "Nenhuma configuração salva. Informe os parâmetros para começar.", "success");
  } catch (error) {
    if (seq !== sequencia) return;
    limpar(); mensagem(erroConsulta(error), "error");
  } finally { if (seq === sequencia) { ocupado = ""; atualizarControles(); } }
}
async function iniciar() {
  const selected = Number(ui.geladeira.value);
  const { seq, controller } = iniciarOperacao("lista");
  equipamentos = []; limpar(); atualizarControles(); mensagem("Consultando as geladeiras disponíveis…");
  try {
    const response = await requisitar("/api/geladeiras", controller);
    if (seq !== sequencia) return;
    if (!response.ok) throw erroHttp(response);
    const values = await response.json();
    if (seq !== sequencia) return;
    if (!Array.isArray(values) || values.some(item => !item || !Number.isInteger(item.id) || item.id < 1 || item.id > 2147483647
      || typeof item.nome !== "string" || !item.nome.trim()) || new Set(values.map(item => item.id)).size !== values.length)
      throw new Error("A API devolveu uma lista de equipamentos inválida.");
    equipamentos = values; ui.geladeira.replaceChildren();
    for (const item of values) {
      const option = document.createElement("option"); option.value = String(item.id); option.textContent = `${item.nome} · #${item.id}`;
      ui.geladeira.append(option);
    }
    if (!values.length) {
      mensagem("Não há geladeiras cadastradas. Acesse Geladeiras para cadastrar um equipamento.");
      ui.resumo.textContent = "Nenhuma geladeira disponível para configurar.";
      return;
    }
    ui.geladeira.value = String(values.some(item => item.id === selected) ? selected : values[0].id);
    await carregarConfiguracao(Number(ui.geladeira.value));
  } catch (error) {
    if (seq !== sequencia) return;
    equipamentos = []; ui.geladeira.replaceChildren(); limpar(); mensagem(erroConsulta(error), "error");
  } finally { if (seq === sequencia) { ocupado = ""; atualizarControles(); } }
}
async function salvar(event) {
  event.preventDefault();
  if (ocupado || !pronta || equipamentoId !== Number(ui.geladeira.value)) return;
  let parametros;
  try {
    parametros = parametrosDoFormulario({ minima: ui.minima.value, maxima: ui.maxima.value, porta: ui.porta.value,
      ausencia: ui.ausencia.value, origem: ui.origem.value, ativo: ui.ativo.checked });
  } catch (error) { mensagem(error.message, "error"); return; }
  const id = equipamentoId;
  const { seq, controller } = iniciarOperacao("salvar");
  atualizarControles(); mensagem("Salvando os parâmetros na API…");
  try {
    const response = await requisitar(`/api/geladeiras/${id}/configuracao`, controller,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parametros) });
    if (seq !== sequencia) return;
    if (response.status !== 200 && response.status !== 201) throw erroHttp(response);
    const data = validarRespostaConfiguracao(await response.json(), id);
    if (seq !== sequencia) return;
    if (!data.configuracao || Object.entries(parametros).some(([field, value]) => data.configuracao[field] !== value))
      throw new Error("A API não confirmou os parâmetros enviados.");
    renderizar(data); mensagem("Configuração salva no banco. Esta versão ainda não gera alertas.", "success");
  } catch (error) {
    if (seq !== sequencia) return;
    if (error.httpStatus === 400) mensagem(error.message, "error");
    else {
      // Uma resposta perdida pode corresponder a um PUT já persistido. Exigir
      // leitura antes de outro envio evita repetir uma alteração às cegas.
      limpar();
      mensagem(error.httpStatus === 401 || error.httpStatus === 404 ? error.message
        : `${erroConsulta(error)} O resultado da gravação não foi confirmado; recarregue antes de tentar salvar novamente.`, "error");
    }
  } finally { if (seq === sequencia) { ocupado = ""; atualizarControles(); } }
}

ui.form.addEventListener("submit", salvar);
ui.form.addEventListener("input", () => { if (pronta && !ocupado) mensagem("Alterações ainda não salvas. Selecione Salvar configurações para enviar."); });
ui.form.addEventListener("change", () => { if (pronta && !ocupado) mensagem("Alterações ainda não salvas. Selecione Salvar configurações para enviar."); });
ui.geladeira.addEventListener("change", () => { if (ocupado !== "salvar") carregarConfiguracao(Number(ui.geladeira.value)); });
ui.recarregar.addEventListener("click", () => { if (ocupado !== "salvar") iniciar(); });
window.addEventListener("iceplay:acesso-changed", iniciar);
window.addEventListener("pagehide", () => { sequencia++; controlador?.abort(); });
iniciar();
