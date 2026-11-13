#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <esp_system.h>
#include <cmath>
#include <ctime>

#if defined(ICEPLAY_USAR_EXEMPLO)
#include "config.example.h"
#elif __has_include("config.local.h")
#include "config.local.h"
#else
#include "config.example.h"
#endif

namespace {
constexpr uint32_t INTERVALO_MS = 10000;
constexpr uint32_t DEBOUNCE_MS = 50;
constexpr uint32_t CONVERSAO_MS = 800; // DS18B20, 12 bits: até 750 ms, mais margem.
constexpr uint32_t LIMITE_PENDENTE_MS = 30000;
constexpr time_t MINIMO_UTC = 1767225600; // 01/01/2026, não substitui sincronização.
OneWire oneWire;
DallasTemperature sensores(&oneWire);
DeviceAddress endereco{};
bool sensorPronto = false, convertendo = false, pendente = false;
bool configuracaoValida = false, envioBloqueado = false, conectadoAntes = false;
bool portaAberta = false, portaMudou = true;
int portaBruta = HIGH;
uint32_t ultimaMudancaPorta = 0, inicioConversao = 0, ultimaColeta = 0;
uint32_t ultimaTentativaWifi = 0, criadoPendente = 0, proximaTentativa = 0, esperaRetry = 2000;
char corpoPendente[384]{};

bool portaDoNivel(int nivel) {
    const bool contatoFechado = nivel == LOW;
    return PORTA_FECHADA_COM_CONTATO_FECHADO ? !contatoFechado : contatoFechado;
}

void atualizarPorta(uint32_t agora) {
    const int nivel = digitalRead(PINO_PORTA);
    if (nivel != portaBruta) { portaBruta = nivel; ultimaMudancaPorta = agora; }
    if (agora - ultimaMudancaPorta >= DEBOUNCE_MS && portaAberta != portaDoNivel(portaBruta)) {
        portaAberta = portaDoNivel(portaBruta);
        portaMudou = true;
    }
}

bool localizarSensor() {
    sensores.begin();
    sensores.setAutoSaveScratchPad(false);
    sensores.setWaitForConversion(false);
    if (sensores.getDeviceCount() != 1 || !sensores.getAddress(endereco, 0)
        || endereco[0] != DS18B20MODEL || OneWire::crc8(endereco, 7) != endereco[7]
        || sensores.isParasitePowerMode() || !sensores.setResolution(endereco, 12)) {
        Serial.println("Sensor nao pronto: confira um DS18B20 de tres fios, alimentacao e resistor 4k7.");
        return false;
    }
    return true;
}

void uuid(char* destino) {
    uint8_t bytes[16];
    esp_fill_random(bytes, sizeof(bytes));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    snprintf(destino, 37,
        "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
        bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
        bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]);
}

void concluirConversao(uint32_t agora) {
    if (!convertendo || agora - inicioConversao < CONVERSAO_MS) return;
    convertendo = false;
    if (!sensores.isConversionComplete()) {
        sensorPronto = false;
        Serial.println("Conversao nao concluida; nenhuma leitura sera substituida por valor ficticio.");
        return;
    }
    const float temperatura = sensores.getTempC(endereco); // Biblioteca valida scratchpad/CRC.
    if (!std::isfinite(temperatura) || temperatura == DEVICE_DISCONNECTED_C || temperatura < -55 || temperatura > 125) {
        sensorPronto = false;
        Serial.println("Leitura de sensor invalida; nao enviada. Confira ligacoes/CRC.");
        return;
    }
    const time_t instante = time(nullptr);
    if (instante < MINIMO_UTC) { Serial.println("Sem UTC sincronizado; medicao nao enviada."); return; }
    tm utc{};
    gmtime_r(&instante, &utc);
    char stamp[24], id[37];
    strftime(stamp, sizeof(stamp), "%Y-%m-%dT%H:%M:%SZ", &utc);
    uuid(id);
    const int length = snprintf(corpoPendente, sizeof(corpoPendente),
        "{\"geladeiraId\":%d,\"temperaturaC\":%.4f,\"portaAberta\":%s,\"medidoEmUtc\":\"%s\",\"origem\":\"Hardware\",\"medicaoId\":\"%s\"}",
        GELADEIRA_ID, static_cast<double>(temperatura), portaAberta ? "true" : "false", stamp, id);
    if (length < 0 || static_cast<size_t>(length) >= sizeof(corpoPendente)) {
        Serial.println("Corpo excedeu o buffer; envio bloqueado para revisao."); envioBloqueado = true; return;
    }
    // O mesmo corpo/UUID é conservado em qualquer reenvio desta amostra.
    pendente = true; criadoPendente = agora; proximaTentativa = agora; esperaRetry = 2000;
    Serial.printf("Amostra adquirida: %.4f C; porta %s; UTC %s.\n", temperatura, portaAberta ? "aberta" : "fechada", stamp);
}

