#pragma once
#include <WiFiClientSecure.h>

// Opcional: rota IP para o nome HTTPS da API, equivalente a uma entrada DNS.
// A CA e o nome da URL continuam sendo verificados pelo WiFiClientSecure.
#ifndef ICEPLAY_API_IP_CONEXAO
#define ICEPLAY_API_IP_CONEXAO ""
#endif

class ClienteHttpsIceplay final : public WiFiClientSecure {
public:
    using WiFiClientSecure::connect;

    int connect(const char* host, uint16_t port) override {
        return connect(host, port, _timeout);
    }

    int connect(const char* host, uint16_t port, int32_t timeout) override {
        _timeout = timeout;
        if (ICEPLAY_API_IP_CONEXAO[0] == '\0')
            // A versao de tres argumentos chama o connect virtual novamente.
            return WiFiClientSecure::connect(host, port, _CA_cert, _cert, _private_key);
        IPAddress address;
        if (!address.fromString(ICEPLAY_API_IP_CONEXAO)) return 0;
#ifdef ICEPLAY_VERIFICAR_TLS_BANCADA
        // Somente no ensaio explicitamente habilitado na configuracao privada.
        // Nao envia HTTP/credencial durante as duas tentativas negativas.
        static bool validacoesRealizadas = false;
        if (!validacoesRealizadas) {
            const bool nomeRejeitado = rejeitaCertificado(address, port,
                "servidor-incorreto.invalid", _CA_cert);
            const bool caRejeitada = rejeitaCertificado(address, port,
                host, CA_TLS_TESTE_INVALIDA);
            Serial.printf("TLS bancada: nome_incorreto=%s; CA_incorreta=%s.\n",
                nomeRejeitado ? "REJEITADO" : "FALHOU",
                caRejeitada ? "REJEITADA" : "FALHOU");
            if (!nomeRejeitado || !caRejeitada) return 0;
            validacoesRealizadas = true;
        }
#endif
        // O host logico da URL valida a identidade; address define a rota TCP.
        return WiFiClientSecure::connect(address, port, host,
            _CA_cert, _cert, _private_key);
    }

#ifdef ICEPLAY_VERIFICAR_TLS_BANCADA
private:
    static bool rejeitaCertificado(IPAddress address, uint16_t port,
                                   const char* host, const char* ca) {
        WiFiClientSecure probe;
        probe.setTimeout(4);
        probe.setHandshakeTimeout(5);
        const int conectado = probe.connect(address, port, host, ca, nullptr, nullptr);
        const int erro = probe.lastError(nullptr, 0);
        probe.stop();
        return conectado == 0 && erro == MBEDTLS_ERR_X509_CERT_VERIFY_FAILED;
    }
#endif
};
