export const tipos = { TemperaturaForaFaixa: "Temperatura fora da faixa", PortaAberta: "Porta aberta", AusenciaLeituras: "Ausência de leituras" };
export const gravidades = { Atencao: "Atenção", Critico: "Crítico" };
export const motivos = { CondicaoNormalizada: "Condição normalizada por medição recente", SemDadosRecentes: "Encerrado sem dados recentes; normalização não confirmada",
  ConfiguracaoAlterada: "Configuração alterada", MonitoramentoDesativado: "Monitoramento desativado" };
const inteiro = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= min && v <= max;
function exigir(ok) { if (!ok) throw new Error("A API devolveu dados de alertas inválidos. Consulte novamente."); }
export function instanteUtc(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?Z$/.test(value)) return false;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 19) === value.slice(0, 19);
}
export function localParaUtc(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value);
  const d = new Date(value);
  if (!match || !Number.isFinite(d.getTime()) || [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()]
    .some((part, i) => part !== Number(match[i + 1] ?? 0))) throw new Error("Informe um período válido no horário local.");
  return d.toISOString();
}
export function validarFiltros(f) {
  if (f.geladeiraId !== null && !inteiro(f.geladeiraId, 1, 2147483647)) throw new Error("Selecione uma geladeira válida.");
  if (f.origem !== null && !["Simulacao", "Hardware"].includes(f.origem)) throw new Error("Selecione uma origem válida.");
  if (f.tipo !== null && !Object.hasOwn(tipos, f.tipo)) throw new Error("Selecione um tipo válido.");
  if (f.gravidade !== null && !Object.hasOwn(gravidades, f.gravidade)) throw new Error("Selecione uma gravidade válida.");
  if (f.situacao !== null && !["Aberto", "Encerrado"].includes(f.situacao)) throw new Error("Selecione uma situação válida.");
  if ([f.inicioUtc, f.fimUtc].some(v => v !== null && !instanteUtc(v))) throw new Error("Período inválido.");
  if (f.inicioUtc && f.fimUtc && Date.parse(f.inicioUtc) > Date.parse(f.fimUtc)) throw new Error("O início precisa ser anterior ou igual ao fim.");
  if (!inteiro(f.pagina, 1, 2147483647) || !inteiro(f.tamanhoPagina, 1, 100) || (f.pagina - 1) * f.tamanhoPagina > 2147483647) throw new Error("Paginação inválida.");
  return f;
}
export function filtrosDaUrl(search) {
  const p = new URLSearchParams(search);
  return validarFiltros({ geladeiraId: p.has("geladeiraId") ? Number(p.get("geladeiraId")) : null,
    origem: p.get("origem"), tipo: p.get("tipo"), gravidade: p.get("gravidade"), situacao: p.get("situacao"),
    inicioUtc: p.get("inicioUtc"), fimUtc: p.get("fimUtc"), pagina: Number(p.get("pagina") ?? 1), tamanhoPagina: Number(p.get("tamanhoPagina") ?? 20) });
}
export function criarConsulta(f) {
  validarFiltros(f);
  return new URLSearchParams(Object.entries(f).filter(([, value]) => value !== null).map(([key, value]) => [key, String(value)])).toString();
}
export function validarAlerta(a) {
  exigir(a && inteiro(a.id, 1, 2147483647) && inteiro(a.geladeiraId, 1, 2147483647) && typeof a.geladeiraNome === "string" && a.geladeiraNome.trim());
  exigir(["Simulacao", "Hardware"].includes(a.origem) && Object.hasOwn(tipos, a.tipo) && Object.hasOwn(gravidades, a.gravidade));
  exigir(["Aberto", "Encerrado"].includes(a.situacao) && [a.inicioCondicaoEmUtc, a.abertoEmUtc, a.ultimaEvidenciaEmUtc].every(instanteUtc));
  exigir(a.situacao === "Aberto" ? a.encerradoEmUtc === null && a.motivoEncerramento === null
    : instanteUtc(a.encerradoEmUtc) && Object.hasOwn(motivos, a.motivoEncerramento));
  exigir(a.leituraAberturaId === null || inteiro(a.leituraAberturaId, 1, 2147483647));
  exigir(a.temperaturaAberturaC === null || Number.isFinite(a.temperaturaAberturaC));
  exigir(Number.isFinite(a.temperaturaMinimaC) && Number.isFinite(a.temperaturaMaximaC) && a.temperaturaMinimaC < a.temperaturaMaximaC
    && inteiro(a.toleranciaPortaAbertaSegundos, 1, 2147483647) && inteiro(a.ausenciaLeiturasSegundos, 1, 2147483647));
  return a;
}
export function validarPagina(data, f) {
  exigir(data && Array.isArray(data.itens) && inteiro(data.totalItens) && inteiro(data.totalPaginas));
  for (const key of ["geladeiraId", "origem", "tipo", "gravidade", "situacao", "pagina", "tamanhoPagina"]) exigir(data[key] === f[key]);
  for (const key of ["inicioUtc", "fimUtc"]) exigir(data[key] === null && f[key] === null
    || instanteUtc(data[key]) && instanteUtc(f[key]) && Date.parse(data[key]) === Date.parse(f[key]));
  exigir(data.totalPaginas === Math.ceil(data.totalItens / f.tamanhoPagina) && data.itens.length === Math.max(0, Math.min(f.tamanhoPagina, data.totalItens - (f.pagina - 1) * f.tamanhoPagina)));
  const ids = new Set();
  for (const a of data.itens) { validarAlerta(a); exigir(!ids.has(a.id)); ids.add(a.id);
    for (const key of ["geladeiraId", "origem", "tipo", "gravidade", "situacao"]) exigir(f[key] === null || a[key] === f[key]); }
  return data;
}
export function validarResumo(data, origem) {
  exigir(data && data.origem === origem && instanteUtc(data.consultadoEmUtc));
  for (const key of ["abertos", "criticos", "equipamentosMonitorados", "equipamentosSemMonitoramentoNestaOrigem"]) exigir(inteiro(data[key]));
  exigir(data.criticos <= data.abertos && data.avaliador && typeof data.avaliador.saudavel === "boolean"
    && (data.avaliador.ultimoSucessoEmUtc === null || instanteUtc(data.avaliador.ultimoSucessoEmUtc)));
  exigir(Array.isArray(data.recentes) && data.recentes.length <= 5);
  for (const a of data.recentes) { validarAlerta(a); exigir(a.origem === origem); }
  return data;
}
