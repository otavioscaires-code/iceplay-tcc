#pragma once

// Este arquivo permite compilar sem segredos. Não envia dados enquanto false.
// prepare-firmware.ps1 gera config.local.h, ignorado pelo Git, quando solicitado.
constexpr bool CONFIGURADO = false;
constexpr char WIFI_SSID[] = "PREENCHER_REDE_24_GHZ";
constexpr char WIFI_SENHA[] = "PREENCHER_SENHA";
constexpr char API_BASE_URL[] = "https://192.168.0.1:5443";
constexpr char CREDENCIAL[] = "PREENCHER_CREDENCIAL_DO_DISPOSITIVO";
constexpr int GELADEIRA_ID = 0;
constexpr int PINO_TEMPERATURA = 4;
constexpr int PINO_PORTA = 27;
constexpr bool PORTA_FECHADA_COM_CONTATO_FECHADO = true;
constexpr char CA_PEM[] = "PREENCHER_CERTIFICADO_PUBLICO_PEM";
