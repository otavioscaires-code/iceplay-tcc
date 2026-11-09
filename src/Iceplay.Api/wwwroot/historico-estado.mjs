const origens = ["Simulacao", "Hardware"];
const maxInt = 2147483647;

export function instanteUtcValido(value) {
  if (typeof value !== "string" || value.startsWith("0000") || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 19) === value.slice(0, 19);
}

// Date no navegador tem precisão de milissegundos. Para validar ordem/filtros,
// a comparação textual normalizada preserva as sete casas aceitas pela API.
function chaveUtc(value) {
  return `${value.slice(0, 19)}.${(value.split(".")[1]?.slice(0, -1) ?? "").padEnd(7, "0")}Z`;
}

export function dataLocalParaUtc(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) throw new Error("Informe data e hora válidas para o período.");
  const date = new Date(value);
  const fields = value.match(/\d+/g).map(Number);
  if (!Number.isFinite(date.getTime()) || fields[0] < 1 || date.getFullYear() !== fields[0] || date.getMonth() + 1 !== fields[1]
    || date.getDate() !== fields[2] || date.getHours() !== fields[3] || date.getMinutes() !== fields[4]
    || date.getSeconds() !== (fields[5] ?? 0)) throw new Error("A data ou hora local informada não existe.");
  return date.toISOString();
}

