import { filtrosDoFormulario, validarFiltros, criarConsulta, validarHistorico, calcularSerie, utcParaLocal } from "./historico-estado.mjs?v=20261109-pages";

const ids = ["form", "geladeira", "origem", "inicio", "fim", "tamanho", "buscar", "status", "resumo", "tabela", "grafico", "anterior", "proxima", "pagina", "listagem"];
const ui = Object.fromEntries(ids.map(id => [id, document.getElementById(`historico-${id}`)]));
let sequencia = 0, controlador = null, ocupado = false, equipamentosDisponiveis = false;
let aplicado = null, paginaRecebida = null;

function elemento(tag, className = "", text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function mensagem(text, state = "info") { ui.status.textContent = text; ui.status.dataset.state = state; }
function atualizarControles() {
  for (const field of [ui.geladeira, ui.origem, ui.inicio, ui.fim, ui.tamanho]) field.disabled = !equipamentosDisponiveis;
  ui.geladeira.disabled = ocupado || !equipamentosDisponiveis;
  ui.buscar.disabled = ocupado || !equipamentosDisponiveis;
  ui.anterior.disabled = ocupado || !paginaRecebida || paginaRecebida.pagina <= 1 || paginaRecebida.totalPaginas === 0;
  ui.proxima.disabled = ocupado || !paginaRecebida || paginaRecebida.pagina >= paginaRecebida.totalPaginas;
  ui.listagem.setAttribute("aria-busy", String(ocupado));
}
function limpar(text = "Nenhuma consulta disponível.") {
  paginaRecebida = null;
  ui.tabela.replaceChildren();
  const row = elemento("tr"), cell = elemento("td", "history-empty", text);
  cell.colSpan = 7; row.append(cell); ui.tabela.append(row);
  ui.grafico.replaceChildren(elemento("p", "monitor-empty", text));
  ui.resumo.textContent = ""; ui.pagina.textContent = "Página ainda não consultada.";
}
function cancelar() { sequencia++; controlador?.abort(); ocupado = false; atualizarControles(); }
function horario(value) {
  const node = elemento("time", "", new Date(value).toLocaleString("pt-BR"));
  node.dateTime = value; node.title = `UTC: ${value}`;
  return node;
}
function numero(value) {
  return Math.abs(value) >= 100000 || value !== 0 && Math.abs(value) < .001 ? value.toExponential(2) : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
function svgElement(tag, attrs = {}, text) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
function renderizarGrafico(itens) {
  if (!itens.length) { ui.grafico.replaceChildren(elemento("p", "monitor-empty", "Sem leituras nesta página para desenhar o gráfico.")); return; }
  const largura = Math.max(240, Math.min(960, ui.grafico.clientWidth || 760));
  const direita = largura - 24;
  const serie = calcularSerie(itens, largura);
  const svg = svgElement("svg", { viewBox: `0 0 ${largura} 280`, role: "img", "aria-labelledby": "historico-grafico-titulo historico-grafico-descricao", class: "history-chart" });
  svg.append(svgElement("title", { id: "historico-grafico-titulo" }, "Temperaturas das leituras da página atual"),
    svgElement("desc", { id: "historico-grafico-descricao" }, `${itens.length} leitura(s), em ordem do horário de medição. Valores e datas completos também disponíveis na tabela. A linha conecta as amostras exibidas e não representa medições entre elas. A escala vertical é visual e não define limites de alerta.`));
  svg.append(svgElement("path", { d: `M80 30V230H${direita}`, class: "chart-axis", fill: "none" }));
  svg.append(svgElement("text", { x: 70, y: 34, "text-anchor": "end", class: "chart-label" }, `${numero(serie.escalaMaxima)} °C`),
    svgElement("text", { x: 70, y: 230, "text-anchor": "end", class: "chart-label" }, `${numero(serie.escalaMinima)} °C`));
  if (serie.pontos.length > 1) svg.append(svgElement("polyline", { points: serie.pontos.map(point => `${point.x},${point.y}`).join(" "), class: "chart-line", fill: "none" }));
  for (const point of serie.pontos) {
    const circle = svgElement("circle", { cx: point.x, cy: point.y, r: 4, class: "chart-point" });
    circle.append(svgElement("title", {}, `Leitura #${point.id}: ${numero(point.temperaturaC)} °C; ${new Date(point.medidoEmUtc).toLocaleString("pt-BR")}; UTC: ${point.medidoEmUtc}`));
    svg.append(circle);
  }
  const rotuloHorario = value => largura < 560
    ? new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : new Date(value).toLocaleString("pt-BR");
  const primeiro = serie.pontos[0], ultimo = serie.pontos.at(-1);
  if (Date.parse(primeiro.medidoEmUtc) === Date.parse(ultimo.medidoEmUtc)) {
    svg.append(svgElement("text", { x: primeiro.x, y: 261, "text-anchor": "middle", class: "chart-label" }, rotuloHorario(primeiro.medidoEmUtc)));
  } else {
    svg.append(svgElement("text", { x: 80, y: 261, class: "chart-label" }, rotuloHorario(primeiro.medidoEmUtc)),
      svgElement("text", { x: direita, y: 261, "text-anchor": "end", class: "chart-label" }, rotuloHorario(ultimo.medidoEmUtc)));
  }
  ui.grafico.replaceChildren(svg);
}
function renderizar(data) {
  ui.tabela.replaceChildren();
  for (const item of data.itens) {
    const row = elemento("tr");
    const values = [`#${item.id}`, `#${item.geladeiraId}`, `${numero(item.temperaturaC)} °C`, item.portaAberta ? "Aberta" : "Fechada",
      horario(item.medidoEmUtc), horario(item.recebidoEmUtc), item.origem === "Simulacao" ? "Simulação" : "Hardware declarado"];
    for (const value of values) { const cell = elemento("td"); cell.append(value); row.append(cell); }
    ui.tabela.append(row);
  }
  if (!data.itens.length) {
    const row = elemento("tr"), cell = elemento("td", "history-empty", data.totalItens ? "Não há leituras nesta página. Volte à página anterior." : "Nenhuma leitura encontrada para os filtros selecionados.");
    cell.colSpan = 7; row.append(cell); ui.tabela.append(row);
  }
  renderizarGrafico(data.itens);
  ui.resumo.textContent = `${data.totalItens} leitura(s) no filtro; ${data.itens.length} nesta página. Origem: ${data.origem === "Simulacao" ? "Simulação" : "Hardware declarado"}.`;
  ui.pagina.textContent = data.totalPaginas ? `Página ${data.pagina} de ${data.totalPaginas}` : "Nenhuma página de resultados.";
  paginaRecebida = data;
}
function erroConsulta(response) {
  return new Error(response.status === 401 ? "Conecte este dispositivo na página Acesso para consultar o histórico."
    : response.status === 404 ? "A geladeira não existe mais. Atualize a página para consultar os equipamentos disponíveis."
      : response.status === 400 ? "A API recusou os filtros. Confira o equipamento, o período e a paginação."
        : response.status === 503 ? "O banco está indisponível. Tente consultar novamente."
          : `Não foi possível consultar o histórico (HTTP ${response.status}).`);
}
async function consultar(filtros) {
  validarFiltros(filtros);
  const seq = ++sequencia;
  controlador?.abort(); controlador = new AbortController();
  const signal = controlador.signal;
  aplicado = Object.freeze({ ...filtros }); ocupado = true;
  limpar("Consultando leituras…"); atualizarControles(); mensagem("Consultando o histórico na API…");
  const timeout = window.setTimeout(() => controlador?.signal === signal && controlador.abort(), 8000);
  try {
    const query = criarConsulta(filtros);
    const response = await window.iceplayFetch(`/api/leituras?${query}`, { cache: "no-store", signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw erroConsulta(response);
    const data = validarHistorico(await response.json(), filtros);
    if (seq !== sequencia) return;
    renderizar(data);
    window.history.replaceState(null, "", `/historico?${query}`);
    mensagem(data.itens.length ? "Histórico consultado. O gráfico mostra somente as leituras desta página." : "Consulta concluída sem leituras nesta página.", "success");
  } catch (error) {
    if (seq !== sequencia) return;
    limpar("Histórico indisponível. Nenhum valor anterior foi mantido.");
    mensagem(error.name === "AbortError" ? "A consulta excedeu 8 segundos. Tente novamente."
      : error instanceof TypeError ? "Não foi possível comunicar com a API. Verifique o servidor e a rede."
        : error instanceof SyntaxError ? "A API devolveu uma resposta inválida." : error.message, "error");
  } finally {
    window.clearTimeout(timeout);
    if (seq === sequencia) { ocupado = false; atualizarControles(); }
  }
}
function lerFormulario(pagina = 1) {
  return filtrosDoFormulario({ geladeiraId: ui.geladeira.value, origem: ui.origem.value,
    inicio: ui.inicio.value, fim: ui.fim.value, tamanhoPagina: ui.tamanho.value }, pagina);
}
async function iniciar() {
  const parametros = new URLSearchParams(window.location.search);
  const seq = ++sequencia;
  controlador?.abort(); controlador = new AbortController();
  const signal = controlador.signal;
  ocupado = true; equipamentosDisponiveis = false; aplicado = null;
  limpar("Consultando equipamentos…"); atualizarControles(); mensagem("Consultando as geladeiras disponíveis…");
  const timeout = window.setTimeout(() => controlador?.signal === signal && controlador.abort(), 8000);
  try {
    const response = await window.iceplayFetch("/api/geladeiras", { cache: "no-store", signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw erroConsulta(response);
    const values = await response.json();
    if (seq !== sequencia) return;
    if (!Array.isArray(values) || values.some(item => !item || !Number.isSafeInteger(item.id) || item.id < 1 || typeof item.nome !== "string" || !item.nome.trim())
      || new Set(values.map(item => item.id)).size !== values.length) throw new Error("A API devolveu uma lista de equipamentos inválida.");
    ui.geladeira.replaceChildren();
    for (const item of values) { const option = elemento("option", "", `${item.nome} · #${item.id}`); option.value = String(item.id); ui.geladeira.append(option); }
    if (!values.length) {
      const option = elemento("option", "", "Nenhuma geladeira cadastrada"); option.value = ""; ui.geladeira.append(option);
      limpar("Cadastre uma geladeira para consultar seu histórico."); mensagem("Não há geladeiras cadastradas. Acesse Geladeiras para começar.");
      return;
    }
    equipamentosDisponiveis = true;
    const requestedId = parametros.get("geladeiraId");
    if (requestedId && !values.some(item => String(item.id) === requestedId)) throw new Error("A geladeira indicada na URL não está na lista. Selecione um equipamento e consulte novamente.");
    if (requestedId) ui.geladeira.value = requestedId;
    if (parametros.has("origem")) ui.origem.value = parametros.get("origem");
    ui.inicio.step = ui.fim.step = "0.001";
    ui.inicio.value = utcParaLocal(parametros.get("inicioUtc"));
    ui.fim.value = utcParaLocal(parametros.get("fimUtc"));
    if (parametros.has("tamanhoPagina")) ui.tamanho.value = parametros.get("tamanhoPagina");
    const filtros = lerFormulario(parametros.has("pagina") ? Number(parametros.get("pagina")) : 1);
    // Ao abrir um link externo, preservar a precisão UTC integral dos filtros.
    if (parametros.has("inicioUtc")) filtros.inicioUtc = parametros.get("inicioUtc");
    if (parametros.has("fimUtc")) filtros.fimUtc = parametros.get("fimUtc");
    validarFiltros(filtros);
    await consultar(filtros);
  } catch (error) {
    if (seq !== sequencia) return;
    limpar("A consulta ainda não está disponível.");
    mensagem(error.name === "AbortError" ? "A consulta de equipamentos excedeu 8 segundos. Atualize a página."
      : error instanceof TypeError ? "Não foi possível comunicar com a API. Atualize a página quando o servidor estiver disponível." : error.message, "error");
  } finally {
    window.clearTimeout(timeout);
    if (seq === sequencia) { ocupado = false; atualizarControles(); }
  }
}

ui.form.addEventListener("submit", event => {
  event.preventDefault();
  try { consultar(lerFormulario()); }
  catch (error) { cancelar(); aplicado = null; limpar(); atualizarControles(); mensagem(error.message, "error"); }
});
for (const event of ["input", "change"]) ui.form.addEventListener(event, () => {
  if (!equipamentosDisponiveis) return;
  cancelar(); aplicado = null; limpar("Filtros alterados. Consulte novamente para exibir as leituras."); atualizarControles();
  mensagem("Filtros alterados. Selecione Buscar leituras para aplicar.");
});
ui.anterior.addEventListener("click", () => {
  if (ocupado || !aplicado || !paginaRecebida) return;
  consultar({ ...aplicado, pagina: Math.max(1, Math.min(aplicado.pagina - 1, paginaRecebida.totalPaginas)) });
});
ui.proxima.addEventListener("click", () => { if (!ocupado && aplicado && paginaRecebida && aplicado.pagina < paginaRecebida.totalPaginas) consultar({ ...aplicado, pagina: aplicado.pagina + 1 }); });
window.addEventListener("iceplay:acesso-changed", iniciar);
window.addEventListener("pagehide", cancelar);
window.addEventListener("resize", () => { if (paginaRecebida) renderizarGrafico(paginaRecebida.itens); });
iniciar();
