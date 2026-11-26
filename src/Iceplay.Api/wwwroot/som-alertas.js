import { validarResumo } from "./alertas-estado.mjs?v=20261112-alertas";
import { criarControleSom, origensDoSom } from "./som-estado.mjs?v=20261126-som";

const origem = document.getElementById("monitoramento-origem") ?? document.getElementById("alertas-origem");
const painel = document.getElementById("som-alertas");
if (origem && painel) iniciar();

function iniciar() {
  const ativar = document.getElementById("som-ativar"), testar = document.getElementById("som-testar");
  const silenciar = document.getElementById("som-silenciar"), status = document.getElementById("som-status");
  const controle = criarControleSom();
  let contexto = null, geracao = 0, acao = 0, consulta = null, ocupado = false;
  const fontes = new Set();

  function informar(texto, erro = false) {
    status.textContent = texto;
    status.dataset.state = erro ? "error" : "info";
    ativar.disabled = ocupado || controle.ativo;
    testar.disabled = ocupado;
    silenciar.disabled = !controle.ativo && !ocupado && fontes.size === 0;
    ativar.setAttribute("aria-pressed", String(controle.ativo));
  }

  function pararNotas() {
    for (const fonte of fontes) { try { fonte.stop(); } catch { /* Fonte já encerrada. */ } }
    fontes.clear();
  }

  function cancelarConsulta() { geracao++; consulta?.abort(); consulta = null; }

  function desligar(texto = "Som silenciado neste dispositivo. Os alertas continuam registrados.") {
    acao++; ocupado = false; controle.silenciar(); cancelarConsulta(); pararNotas(); informar(texto);
  }

  function tocar() {
    if (document.hidden || contexto?.state !== "running") throw new Error("Áudio interrompido. Toque em Ativar som novamente.");
    pararNotas();
    for (let i = 0; i < 3; i++) {
      const nota = contexto.createOscillator(), volume = contexto.createGain();
      const inicio = contexto.currentTime + i * 0.22;
      nota.type = "sine"; nota.frequency.value = i === 1 ? 660 : 880;
      volume.gain.setValueAtTime(0, inicio);
      volume.gain.linearRampToValueAtTime(0.12, inicio + 0.015);
      volume.gain.linearRampToValueAtTime(0, inicio + 0.16);
      nota.connect(volume); volume.connect(contexto.destination); fontes.add(nota);
      nota.onended = () => { fontes.delete(nota); nota.disconnect(); volume.disconnect();
        silenciar.disabled = !controle.ativo && !ocupado && fontes.size === 0; };
      nota.start(inicio); nota.stop(inicio + 0.18);
    }
  }

  async function prepararAudio(habilitar) {
    const atual = ++acao;
    ocupado = true; informar("Preparando áudio…");
    try {
      const Audio = window.AudioContext ?? window.webkitAudioContext;
      if (!Audio) throw new Error("Este navegador não oferece áudio compatível. Use uma versão atual do Safari, Edge ou Chrome.");
      // Criação/resume dentro do clique, exigido pelas políticas de reprodução dos navegadores.
      if (!contexto || contexto.state === "closed") contexto = new Audio();
      if (contexto.state !== "running") await contexto.resume();
      if (atual !== acao || document.hidden) return;
      tocar();
      if (habilitar) controle.ativar();
      informar(habilitar ? "Som ativado. Consultando alertas…" : "Teste enviado ao áudio. Confira o volume do dispositivo.");
      if (habilitar) void atualizar();
    } catch (erro) {
      if (atual !== acao) return;
      controle.silenciar(); cancelarConsulta(); pararNotas(); informar(erro.message, true);
    } finally {
      if (atual === acao) { ocupado = false; ativar.disabled = controle.ativo; testar.disabled = false;
        silenciar.disabled = !controle.ativo && fontes.size === 0; }
    }
  }

  async function atualizar() {
    if (!controle.ativo || document.hidden || consulta) return;
    const atual = ++geracao, selecionada = origem.value;
    const controller = new AbortController(); consulta = controller;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const resumos = await Promise.all(origensDoSom(selecionada).map(async valor => {
        const resposta = await window.iceplayFetch(`/api/alertas/resumo?origem=${valor}`, { cache: "no-store", signal: controller.signal });
        if (!resposta.ok) throw new Error(resposta.status === 401 ? "Conecte este dispositivo na página Acesso e ative o som novamente."
          : `Sem confirmação dos alertas (HTTP ${resposta.status}).`);
        return validarResumo(await resposta.json(), valor);
      }));
      if (atual !== geracao || !controle.ativo || document.hidden) return;
      const saudavel = resumos.every(r => r.avaliador.saudavel);
      const abertos = resumos.reduce((soma, r) => soma + r.abertos, 0);
      if (!saudavel) throw new Error("Avaliador sem confirmação recente. Som aguardando uma consulta válida.");
      if (contexto?.state !== "running") { desligar("Áudio interrompido. Toque em Ativar som novamente."); return; }
      if (controle.deveTocar(abertos, saudavel)) tocar();
      const rotulo = selecionada === "" ? "Hardware e Simulação" : selecionada === "Hardware" ? "Hardware" : "Simulação";
      const monitorados = resumos.reduce((soma, r) => soma + r.equipamentosMonitorados, 0);
      informar(`Som ativado · ${rotulo}: ${abertos} alerta(s) aberto(s), ${monitorados} equipamento(s) monitorado(s). ${abertos ? "Aviso repetido a cada 30 segundos enquanto houver alerta." : "Aguardando novos alertas."}`);
    } catch (erro) {
      if (atual !== geracao) return;
      controller.abort();
      pararNotas(); informar(erro.name === "AbortError" ? "Consulta excedeu 8 segundos. Som aguardando conexão; nova tentativa em até 15 segundos."
        : erro.message, true);
    } finally {
      window.clearTimeout(timeout);
      if (consulta === controller) consulta = null;
    }
  }

  ativar.addEventListener("click", () => void prepararAudio(true));
  testar.addEventListener("click", () => void prepararAudio(false));
  silenciar.addEventListener("click", () => desligar());
  origem.addEventListener("change", () => {
    cancelarConsulta(); pararNotas(); controle.trocarOrigem();
    if (controle.ativo) { informar("Origem alterada. Consultando alertas…"); void atualizar(); }
  });
  document.addEventListener("visibilitychange", () => {
    cancelarConsulta(); pararNotas();
    if (document.hidden) { acao++; ocupado = false; informar(controle.ativo ? "Som pausado enquanto esta página não está visível." : "Som desativado."); }
    else if (controle.ativo) void atualizar();
  });
  window.addEventListener("iceplay:acesso-changed", () => desligar("O acesso mudou. Ative o som novamente após conectar o dispositivo."));
  window.addEventListener("pagehide", () => { desligar(); void contexto?.close().catch(() => {}); });
  window.setInterval(() => void atualizar(), 15000);
  painel.hidden = false;
  informar("Som desativado. Toque em Testar som para conferir o áudio deste dispositivo.");
}
