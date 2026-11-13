# Correção do filtro UTC de alertas

Na auditoria de 13/11, GET com `inicioUtc=2026-11-12T12:00:00.Z` retornou 200, embora o contrato exija ausência de fração ou de um a sete dígitos. O formato .NET com `FFFFFFF` aceitava a fração vazia. Foram adotados os mesmos oito formatos explícitos de leituras/histórico, com `f` minúsculo, sem alterar o contrato válido ou o banco.

O cenário foi acrescentado ao verificador HTTP e aos filtros Node. Executados em nova pasta `evidencias/2026-11-13-validacao-final`: 112 testes JavaScript aprovados; regras 31 com relógio controlado; alertas HTTP **91 verificações / 67 requisições**, incluindo 400 para fração vazia; móvel **139 / 102**, com sessão/TLS/dispositivo preservados. Build passou sem avisos/erros. Os números HTTP variam com consultas de espera do worker e são os da rodada registrada.

O servidor de uso foi parado durante a recompilação; não houve alteração de schema/dados nessa correção. Persistência/modelo continuam com cinco migrations. Não houve hardware ou conferência visual de navegador nesta rodada.
