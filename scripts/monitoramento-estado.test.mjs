import test from "node:test";
import assert from "node:assert/strict";
import { validarMonitoramento, estadoDaLeitura, formatarIdade } from "../src/Iceplay.Api/wwwroot/monitoramento-estado.mjs";

const agora = Date.parse("2026-10-19T12:00:00Z");
function leitura(overrides = {}) {
  return { id: 1, geladeiraId: 1, temperaturaC: 0, portaAberta: false,
    medidoEmUtc: "2026-10-19T11:59:30Z", recebidoEmUtc: "2026-10-19T11:59:31Z", origem: "Simulacao", ...overrides };
}
function snapshot(ultimaLeitura = leitura()) {
  return { consultadoEmUtc: "2026-10-19T12:00:00Z", origem: "Simulacao",
    geladeiras: [{ id: 1, nome: "FIXTURE PAINEL", localizacao: null, ultimaLeitura }] };
}

test("zero e porta fechada permanecem valores válidos, distintos de ausência", () => {
  assert.equal(validarMonitoramento(snapshot(), "Simulacao").geladeiras[0].ultimaLeitura.temperaturaC, 0);
  assert.equal(validarMonitoramento(snapshot(), "Simulacao").geladeiras[0].ultimaLeitura.portaAberta, false);
});
test("cadastro sem leitura e banco sem geladeiras são respostas válidas", () => {
  assert.equal(validarMonitoramento(snapshot(null), "Simulacao").geladeiras[0].ultimaLeitura, null);
  assert.deepEqual(validarMonitoramento({ ...snapshot(), geladeiras: [] }, "Simulacao").geladeiras, []);
});
test("respostas de outra origem e leituras misturadas são recusadas", () => {
  assert.throws(() => validarMonitoramento(snapshot(), "Hardware"));
  assert.throws(() => validarMonitoramento(snapshot(leitura({ origem: "Hardware" })), "Simulacao"));
});
test("identidade inconsistente ou geladeiras duplicadas não podem ser exibidas", () => {
  assert.throws(() => validarMonitoramento(snapshot(leitura({ geladeiraId: 2 })), "Simulacao"));
  const duplicado = snapshot();
  duplicado.geladeiras.push({ ...duplicado.geladeiras[0] });
  assert.throws(() => validarMonitoramento(duplicado, "Simulacao"));
});
test("valores ausentes, strings numéricas e tipos incorretos são recusados", () => {
  for (const campo of [{ temperaturaC: "4" }, { temperaturaC: Infinity }, { portaAberta: "false" }, { id: 0 }]) {
    assert.throws(() => validarMonitoramento(snapshot(leitura(campo)), "Simulacao"));
  }
  const semCampo = snapshot();
  delete semCampo.geladeiras[0].ultimaLeitura;
  assert.throws(() => validarMonitoramento(semCampo, "Simulacao"));
});
test("datas inválidas, sem UTC e medição posterior ao recebimento são recusadas", () => {
  for (const value of ["2026-02-30T12:00:00Z", "2026-10-19T12:00:00", "texto"] ) {
    assert.throws(() => validarMonitoramento(snapshot(leitura({ medidoEmUtc: value })), "Simulacao"));
  }
  assert.throws(() => validarMonitoramento(snapshot(leitura({ recebidoEmUtc: "2026-10-19T11:59:00Z" })), "Simulacao"));
});
test("nenhuma leitura não é classificada como recente ou temperatura normal", () => {
  assert.deepEqual(estadoDaLeitura(null, 60, agora), { codigo: "sem-leitura", rotulo: "Sem leitura nesta origem", idadeSegundos: null });
});
test("referência de 60 segundos tem limite explícito", () => {
  const valor = leitura({ medidoEmUtc: "2026-10-19T11:59:00Z" });
  assert.equal(estadoDaLeitura(valor, 60, agora).codigo, "recente");
  assert.equal(estadoDaLeitura(valor, 60, agora + 1).codigo, "desatualizada");
});
test("recebimento recente não torna medição atrasada recente", () => {
  const atrasada = leitura({ medidoEmUtc: "2026-10-19T11:00:00Z", recebidoEmUtc: "2026-10-19T11:59:59Z" });
  const estado = estadoDaLeitura(atrasada, 60, agora);
  assert.equal(estado.codigo, "desatualizada");
  assert.equal(estado.idadeSegundos, 3600);
});
test("referência visual pode mudar ou ser desativada sem alterar a leitura", () => {
  const valor = leitura({ medidoEmUtc: "2026-10-19T11:58:00Z" });
  assert.equal(estadoDaLeitura(valor, 60, agora).codigo, "desatualizada");
  assert.equal(estadoDaLeitura(valor, 300, agora).codigo, "recente");
  assert.equal(estadoDaLeitura(valor, 0, agora).codigo, "sem-referencia");
  assert.equal(valor.medidoEmUtc, "2026-10-19T11:58:00Z");
});
test("horário à frente da referência é indicado sem fingir recência", () => {
  assert.equal(estadoDaLeitura(leitura({ medidoEmUtc: "2026-10-19T12:00:01Z" }), 60, agora).codigo, "relogio");
});
test("idade é apresentada em português nos limites de segundos, minutos e dias", () => {
  assert.equal(formatarIdade(null), "Não disponível");
  assert.equal(formatarIdade(0), "agora");
  assert.equal(formatarIdade(59), "há 59 s");
  assert.equal(formatarIdade(60), "há 1 min 0 s");
  assert.equal(formatarIdade(3600), "há 1 h 0 min");
  assert.equal(formatarIdade(86400), "há 1 d 0 h");
});
