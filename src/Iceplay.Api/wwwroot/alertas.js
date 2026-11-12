import { filtrosDaUrl, validarFiltros, criarConsulta, validarPagina, localParaUtc } from "./alertas-estado.mjs?v=20261112-alertas";
import { criarCard, elemento } from "./alertas-render.mjs?v=20261112-alertas";
import { utcParaLocal } from "./historico-estado.mjs?v=20261109-pages";

const fields = ["geladeira", "origem", "tipo", "gravidade", "situacao", "inicio", "fim", "tamanho"];
const ui = Object.fromEntries([...fields, "form", "buscar", "status", "resumo", "lista", "anterior", "proxima", "pagina"].map(id => [id, document.getElementById(`alertas-${id}`)]));
let sequencia = 0, controller = null, ocupado = false, pagina = null, aplicado = null;
function mensagem(text, state = "info") { ui.status.textContent = text; ui.status.dataset.state = state; }
function controles() {
  ui.buscar.disabled = ocupado;
  ui.anterior.disabled = ocupado || !pagina || pagina.pagina <= 1;
  ui.proxima.disabled = ocupado || !pagina || pagina.pagina >= pagina.totalPaginas;
  ui.lista.setAttribute("aria-busy", String(ocupado));
}
function limpar(text) { pagina = null; ui.lista.replaceChildren(elemento("p", "monitor-empty", text)); ui.resumo.textContent = ""; ui.pagina.textContent = "Nenhuma página consultada."; }
function cancelar() { sequencia++; controller?.abort(); ocupado = false; controles(); }
function formulario(numero = 1) {
  return validarFiltros({ geladeiraId: ui.geladeira.value ? Number(ui.geladeira.value) : null,
    origem: ui.origem.value || null, tipo: ui.tipo.value || null, gravidade: ui.gravidade.value || null,
    situacao: ui.situacao.value || null, inicioUtc: localParaUtc(ui.inicio.value), fimUtc: localParaUtc(ui.fim.value),
    pagina: numero, tamanhoPagina: Number(ui.tamanho.value) });
}
function erro(response) { return new Error(response.status === 401 ? "Conecte este dispositivo na página Acesso."
  : response.status === 404 ? "A geladeira selecionada não existe. Recarregue a página."
    : response.status === 400 ? "Confira os filtros e o período. A API recusou a consulta."
      : response.status === 503 ? "O banco está indisponível. Nenhuma contagem foi confirmada."
        : `Consulta não concluída (HTTP ${response.status}).`); }
