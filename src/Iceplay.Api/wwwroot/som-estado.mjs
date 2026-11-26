// Estado local da página. Silenciar nunca altera nem encerra um alerta no servidor.
export function criarControleSom(agora = () => performance.now(), intervaloMs = 30000) {
  let ativo = false, ultimoSom = null;
  return {
    get ativo() { return ativo; },
    ativar() { ativo = true; ultimoSom = null; },
    silenciar() { ativo = false; ultimoSom = null; },
    trocarOrigem() { ultimoSom = null; },
    deveTocar(abertos, saudavel, visivel = true) {
      if (!Number.isSafeInteger(abertos) || abertos < 0 || typeof saudavel !== "boolean") {
        throw new Error("Resumo de alertas inválido.");
      }
      if (abertos === 0) ultimoSom = null;
      if (!ativo || !visivel || !saudavel || abertos === 0) return false;
      const instante = agora();
      if (ultimoSom !== null && instante - ultimoSom < intervaloMs) return false;
      ultimoSom = instante;
      return true;
    }
  };
}

export function origensDoSom(valor) {
  if (valor === "") return ["Hardware", "Simulacao"];
  if (["Hardware", "Simulacao"].includes(valor)) return [valor];
  throw new Error("Selecione uma origem válida para o som.");
}
