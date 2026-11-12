import { validarResumo } from "./alertas-estado.mjs?v=20261112-alertas";
import { criarCard, elemento } from "./alertas-render.mjs?v=20261112-alertas";

const origem = document.getElementById("monitoramento-origem"), count = document.getElementById("resumo-alertas");
const status = document.getElementById("alertas-visao-status"), lista = document.getElementById("alertas-visao-lista");
let seq = 0, controller = null;
async function atualizar() {
  const atual = ++seq, selecionada = origem.value;
  controller?.abort(); controller = new AbortController(); const current = controller;
  count.textContent = "—"; lista.replaceChildren(); status.textContent = "Consultando ocorrências…"; status.dataset.state = "info";
  const timeout = window.setTimeout(() => current.abort(), 8000);
  try {
    const response = await window.iceplayFetch(`/api/alertas/resumo?origem=${selecionada}`, { cache: "no-store", signal: current.signal });
    if (atual !== seq) return;
    if (!response.ok) throw new Error(response.status === 401 ? "Conecte este dispositivo na página Acesso para consultar alertas." : `Alertas indisponíveis (HTTP ${response.status}).`);
    const data = validarResumo(await response.json(), selecionada);
    if (atual !== seq) return;
    // Zero sem equipamentos ativos ou com avaliador parado não comprova normalidade.
    count.textContent = data.avaliador.saudavel ? String(data.abertos) : "—";
    status.textContent = !data.avaliador.saudavel ? "Avaliador sem confirmação recente. As ocorrências abaixo são registros persistidos; não confirmam a situação atual."
      : `${data.abertos} aberto(s), ${data.criticos} crítico(s). ${data.equipamentosMonitorados} equipamento(s) monitorado(s); ${data.equipamentosSemMonitoramentoNestaOrigem} sem monitoramento nesta origem. Consulta: ${new Date(data.consultadoEmUtc).toLocaleString("pt-BR")}.`;
    status.dataset.state = data.avaliador.saudavel ? "info" : "error";
    lista.replaceChildren(...data.recentes.map(a => criarCard(a, true)));
    if (!data.recentes.length) lista.append(elemento("p", "monitor-empty", "Nenhuma ocorrência registrada nesta origem. Ative os parâmetros de cada equipamento em Configurações para avaliar as regras."));
  } catch (error) {
    if (atual !== seq) return;
    count.textContent = "—"; lista.replaceChildren(); status.dataset.state = "error";
    status.textContent = error.name === "AbortError" ? "Consulta de alertas excedeu 8 segundos." : error.message;
  } finally { window.clearTimeout(timeout); }
}
origem.addEventListener("change", atualizar);
document.getElementById("atualizar-monitoramento").addEventListener("click", atualizar);
window.addEventListener("iceplay:acesso-changed", atualizar);
window.addEventListener("pagehide", () => { seq++; controller?.abort(); });
window.setInterval(() => { if (!document.hidden) atualizar(); }, 15000);
atualizar();
