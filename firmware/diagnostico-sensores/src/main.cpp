#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <cmath>

// Bancada isolada: reaproveita os pinos e criterios do firmware principal.
namespace {
constexpr uint8_t PINO_TEMPERATURA = 4;
constexpr uint8_t PINO_PORTA = 27;
constexpr uint32_t DEBOUNCE_MS = 50;
constexpr uint32_t CONVERSAO_MS = 800;
constexpr uint32_t INTERVALO_TEMPERATURA_MS = 2000;
constexpr uint32_t INTERVALO_PORTA_MS = 1000;

OneWire oneWire;
DallasTemperature sensores(&oneWire);
DeviceAddress endereco{};
bool sensorPronto = false;
bool convertendo = false;
int nivelBruto = HIGH;
int nivelEstavel = HIGH;
uint32_t ultimaMudancaPorta = 0;
uint32_t ultimoLogPorta = 0;
uint32_t ultimaColeta = 0;
uint32_t inicioConversao = 0;

void registrarPorta(uint32_t agora) {
    Serial.printf("uptime_ms=%lu GPIO27=%s\n", static_cast<unsigned long>(agora),
                  nivelEstavel == LOW ? "LOW" : "HIGH");
    ultimoLogPorta = agora;
}

void atualizarPorta(uint32_t agora) {
    const int nivel = digitalRead(PINO_PORTA);
    if (nivel != nivelBruto) {
        nivelBruto = nivel;
        ultimaMudancaPorta = agora;
    }
    if (agora - ultimaMudancaPorta >= DEBOUNCE_MS && nivelEstavel != nivelBruto) {
        nivelEstavel = nivelBruto;
        registrarPorta(agora);
    } else if (agora - ultimoLogPorta >= INTERVALO_PORTA_MS) {
        registrarPorta(agora);
    }
}

bool localizarSensor() {
    sensores.begin();
    sensores.setAutoSaveScratchPad(false);
    sensores.setWaitForConversion(false);
    // Uma sonda alimentada em tres fios, com familia e CRC de ROM conferidos.
    if (sensores.getDeviceCount() != 1 || !sensores.getAddress(endereco, 0)
        || endereco[0] != DS18B20MODEL || OneWire::crc8(endereco, 7) != endereco[7]
        || sensores.isParasitePowerMode() || !sensores.setResolution(endereco, 12)) {
        Serial.println("TEMPERATURA_ERRO=sonda_nao_pronta confira_pinagem_alimentacao_resistor_4k7");
        return false;
    }
    return true;
}

void concluirConversao(uint32_t agora) {
    if (!convertendo || agora - inicioConversao < CONVERSAO_MS) return;
    convertendo = false;
    if (!sensores.isConversionComplete()) {
        sensorPronto = false;
        Serial.println("TEMPERATURA_ERRO=conversao_incompleta");
        return;
    }
    const float temperatura = sensores.getTempC(endereco); // Valida scratchpad/CRC pela biblioteca.
    if (!std::isfinite(temperatura) || temperatura == DEVICE_DISCONNECTED_C
        || temperatura < -55 || temperatura > 125) {
        sensorPronto = false;
        Serial.println("TEMPERATURA_ERRO=leitura_invalida confira_ligacoes_crc");
        return;
    }
    // Valor numerico somente apos conversao valida; nao substitui falha por zero.
    Serial.printf("uptime_ms=%lu TEMPERATURA_C=%.4f\n",
                  static_cast<unsigned long>(millis()), static_cast<double>(temperatura));
}
} // namespace

void setup() {
    Serial.begin(115200);
    pinMode(PINO_PORTA, INPUT_PULLUP);
    oneWire.begin(PINO_TEMPERATURA);
    nivelBruto = digitalRead(PINO_PORTA);
    nivelEstavel = nivelBruto;
    ultimaMudancaPorta = millis();
    ultimaColeta = millis() - INTERVALO_TEMPERATURA_MS;
    Serial.println("ICEPLAY DIAGNOSTICO DE SENSORES: DS18B20 GPIO4, porta GPIO27.");
    Serial.println("Bancada sem WiFi/API; uptime_ms nao e horario UTC. Sem valores simulados.");
    registrarPorta(millis());
}

void loop() {
    const uint32_t agora = millis();
    atualizarPorta(agora);
    concluirConversao(agora);
    if (!convertendo && agora - ultimaColeta >= INTERVALO_TEMPERATURA_MS) {
        ultimaColeta = agora;
        if (!sensorPronto) sensorPronto = localizarSensor();
        if (sensorPronto) {
            if (sensores.requestTemperaturesByAddress(endereco)) {
                inicioConversao = millis();
                convertendo = true;
            } else {
                sensorPronto = false;
                Serial.println("TEMPERATURA_ERRO=conversao_nao_iniciada");
            }
        }
    }
    delay(5);
}
