const maxInt = 2147483647;
const origens = ["Simulacao", "Hardware"];

function instanteUtcValido(value) {
  if (typeof value !== "string" || value.startsWith("0000") || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 19) === value.slice(0, 19);
}
function chaveUtc(value) {
  return `${value.slice(0, 19)}.${(value.split(".")[1]?.slice(0, -1) ?? "").padEnd(7, "0")}Z`;
}

export function validarParametros(value) {
  if (!value || typeof value.temperaturaMinimaC !== "number" || !Number.isFinite(value.temperaturaMinimaC)
    || typeof value.temperaturaMaximaC !== "number" || !Number.isFinite(value.temperaturaMaximaC))
    throw new Error("Informe temperaturas mínima e máxima como números finitos.");
  if (value.temperaturaMinimaC >= value.temperaturaMaximaC)
    throw new Error("A temperatura mínima deve ser menor que a máxima.");
  for (const [field, label] of [["toleranciaPortaAbertaSegundos", "tolerância de porta aberta"], ["ausenciaLeiturasSegundos", "prazo sem leituras"]]) {
    if (!Number.isInteger(value[field]) || value[field] < 1 || value[field] > maxInt)
      throw new Error(`Informe ${label} em segundos inteiros, de 1 a ${maxInt}.`);
  }
  if (!origens.includes(value.origemMonitorada)) throw new Error("Selecione a origem Simulação ou Hardware declarado.");
  if (typeof value.monitoramentoAtivo !== "boolean") throw new Error("Informe a habilitação planejada do monitoramento.");
  return value;
}

export function parametrosDoFormulario(fields) {
  for (const value of [fields.minima, fields.maxima, fields.porta, fields.ausencia]) {
    if (typeof value !== "string" || !value.trim()) throw new Error("Preencha os limites de temperatura e os dois tempos em segundos.");
  }
  return validarParametros({ temperaturaMinimaC: Number(fields.minima), temperaturaMaximaC: Number(fields.maxima),
    toleranciaPortaAbertaSegundos: Number(fields.porta), ausenciaLeiturasSegundos: Number(fields.ausencia),
    origemMonitorada: fields.origem, monitoramentoAtivo: fields.ativo });
}

export function validarRespostaConfiguracao(data, geladeiraId) {
  const invalid = () => { throw new Error("A API devolveu uma configuração incompatível com a geladeira consultada."); };
  if (!Number.isInteger(geladeiraId) || geladeiraId < 1 || geladeiraId > maxInt || !data || data.geladeiraId !== geladeiraId
    || !("configuracao" in data)) invalid();
  if (data.configuracao === null) return data;
  const value = data.configuracao;
  try { validarParametros(value); } catch { invalid(); }
  if (!instanteUtcValido(value.atualizadoEmUtc)) invalid();
  if (value.monitoramentoAtivo
    ? !instanteUtcValido(value.inicioMonitoramentoEmUtc) || chaveUtc(value.inicioMonitoramentoEmUtc) > chaveUtc(value.atualizadoEmUtc)
    : value.inicioMonitoramentoEmUtc !== null) invalid();
  return data;
}