async function consultar(filtros) {
  validarFiltros(filtros);
  const seq = ++sequencia;
  controller?.abort(); controller = new AbortController(); const current = controller;
  ocupado = true; aplicado = Object.freeze({ ...filtros }); limpar("Consultando ocorrências…"); controles(); mensagem("Consultando alertas na API…");
  const timeout = window.setTimeout(() => current.abort(), 8000);
  try {
    const query = criarConsulta(filtros);
    const response = await window.iceplayFetch(`/api/alertas?${query}`, { cache: "no-store", signal: current.signal });
    if (seq !== sequencia) return;
    if (!response.ok) throw erro(response);
    const data = validarPagina(await response.json(), filtros);
    if (seq !== sequencia) return;
    pagina = data; ui.lista.replaceChildren(...data.itens.map(a => criarCard(a)));
    if (!data.itens.length) ui.lista.append(elemento("p", "monitor-empty", data.totalItens ? "Não há ocorrências nesta página. Volte à anterior." : "Nenhuma ocorrência encontrada para estes filtros. Confira em Configurações quais equipamentos estão monitorados."));
    ui.resumo.textContent = `${data.totalItens} ocorrência(s); ${data.itens.length} nesta página. Datas no horário local.`;
    ui.pagina.textContent = data.totalPaginas ? `Página ${data.pagina} de ${data.totalPaginas}` : "Sem páginas de resultados.";
    window.history.replaceState(null, "", `/alertas?${query}`);
    mensagem("Consulta concluída. Encerramento e normalização são distinguidos pelo motivo.", "success");
  } catch (error) {
    if (seq !== sequencia) return;
    limpar("Ocorrências indisponíveis. Nenhum dado anterior foi mantido.");
    mensagem(error.name === "AbortError" ? "A consulta excedeu 8 segundos. Tente novamente."
      : error instanceof TypeError ? "Sem comunicação com a API. Confira o servidor e a rede." : error.message, "error");
  } finally { window.clearTimeout(timeout); if (seq === sequencia) { ocupado = false; controles(); } }
}
async function iniciar() {
  cancelar(); aplicado = null; limpar("Consultando equipamentos…"); ocupado = true; controles();
  const seq = ++sequencia; controller = new AbortController(); const current = controller;
  const timeout = window.setTimeout(() => current.abort(), 8000);
  try {
    const f = filtrosDaUrl(window.location.search);
    const response = await window.iceplayFetch("/api/geladeiras", { cache: "no-store", signal: current.signal });
    if (seq !== sequencia) return;
    if (!response.ok) throw erro(response);
    const values = await response.json();
    if (seq !== sequencia) return;
    if (!Array.isArray(values) || values.some(g => !g || !Number.isInteger(g.id) || g.id < 1 || typeof g.nome !== "string")
      || new Set(values.map(g => g.id)).size !== values.length) throw new Error("Lista de equipamentos inválida.");
    ui.geladeira.replaceChildren();
    const all = elemento("option", "", "Todas as geladeiras"); all.value = ""; ui.geladeira.append(all);
    for (const g of values) { const option = elemento("option", "", `${g.nome} · #${g.id}`); option.value = String(g.id); ui.geladeira.append(option); }
    if (f.geladeiraId && !values.some(g => g.id === f.geladeiraId)) throw new Error("A geladeira da URL não está cadastrada.");
    ui.geladeira.value = f.geladeiraId === null ? "" : String(f.geladeiraId);
    for (const key of ["origem", "tipo", "gravidade", "situacao"]) ui[key].value = f[key] ?? "";
    ui.inicio.value = utcParaLocal(f.inicioUtc); ui.fim.value = utcParaLocal(f.fimUtc);
    if (![20, 50, 100].includes(f.tamanhoPagina)) { const option = elemento("option", "", String(f.tamanhoPagina)); option.value = String(f.tamanhoPagina); ui.tamanho.append(option); }
    ui.tamanho.value = String(f.tamanhoPagina);
    await consultar(f);
  } catch (error) { if (seq === sequencia) { limpar("Consulta não disponível."); mensagem(error.message, "error"); } }
  finally { window.clearTimeout(timeout); if (seq === sequencia) { ocupado = false; controles(); } }
}
ui.form.addEventListener("submit", event => { event.preventDefault(); try { consultar(formulario()); } catch (error) { cancelar(); aplicado = null; limpar("Confira os filtros."); mensagem(error.message, "error"); } });
for (const name of ["input", "change"]) ui.form.addEventListener(name, () => { cancelar(); aplicado = null; limpar("Filtros alterados. Selecione Buscar alertas."); mensagem("Aplique os filtros para consultar novamente."); });
ui.anterior.addEventListener("click", () => { if (pagina && pagina.pagina > 1) consultar({ ...aplicado, pagina: pagina.pagina - 1 }); });
ui.proxima.addEventListener("click", () => { if (pagina && pagina.pagina < pagina.totalPaginas) consultar({ ...aplicado, pagina: pagina.pagina + 1 }); });
window.addEventListener("iceplay:acesso-changed", iniciar);
window.addEventListener("pagehide", cancelar);
window.setInterval(() => { if (!document.hidden && aplicado && !ocupado) consultar(aplicado); }, 15000);
iniciar();
