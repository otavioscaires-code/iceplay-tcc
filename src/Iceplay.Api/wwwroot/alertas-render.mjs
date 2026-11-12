import { tipos, gravidades, motivos } from "./alertas-estado.mjs?v=20261112-alertas";

export function elemento(tag, classe = "", texto) {
  const node = document.createElement(tag);
  if (classe) node.className = classe;
  if (texto !== undefined) node.textContent = texto;
  return node;
}
function horario(value) {
  const node = elemento("time", "", new Date(value).toLocaleString("pt-BR"));
  node.dateTime = value; node.title = `UTC: ${value}`;
  return node;
}
export function criarCard(alerta, compacto = false) {
  const card = elemento("article", "alert-card");
  card.dataset.gravidade = alerta.gravidade;
  const head = elemento("div", "alert-heading");
  head.append(elemento("h3", "", tipos[alerta.tipo]), elemento("span", "alert-badge", `${gravidades[alerta.gravidade]} · ${alerta.situacao}`));
  card.append(head, elemento("p", "alert-equipment", `${alerta.geladeiraNome} · #${alerta.geladeiraId}`),
    elemento("p", "monitor-source", alerta.origem === "Simulacao" ? "SIMULAÇÃO" : "HARDWARE DECLARADO"));
  const dl = elemento("dl", "alert-metrics");
  function dado(label, value) { const div = elemento("div"), dd = elemento("dd"); dd.append(value); div.append(elemento("dt", "", label), dd); dl.append(div); }
  dado("Abertura da ocorrência", horario(alerta.abertoEmUtc));
  if (!compacto) {
    dado("Início observado da condição", horario(alerta.inicioCondicaoEmUtc));
    dado("Última evidência de medição", horario(alerta.ultimaEvidenciaEmUtc));
    if (alerta.tipo === "TemperaturaForaFaixa") {
      dado("Temperatura na abertura", `${alerta.temperaturaAberturaC?.toLocaleString("pt-BR") ?? "—"} °C`);
      dado("Faixa usada", `${alerta.temperaturaMinimaC.toLocaleString("pt-BR")} a ${alerta.temperaturaMaximaC.toLocaleString("pt-BR")} °C`);
    } else dado("Prazo usado", `${alerta.tipo === "PortaAberta" ? alerta.toleranciaPortaAbertaSegundos : alerta.ausenciaLeiturasSegundos} segundos`);
  }
  if (alerta.encerradoEmUtc) dado("Encerramento", horario(alerta.encerradoEmUtc));
  card.append(dl);
  if (alerta.motivoEncerramento) card.append(elemento("p", "field-help", motivos[alerta.motivoEncerramento]));
  const link = elemento("a", "alert-history-link", "Consultar histórico da geladeira");
  link.href = `/historico?geladeiraId=${alerta.geladeiraId}&origem=${alerta.origem}`;
  card.append(link);
  return card;
}
