function instanteUtcValido(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 19) === value.slice(0, 19);
}

export function validarMonitoramento(data, origem) {
  const valido = data !== null && typeof data === "object" && data.origem === origem
    && ["Simulacao", "Hardware"].includes(origem) && instanteUtcValido(data.consultadoEmUtc)
    && Array.isArray(data.geladeiras);
  if (!valido) throw new Error("Resposta de monitoramento inválida.");
  const ids = new Set();
  for (const geladeira of data.geladeiras) {
    if (!geladeira || !Number.isSafeInteger(geladeira.id) || geladeira.id <= 0 || ids.has(geladeira.id)
      || typeof geladeira.nome !== "string" || !geladeira.nome.trim()
      || !(geladeira.localizacao === null || typeof geladeira.localizacao === "string")) {
      throw new Error("Cadastro inválido na resposta do monitoramento.");
    }
    ids.add(geladeira.id);
    const leitura = geladeira.ultimaLeitura;
    if (leitura === null) continue;
    if (!leitura || !Number.isSafeInteger(leitura.id) || leitura.id <= 0 || leitura.geladeiraId !== geladeira.id
      || typeof leitura.temperaturaC !== "number" || !Number.isFinite(leitura.temperaturaC)
      || typeof leitura.portaAberta !== "boolean" || leitura.origem !== origem
      || !instanteUtcValido(leitura.medidoEmUtc) || !instanteUtcValido(leitura.recebidoEmUtc)
      || Date.parse(leitura.medidoEmUtc) > Date.parse(leitura.recebidoEmUtc)) {
      throw new Error("Leitura inválida na resposta do monitoramento.");
    }
  }
  return data;
}

export function estadoDaLeitura(leitura, referenciaSegundos, agoraServidorMs) {
  if (leitura === null) return { codigo: "sem-leitura", rotulo: "Sem leitura nesta origem", idadeSegundos: null };
  const idadeMs = agoraServidorMs - Date.parse(leitura.medidoEmUtc);
  if (idadeMs < 0) return { codigo: "relogio", rotulo: "Horário da medição a conferir", idadeSegundos: null };
  const idadeSegundos = Math.floor(idadeMs / 1000);
  if (referenciaSegundos > 0 && idadeMs > referenciaSegundos * 1000) {
    return { codigo: "desatualizada", rotulo: "Leitura desatualizada", idadeSegundos };
  }
  return {
    codigo: referenciaSegundos > 0 ? "recente" : "sem-referencia",
    rotulo: referenciaSegundos > 0 ? "Leitura recente" : "Idade da leitura disponível",
    idadeSegundos
  };
}

export function formatarIdade(segundos) {
  if (segundos === null) return "Não disponível";
  if (segundos < 1) return "agora";
  if (segundos < 60) return `há ${segundos} s`;
  if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min ${segundos % 60} s`;
  if (segundos < 86400) return `há ${Math.floor(segundos / 3600)} h ${Math.floor(segundos % 3600 / 60)} min`;
  return `há ${Math.floor(segundos / 86400)} d ${Math.floor(segundos % 86400 / 3600)} h`;
}
