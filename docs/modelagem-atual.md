# Modelagem consolidada do ICEPLAY

Modelo do código de 13/11/2026. `uml.md` permanece como versão histórica da base inicial. Os diagramas abaixo descrevem software atual; o nó físico está preparado em firmware, sem ensaio executado. As figuras SVG complementares ficam em `diagramas/` e não são capturas do sistema.

## Componentes e implantação prevista

![Componentes e implantação local](diagramas/componentes.svg)

```mermaid
flowchart LR
  Web["Navegador desktop ou Safari"] -->|"HTTPS na rede local"| Api["ASP.NET Core: HTML e Controllers"]
  Sim["Simulador PowerShell: Simulacao"] -->|"POST leituras"| Api
  Esp["ESP32: firmware compilado, físico pendente"] -.->|"HTTPS Bearer + UUID, POST leituras"| Api
  Api --> Ef["EF Core"]
  Worker["AlertasWorker, mesmo processo, 1 s"] --> Ef
  Ef --> Db[(SQLite)]
```

Existe um processo de API, não um serviço separado para cada caixa lógica. O browser consulta a API; não acessa o banco. O dispositivo usa credencial limitada à ingestão; o operador gerencia configurações/credenciais.

## Casos de uso

![Casos de uso do ICEPLAY](diagramas/casos-de-uso.svg)

Fonte PlantUML atual, com ator físico ainda pendente de validação:

```plantuml
@startuml
left to right direction
actor Operador
actor "Emissor de leituras" as Emissor
actor "Relogio do servidor" as Relogio
rectangle ICEPLAY {
  usecase "Gerenciar geladeiras" as UC1
  usecase "Consultar painel e historico" as UC2
  usecase "Configurar monitoramento" as UC3
  usecase "Consultar alertas" as UC4
  usecase "Emitir e revogar credencial" as UC5
  usecase "Enviar leitura validada" as UC6
  usecase "Avaliar regras e episodios" as UC7
}
Operador --> UC1
Operador --> UC2
Operador --> UC3
Operador --> UC4
Operador --> UC5
Emissor --> UC6
Relogio --> UC7
note bottom of Emissor
Simulador executado; ESP32 apenas compilado.
end note
@enduml
```

Enviar leitura tem pré-condição de geladeira existente e contrato válido. Com credencial, deve corresponder ao equipamento/origem autorizados. Consultar histórico exige equipamento/origem; alterar parâmetros exige entradas válidas e sessão/CSRF no acesso remoto. Não existe caso de uso de normalizar alerta manualmente: o motivo vem das regras.

## Classes e cardinalidades

![Entidades e relacionamentos](diagramas/entidades.svg)

```mermaid
classDiagram
  class Geladeira {
    int Id
    string Nome
    string Localizacao
    DateTime CriadoEmUtc
  }
  class Leitura {
    int Id
    int GeladeiraId
    double TemperaturaC
    bool PortaAberta
    OrigemLeitura Origem
    DateTime MedidoEmUtc
    DateTime RecebidoEmUtc
    int DispositivoId
    string MedicaoId
  }
  class ConfiguracaoGeladeira {
    int GeladeiraId
    double TemperaturaMinimaC
    double TemperaturaMaximaC
    int ToleranciaPortaAbertaSegundos
    int AusenciaLeiturasSegundos
    OrigemLeitura OrigemMonitorada
    bool MonitoramentoAtivo
    DateTime InicioMonitoramentoEmUtc
    DateTime AtualizadoEmUtc
  }
  class Alerta {
    int Id
    TipoAlerta Tipo
    GravidadeAlerta Gravidade
    DateTime InicioCondicaoEmUtc
    DateTime AbertoEmUtc
    DateTime UltimaEvidenciaEmUtc
    DateTime EncerradoEmUtc
    MotivoEncerramento MotivoEncerramento
  }
  class EstadoMonitoramento {
    int GeladeiraId
    DateTime ConfiguracaoEmUtc
    DateTime UltimaMedicaoEmUtc
    int UltimaLeituraId
    DateTime InicioPortaAbertaEmUtc
  }
  class Dispositivo {
    int Id
    int GeladeiraId
    string Nome
    byteArray CredencialHash
    DateTime CriadoEmUtc
    DateTime RevogadoEmUtc
  }
  Geladeira "1" --> "0..*" Leitura
  Geladeira "1" --> "0..1" ConfiguracaoGeladeira
  Geladeira "1" --> "0..*" Alerta
  Geladeira "1" --> "0..*" Dispositivo
  ConfiguracaoGeladeira "1" --> "0..1" EstadoMonitoramento
  Dispositivo "0..1" --> "0..*" Leitura
  Leitura "0..1" --> "0..*" Alerta : abertura
```

O desenho simplifica nulabilidade: Localizacao, DispositivoId/MedicaoId, início de acompanhamento inativo, instantes opcionais de estado e encerramento/revogação são anuláveis no código. Alerta também guarda FK/origem, leitura/temperatura de abertura e cópia dos quatro parâmetros; ver entidade/contrato completos. Não há tabela separada para enumerações.

## Sequência de ingestão e avaliação

![Sequência de ingestão e avaliação](diagramas/sequencia.svg)

```mermaid
sequenceDiagram
  participant O as Operador
  participant E as Emissor
  participant A as API
  participant B as SQLite
  participant W as Worker
  O->>A: PUT configuração ativa
  A->>B: Persistir parâmetros/início UTC
  E->>A: POST leitura com Bearer/UUID
  A->>B: Validar vínculo/revogação/UUID em transação
  alt UUID novo e corpo válido
    A->>B: Inserir leitura e recebimento UTC
    A-->>E: 201 + ID + Location
  else UUID e conteúdo já confirmados
    A-->>E: 200 com mesmo registro
  else Mesmo UUID com conteúdo diferente
    A-->>E: 409
  end
  loop A cada segundo, inclusive sem POST
    W->>B: Ler configuração/checkpoint/amostras
    W->>B: Persistir episódios/encerramentos/checkpoint
  end
  O->>A: GET painel/histórico/alertas
  A->>B: Consulta filtrada
  A-->>O: JSON dos registros persistidos
```

O fluxo do emissor foi exercitado por cliente de software autenticado. Não representa uma sequência capturada de ESP32 real. POST e ciclo do worker são transações distintas; alertas têm atualização assíncrona.

## Estados de um episódio

```mermaid
stateDiagram-v2
  [*] --> SemEpisodio
  SemEpisodio --> Aberto: condição confirmada pelas regras
  Aberto --> Aberto: nova evidência, sem duplicar
  Aberto --> Encerrado: normalização, lacuna ou configuração
  Encerrado --> [*]
```

Novo desvio após encerramento cria outro episódio. O histórico não é apagado. Ausência de medições e mudança/desativação possuem motivos próprios; nenhum desses motivos confirma temperatura normal.
