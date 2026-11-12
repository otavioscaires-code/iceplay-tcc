import { instanteUtc } from "./alertas-estado.mjs?v=20261112-alertas";
import { elemento } from "./alertas-render.mjs?v=20261112-alertas";

const ids = ["geladeira", "recarregar", "form", "nome", "emitir", "lista", "status", "confirmacao", "confirmar", "cancelar", "aviso", "segredo", "credencial", "ocultar"];
const ui = Object.fromEntries(ids.map(id => [id, document.getElementById(`dispositivo-${id}`)]));
let sequencia = 0, controller = null, ocupado = false, pronta = false, equipamentos = [], dispositivos = [], comando = null;
function mensagem(text, state = "info") { ui.status.textContent = text; ui.status.dataset.state = state; }
function ocultar() { ui.credencial.value = ""; ui.segredo.hidden = true; }
function controles() {
  const locked = ocupado || !!comando;
  ui.geladeira.disabled = locked || !equipamentos.length;
  ui.recarregar.disabled = locked;
  ui.nome.disabled = locked || !pronta || dispositivos.some(d => d.revogadoEmUtc === null);
  ui.emitir.disabled = ui.nome.disabled;
  ui.confirmar.disabled = ocupado; ui.cancelar.disabled = ocupado;
  ui.confirmacao.hidden = comando === null;
  ui.lista.setAttribute("aria-busy", String(ocupado));
}
function validar(d, equipamento) {
  if (!d || !Number.isInteger(d.id) || d.id < 1 || d.geladeiraId !== equipamento || typeof d.nome !== "string" || !d.nome.trim()
    || !instanteUtc(d.criadoEmUtc) || d.revogadoEmUtc !== null && !instanteUtc(d.revogadoEmUtc) || "credencial" in d || "credencialHash" in d)
    throw new Error("Metadados do dispositivo inválidos. Recarregue os dados.");
  return d;
}
function renderizar() {
  ui.lista.replaceChildren();
  if (!pronta) { ui.lista.append(elemento("p", "field-help", "Nenhuma consulta de dispositivos confirmada.")); return; }
  for (const d of dispositivos) {
    const item = elemento("div", "device-item");
    item.append(elemento("p", "", `${d.nome} · #${d.id} · ${d.revogadoEmUtc ? "Revogado" : "Ativo"}`));
    if (d.revogadoEmUtc) item.append(elemento("p", "field-help", `Revogado em ${new Date(d.revogadoEmUtc).toLocaleString("pt-BR")}.`));
    else {
      const button = elemento("button", "button button-secondary", "Revogar credencial"); button.type = "button";
      button.disabled = ocupado || !!comando;
      button.addEventListener("click", () => { if (ocupado || comando) return; ocultar(); comando = { tipo: "revogar", equipamento: d.geladeiraId, id: d.id };
        ui.aviso.textContent = `Revogar ${d.nome} (#${d.id})? A placa deixará de enviar até receber uma nova credencial.`; controles(); });
      item.append(button);
    }
    ui.lista.append(item);
  }
  if (!dispositivos.length) ui.lista.append(elemento("p", "field-help", "Nenhum dispositivo cadastrado para esta geladeira."));
}
async function pedir(path, current, options = {}) {
  const timeout = window.setTimeout(() => current.abort(), 8000);
  try {
    const response = await window.iceplayFetch(path, { cache: "no-store", ...options, signal: current.signal });
    if (!response.ok) throw new Error(response.status === 401 ? "Conecte este navegador na página Acesso."
      : response.status === 409 ? "Já existe dispositivo ativo. Recarregue e revogue a credencial anterior antes de emitir outra."
        : response.status === 404 ? "O equipamento ou dispositivo não existe. Recarregue os dados."
          : `Operação não confirmada (HTTP ${response.status}). Recarregue antes de repetir.`);
    return await response.json();
  } finally { window.clearTimeout(timeout); }
}
async function carregar(id) {
  const seq = ++sequencia; controller?.abort(); controller = new AbortController(); const current = controller;
  ocupado = true; pronta = false; dispositivos = []; comando = null; ocultar(); ui.lista.replaceChildren(); controles(); mensagem("Consultando dispositivos…");
  try {
    const values = await pedir(`/api/geladeiras/${id}/dispositivos`, current);
    if (seq !== sequencia) return;
    if (!Array.isArray(values) || new Set(values.map(d => d?.id)).size !== values.length) throw new Error("Lista de dispositivos inválida.");
    dispositivos = values.map(d => validar(d, id));
    if (dispositivos.filter(d => d.revogadoEmUtc === null).length > 1) throw new Error("Mais de um dispositivo ativo; confira o banco.");
    pronta = true; renderizar(); mensagem("Metadados consultados. A credencial anterior não pode ser recuperada.", "success");
  } catch (error) { if (seq === sequencia) { dispositivos = []; mensagem(error.name === "AbortError" ? "Consulta excedeu 8 segundos. Recarregue." : error.message, "error"); } }
  finally { if (seq === sequencia) { ocupado = false; controles(); renderizar(); } }
}
async function iniciar() {
  const selected = Number(ui.geladeira.value), seq = ++sequencia;
  controller?.abort(); controller = new AbortController(); const current = controller;
  ocupado = true; pronta = false; equipamentos = []; dispositivos = []; comando = null; ocultar(); ui.lista.replaceChildren(); controles();
  try {
    const values = await pedir("/api/geladeiras", current);
    if (seq !== sequencia) return;
    if (!Array.isArray(values) || values.some(g => !g || !Number.isInteger(g.id) || g.id < 1 || typeof g.nome !== "string" || !g.nome.trim())) throw new Error("Equipamentos inválidos.");
    equipamentos = values; ui.geladeira.replaceChildren();
    for (const g of values) { const option = elemento("option", "", `${g.nome} · #${g.id}`); option.value = String(g.id); ui.geladeira.append(option); }
    if (!values.length) { mensagem("Cadastre uma geladeira antes de preparar seu dispositivo."); return; }
    ui.geladeira.value = String(values.some(g => g.id === selected) ? selected : values[0].id);
    await carregar(Number(ui.geladeira.value));
  } catch (error) { if (seq === sequencia) mensagem(error.message, "error"); }
  finally { if (seq === sequencia) { ocupado = false; controles(); } }
}
ui.form.addEventListener("submit", event => {
  event.preventDefault();
  if (ocupado || !pronta || comando || dispositivos.some(d => d.revogadoEmUtc === null)) return;
  const name = ui.nome.value.trim(), equipamento = Number(ui.geladeira.value);
  if (!name || ui.nome.value.length > 100) { mensagem("Informe um nome de até 100 caracteres.", "error"); return; }
  comando = { tipo: "emitir", equipamento, nome: name }; ocultar();
  ui.aviso.textContent = `Emitir credencial para ${name} na geladeira #${equipamento}? Ela será mostrada uma única vez e autorizará somente o envio de leituras desse equipamento.`;
  controles();
});
ui.confirmar.addEventListener("click", async () => {
  if (!comando || ocupado) return;
  const action = comando, seq = ++sequencia; controller?.abort(); controller = new AbortController(); const current = controller;
  ocupado = true; controles(); mensagem("Gravando alteração…");
  try {
    const base = `/api/geladeiras/${action.equipamento}/dispositivos`;
    const data = await pedir(action.tipo === "emitir" ? base : `${base}/${action.id}/revogar`, current,
      { method: "POST", ...(action.tipo === "emitir" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: action.nome }) } : {}) });
    if (seq !== sequencia) return;
    if (action.tipo === "emitir") {
      const device = validar(data.dispositivo, action.equipamento);
      if (typeof data.credencial !== "string" || !new RegExp(`^icp_${device.id}_[0-9a-f]{64}$`).test(data.credencial)) throw new Error("Resposta sem credencial válida; recarregue os metadados.");
      dispositivos = [device, ...dispositivos]; ui.credencial.value = data.credencial; ui.segredo.hidden = false;
      mensagem("Credencial emitida. Guarde-a no arquivo privado de configuração da placa; ela não será mostrada novamente.", "success");
    } else {
      const device = validar(data, action.equipamento);
      if (device.id !== action.id || !device.revogadoEmUtc) throw new Error("Revogação não confirmada. Recarregue.");
      dispositivos = dispositivos.map(d => d.id === device.id ? device : d); ocultar(); mensagem("Credencial revogada. Uma nova emissão já pode ser preparada.", "success");
    }
  } catch (error) {
    if (seq !== sequencia) return;
    pronta = false; dispositivos = []; ocultar();
    mensagem(`${error.name === "AbortError" ? "Tempo de resposta excedido." : error.message} Consulte Recarregar dispositivos antes de outra alteração. Se uma emissão foi salva sem resposta, revogue-a antes de emitir novamente.`, "error");
  } finally { if (seq === sequencia) { comando = null; ocupado = false; controles(); renderizar(); } }
});
ui.cancelar.addEventListener("click", () => { if (ocupado) return; comando = null; controles(); });
ui.ocultar.addEventListener("click", ocultar);
ui.geladeira.addEventListener("change", () => carregar(Number(ui.geladeira.value)));
ui.recarregar.addEventListener("click", iniciar);
window.addEventListener("iceplay:acesso-changed", iniciar);
window.addEventListener("pagehide", () => { sequencia++; controller?.abort(); ocultar(); });
iniciar();