export function utcParaLocal(value) {
  if (value === null || value === "") return "";
  if (!instanteUtcValido(value)) throw new Error("O período da URL precisa estar em UTC com sufixo Z.");
  const d = new Date(value);
  const pad = (number, count = 2) => String(number).padStart(count, "0");
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export function validarFiltros(filtros) {
  if (!Number.isSafeInteger(filtros.geladeiraId) || filtros.geladeiraId < 1 || filtros.geladeiraId > maxInt)
    throw new Error("Selecione uma geladeira para consultar.");
  if (!origens.includes(filtros.origem)) throw new Error("Selecione Simulação ou Hardware declarado.");
  if (!Number.isInteger(filtros.pagina) || filtros.pagina < 1 || filtros.pagina > maxInt
    || !Number.isInteger(filtros.tamanhoPagina) || filtros.tamanhoPagina < 1 || filtros.tamanhoPagina > 100
    || (filtros.pagina - 1) * filtros.tamanhoPagina > maxInt) throw new Error("A paginação informada é inválida.");
  for (const value of [filtros.inicioUtc, filtros.fimUtc]) {
    if (value !== null && !instanteUtcValido(value)) throw new Error("Informe instantes UTC válidos para o período.");
  }
  if (filtros.inicioUtc && filtros.fimUtc && chaveUtc(filtros.inicioUtc) > chaveUtc(filtros.fimUtc))
    throw new Error("O início do período não pode ser posterior ao fim.");
  return filtros;
}

export function filtrosDoFormulario({ geladeiraId, origem, inicio, fim, tamanhoPagina }, pagina = 1) {
  return validarFiltros({ geladeiraId: Number(geladeiraId), origem, inicioUtc: dataLocalParaUtc(inicio),
    fimUtc: dataLocalParaUtc(fim), tamanhoPagina: Number(tamanhoPagina), pagina });
}

export function criarConsulta(filtros) {
  validarFiltros(filtros);
  const query = new URLSearchParams({ geladeiraId: String(filtros.geladeiraId), origem: filtros.origem,
    pagina: String(filtros.pagina), tamanhoPagina: String(filtros.tamanhoPagina) });
  if (filtros.inicioUtc) query.set("inicioUtc", filtros.inicioUtc);
  if (filtros.fimUtc) query.set("fimUtc", filtros.fimUtc);
  return query;
}

export function validarHistorico(data, filtros) {
  validarFiltros(filtros);
  const invalid = () => { throw new Error("A API retornou um histórico incompatível com a consulta."); };
  if (!data || data.geladeiraId !== filtros.geladeiraId || data.origem !== filtros.origem || data.pagina !== filtros.pagina
    || data.tamanhoPagina !== filtros.tamanhoPagina || !Number.isSafeInteger(data.totalItens) || data.totalItens < 0
    || !Number.isSafeInteger(data.totalPaginas) || data.totalPaginas !== Math.ceil(data.totalItens / filtros.tamanhoPagina)
    || !Array.isArray(data.itens)) invalid();
  for (const field of ["inicioUtc", "fimUtc"]) {
    if (filtros[field] === null ? data[field] !== null : !instanteUtcValido(data[field]) || chaveUtc(data[field]) !== chaveUtc(filtros[field])) invalid();
  }
  const expected = Math.max(0, Math.min(filtros.tamanhoPagina, data.totalItens - (filtros.pagina - 1) * filtros.tamanhoPagina));
  if (data.itens.length !== expected) invalid();
  const ids = new Set();
  let previous = null;
  for (const item of data.itens) {
    if (!item || !Number.isSafeInteger(item.id) || item.id < 1 || ids.has(item.id) || item.geladeiraId !== filtros.geladeiraId
      || item.origem !== filtros.origem || typeof item.temperaturaC !== "number" || !Number.isFinite(item.temperaturaC)
      || typeof item.portaAberta !== "boolean" || !instanteUtcValido(item.medidoEmUtc) || !instanteUtcValido(item.recebidoEmUtc)) invalid();
    const measured = chaveUtc(item.medidoEmUtc);
    if (measured > chaveUtc(item.recebidoEmUtc) || filtros.inicioUtc && measured < chaveUtc(filtros.inicioUtc)
      || filtros.fimUtc && measured > chaveUtc(filtros.fimUtc)) invalid();
    if (previous && (measured > chaveUtc(previous.medidoEmUtc) || measured === chaveUtc(previous.medidoEmUtc) && item.id >= previous.id)) invalid();
    ids.add(item.id);
    previous = item;
  }
  return data;
}

export function calcularSerie(itens, largura = 760, altura = 280) {
  if (!Array.isArray(itens) || !Number.isFinite(largura) || !Number.isFinite(altura) || largura < 160 || altura < 120) throw new Error("Série de gráfico inválida.");
  if (!itens.length) return { pontos: [], minimo: null, maximo: null, escalaMinima: null, escalaMaxima: null };
  if (itens.some(item => !item || !Number.isFinite(item.temperaturaC) || !instanteUtcValido(item.medidoEmUtc))) throw new Error("Série de gráfico inválida.");
  const sorted = [...itens].sort((a, b) => chaveUtc(a.medidoEmUtc).localeCompare(chaveUtc(b.medidoEmUtc)) || a.id - b.id);
  const values = sorted.map(item => item.temperaturaC);
  const minimo = Math.min(...values), maximo = Math.max(...values);
  let escalaMinima = minimo, escalaMaxima = maximo;
  // A margem é somente visual: não altera os valores medidos nem define limites de alerta.
  if (minimo === maximo) {
    const margem = Math.max(Math.abs(minimo) * .05, .5);
    escalaMinima = Math.max(-Number.MAX_VALUE, minimo - margem);
    escalaMaxima = Math.min(Number.MAX_VALUE, maximo + margem);
  }
  // Normalização evita overflow até para doubles finitos fora da faixa física.
  const scale = Math.max(Math.abs(escalaMinima), Math.abs(escalaMaxima), 1);
  const normalizedMin = escalaMinima / scale, normalizedMax = escalaMaxima / scale;
  const first = Date.parse(sorted[0].medidoEmUtc), last = Date.parse(sorted.at(-1).medidoEmUtc);
  const pontos = sorted.map(item => ({ ...item,
    x: first === last ? largura / 2 : 80 + (Date.parse(item.medidoEmUtc) - first) / (last - first) * (largura - 104),
    y: 30 + (normalizedMax - item.temperaturaC / scale) / (normalizedMax - normalizedMin) * (altura - 80)
  }));
  return { pontos, minimo, maximo, escalaMinima, escalaMaxima };
}
