#include <Arduino.h>

// Diagnóstico de bancada: mostra a entrada elétrica, sem assumir a posição da porta.
namespace {
constexpr uint8_t PINO_ENTRADA = 27;
constexpr uint32_t DEBOUNCE_MS = 50;
constexpr uint32_t INTERVALO_LOG_MS = 1000;

int nivelBruto = HIGH;
int nivelEstavel = HIGH;
uint32_t ultimaMudanca = 0;
uint32_t ultimoLog = 0;

void registrarNivel(uint32_t agora) {
    Serial.print("uptime_ms=");
    Serial.print(agora);
    Serial.print(" GPIO27=");
    Serial.print(nivelEstavel == LOW ? "LOW" : "HIGH");
    Serial.println(nivelEstavel == LOW ? " entrada_em_GND" : " entrada_liberada");
    ultimoLog = agora;
}
}

void setup() {
    Serial.begin(115200);
    pinMode(PINO_ENTRADA, INPUT_PULLUP);
    nivelBruto = digitalRead(PINO_ENTRADA);
    nivelEstavel = nivelBruto;
    ultimaMudanca = millis();
    Serial.println("ICEPLAY DIAGNOSTICO DE BANCADA: GPIO27, INPUT_PULLUP, debounce 50 ms.");
    Serial.println("Somente leitura eletrica; sem temperatura, WiFi ou envio a API.");
    registrarNivel(millis());
}

void loop() {
    const uint32_t agora = millis();
    const int nivel = digitalRead(PINO_ENTRADA);
    if (nivel != nivelBruto) {
        nivelBruto = nivel;
        ultimaMudanca = agora;
    }

    // Subtração sem sinal mantém o intervalo correto mesmo após a volta de millis().
    if (agora - ultimaMudanca >= DEBOUNCE_MS && nivelEstavel != nivelBruto) {
        nivelEstavel = nivelBruto;
        registrarNivel(agora);
    } else if (agora - ultimoLog >= INTERVALO_LOG_MS) {
        registrarNivel(agora);
    }
    delay(5);
}