void enviarPendente(uint32_t agora) {
    if (!pendente || envioBloqueado) return;
    if (agora - criadoPendente >= LIMITE_PENDENTE_MS) {
        pendente = false;
        Serial.println("Amostra pendente expirou apos 30 s; proxima coleta usara novo UUID. Nao ha historico offline completo.");
        return;
    }
    // Diferença assinada permite atravessar o rollover de millis(), com esperas curtas.
    if (WiFi.status() != WL_CONNECTED || static_cast<int32_t>(agora - proximaTentativa) < 0) return;
    WiFiClientSecure client;
    client.setCACert(CA_PEM);
    client.setHandshakeTimeout(5);
    HTTPClient http;
    http.setConnectTimeout(4000);
    http.setTimeout(4000);
    http.setReuse(false);
    http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
    const String url = String(API_BASE_URL) + "/api/leituras";
    int status = -1;
    if (http.begin(client, url)) {
        http.addHeader("Content-Type", "application/json");
        http.addHeader("Authorization", String("Bearer ") + CREDENCIAL);
        status = http.POST(reinterpret_cast<uint8_t*>(corpoPendente), strlen(corpoPendente));
        http.end();
    }
    Serial.printf("Resultado do envio: HTTP %d (credencial omitida).\n", status);
    if (status == 200 || status == 201) { pendente = false; return; }
    if (status == 401 || status == 403 || status == 409) {
        pendente = false; envioBloqueado = true;
        Serial.println("Revise credencial, vinculo ou UUID antes de reconfigurar/reiniciar a placa.");
        return;
    }
    if (status >= 300 && status < 500 && status != 408 && status != 429) {
        pendente = false;
        Serial.println("Pedido recusado; nao sera repetido. Em 400, confira UTC e formato; em 3xx, confira URL.");
        return;
    }
    proximaTentativa = millis() + esperaRetry;
    esperaRetry = min(esperaRetry * 2, static_cast<uint32_t>(30000));
}

void manterRede(uint32_t agora) {
    const bool conectado = WiFi.status() == WL_CONNECTED;
    if (conectado && !conectadoAntes) {
        configTime(0, 0, "pool.ntp.org", "time.google.com");
        Serial.println("Wi-Fi conectado. Aguardando UTC para TLS e medicao.");
    }
    if (!conectado && agora - ultimaTentativaWifi >= 10000) {
        ultimaTentativaWifi = agora;
        WiFi.reconnect();
        Serial.println("Tentando reconectar Wi-Fi.");
    }
    conectadoAntes = conectado;
}
} // namespace

void setup() {
    Serial.begin(115200);
    configuracaoValida = CONFIGURADO && GELADEIRA_ID > 0 && strlen(WIFI_SSID) > 0
        && strncmp(API_BASE_URL, "https://", 8) == 0 && strncmp(CREDENCIAL, "icp_", 4) == 0
        && strstr(CA_PEM, "BEGIN CERTIFICATE") != nullptr;
    if (!configuracaoValida) {
        Serial.println("ICEPLAY: compilacao sem configuracao privada valida. Nenhum sensor/rede sera iniciado.");
        return;
    }
    pinMode(PINO_PORTA, INPUT_PULLUP);
    oneWire.begin(PINO_TEMPERATURA);
    portaBruta = digitalRead(PINO_PORTA); portaAberta = portaDoNivel(portaBruta);
    ultimaColeta = millis() - INTERVALO_MS;
    WiFi.persistent(false);
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(WIFI_SSID, WIFI_SENHA);
    ultimaTentativaWifi = millis();
    Serial.println("ICEPLAY preparado: DS18B20/porta, HTTPS com CA, UTC e UUID. Validacao fisica ainda necessaria.");
}

void loop() {
    if (!configuracaoValida) { delay(1000); return; }
    const uint32_t agora = millis();
    atualizarPorta(agora);
    manterRede(agora);
    concluirConversao(agora);
    enviarPendente(agora);
    if (!pendente && !convertendo && !envioBloqueado && time(nullptr) >= MINIMO_UTC
        && (agora - ultimaColeta >= INTERVALO_MS || portaMudou)) {
        ultimaColeta = agora; portaMudou = false;
        if (!sensorPronto) sensorPronto = localizarSensor();
        if (sensorPronto && sensores.requestTemperaturesByAddress(endereco)) {
            convertendo = true; inicioConversao = millis();
        } else {
            sensorPronto = false;
            Serial.println("Nao foi possivel iniciar a conversao. Nova tentativa na proxima coleta.");
        }
    }
    delay(5);
}
