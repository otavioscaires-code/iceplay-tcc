# ICEPLAY — fontes da modelagem UML

**Modelo atual de ingestão:** consulte [Contrato de leituras e modelo atual](contrato-leituras.md), com as classes e a sequência implementadas. Os diagramas abaixo foram preservados como registro histórico da base e da proposta de **13/10/2026**; seus elementos planejados não descrevem automaticamente o estado atual do código.

**Acesso móvel de 19/10:** a sequência da sessão HTTPS está em [Etapa móvel](etapa-mobile-2026-10-19.md). Essa autenticação temporária não acrescenta tabelas ao modelo de dados e não representa autenticação do ESP32.

Data de referência: **13/10/2026**.

Os diagramas distinguem a base da entrega inicial da evolução planejada. Somente saúde da API, modelo inicial `Geladeira`, SQLite e página inicial pertencem à primeira etapa. Os demais elementos descrevem o objetivo futuro e devem ser atualizados conforme forem implementados e testados. Estes diagramas não afirmam que houve ensaio com sensores físicos.

Mermaid pode ser visualizado em um leitor compatível. Os blocos PlantUML são fontes textuais para exportação futura; não foi instalado nem executado renderizador PlantUML. Renderização não é dependência do sistema.

## 1. Casos de uso — UML em PlantUML

O operador interage com o painel. Simulador e dispositivo enviam amostras pelo mesmo caso de uso de ingestão. Não há ator ESP32 em operação na primeira entrega.

```plantuml
@startuml
left to right direction
actor "Operador" as Operator
actor "Simulador\n(planejado)" as Simulator
actor "Dispositivo ESP32\n(planejado)" as Device

rectangle "ICEPLAY" {
  usecase "Consultar saúde da API\n(base 13/10)" as Health
  usecase "Navegar na tela inicial\n(base 13/10)" as Home
  usecase "Gerenciar geladeiras\n(planejado)" as Refrigerators
  usecase "Consultar histórico\n(planejado)" as History
  usecase "Consultar painel\n(planejado)" as Dashboard
  usecase "Consultar alertas\n(planejado)" as Alerts
  usecase "Enviar leitura\n(planejado)" as Ingest
  usecase "Validar e identificar origem\n(planejado)" as Validate
  usecase "Registrar dois timestamps\n(planejado)" as Timestamps
}

Operator --> Health
Operator --> Home
Operator --> Refrigerators
Operator --> History
Operator --> Dashboard
Operator --> Alerts
Simulator --> Ingest
Device --> Ingest
Ingest ..> Validate : <<include>>
Ingest ..> Timestamps : <<include>>
@enduml
```

Detecção automática de anomalias é comportamento interno do sistema, descrito nos diagramas de sequência e estados. Voz e notificações externas ficam fora deste modelo inicial.

## 2. Classes — base de 13/10

```mermaid
classDiagram
    class Geladeira {
        +int Id
        +string Nome
        +string Localizacao
        +DateTime CriadoEmUtc
    }
    class IceplayDbContext {
        +DbSet~Geladeira~ Geladeiras
    }
    IceplayDbContext --> Geladeira : persiste e consulta
```

`Nome` é obrigatório e limitado a 100 caracteres. `Localizacao` é opcional e limitada a 200. `CriadoEmUtc` é gerado em UTC. O diagrama simplifica a assinatura de `Localizacao`; a implementação C# usa `string?`. A existência do modelo não implica a existência de endpoints de cadastro nesta etapa.

## 3. Classes de domínio — evolução planejada

```mermaid
classDiagram
    class Geladeira {
        +int Id
        +string Nome
        +string Localizacao
        +DateTime CriadoEmUtc
    }
    class Leitura {
        +int Id
        +int GeladeiraId
        +double TemperaturaC
        +bool PortaAberta
        +DateTime MedidoEmUtc
        +DateTime RecebidoEmUtc
        +OrigemLeitura Origem
    }
    class Alerta {
        +int Id
        +int GeladeiraId
        +int LeituraId
        +TipoAlerta Tipo
        +OrigemLeitura Origem
        +DateTime DetectadoEmUtc
        +DateTime ResolvidoEmUtc
    }
    class OrigemLeitura {
        <<enumeration>>
        Simulacao
        Hardware
    }
    class TipoAlerta {
        <<enumeration>>
        TemperaturaBaixa
        TemperaturaAlta
        PortaAberta
        AusenciaLeituras
    }
    Geladeira "1" --> "0..*" Leitura : possui
    Geladeira "1" --> "0..*" Alerta : possui
    Leitura "0..1" --> "0..*" Alerta : fundamenta
    Leitura --> OrigemLeitura
    Alerta --> OrigemLeitura
    Alerta --> TipoAlerta
```

`Alerta.LeituraId` e `Alerta.ResolvidoEmUtc` serão anuláveis. Alertas de ausência não precisam de leitura associada. Os tipos e campos futuros são propostas a confirmar na implementação. Limites e durações configuráveis deverão ser incorporados após definição da regra; ainda não há entidade ou contrato definitivo para essa configuração.

## 4. Modelo entidade-relacionamento — evolução planejada

Este diagrama complementa a UML e descreve as relações do armazenamento. Apenas `GELADEIRA` integra a migration inicial.

```mermaid
erDiagram
    GELADEIRA ||--o{ LEITURA : possui
    GELADEIRA ||--o{ ALERTA : possui
    LEITURA o|--o{ ALERTA : fundamenta
    GELADEIRA {
        int Id PK
        string Nome
        string Localizacao "opcional"
        datetime CriadoEmUtc
    }
    LEITURA {
        int Id PK
        int GeladeiraId FK
        double TemperaturaC
        boolean PortaAberta
        datetime MedidoEmUtc
        datetime RecebidoEmUtc
        string Origem
    }
    ALERTA {
        int Id PK
        int GeladeiraId FK
        int LeituraId FK "opcional"
        string Tipo
        string Origem
        datetime DetectadoEmUtc
        datetime ResolvidoEmUtc "opcional"
    }
```

Nomes e tipos SQL concretos serão definidos pelo mapeamento EF e pelas migrations. O diagrama é conceitual. Exclusões que removam evidências históricas devem ser restringidas.

## 5. Componentes — representação em Mermaid

```mermaid
flowchart TB
    subgraph Initial["Base 13/10: aplicação local"]
        Web["Frontend: HTML, CSS, JavaScript"]
        Http["ASP.NET Core: rotas HTTP"]
        Health["Saúde: consulta ao banco"]
        Ef["DbContext e EF Core"]
        Migration["Migrations do esquema"]
        Db[("Arquivo SQLite")]
        Web -->|GET /api/health| Http
        Http --> Health
        Health --> Ef
        Ef --> Db
        Migration -->|aplicação local no desenvolvimento| Db
    end
    subgraph Future["Evolução planejada"]
        Sensor["Simulador / ESP32"]
        Ingestion["Recepção de leituras"]
        Rules["Regras de alertas"]
        History["Histórico e consultas"]
    end
    Sensor -.->|mesmo contrato HTTP| Http
    Http -.-> Ingestion
    Http -.-> History
    Ingestion -.-> Ef
    Ingestion -.-> Rules
    History -.-> Ef
    Rules -.-> Ef
```

O fluxo é uma representação de responsabilidades; não exige processos ou projetos separados para cada caixa. O backend continua uma única aplicação.

## 6. Sequência — verificação de saúde da base

```mermaid
sequenceDiagram
    actor Client as Navegador ou cliente HTTP
    participant Api as GET /api/health
    participant Ef as EF Core
    participant Db as SQLite
    Client->>Api: Solicitar saúde
    Api->>Ef: Contar Geladeiras
    Ef->>Db: Consulta COUNT na tabela Geladeiras
    alt Consulta bem-sucedida
        Db-->>Ef: Quantidade real
        Ef-->>Api: Contagem
        Api-->>Client: HTTP 200: status, database, refrigeratorCount, checkedAtUtc
    else Falha de consulta
        Db-->>Ef: Falha
        Ef-->>Api: Exceção de acesso ao banco
        Api-->>Client: HTTP 503: indisponibilidade sem detalhe interno
    end
```

Banco vazio retorna contagem zero e pode estar saudável. O teste deve confirmar a resposta real; o desenho não é uma captura de execução.

## 7. Sequência — ingestão futura

```mermaid
sequenceDiagram
    actor Sender as Simulador ou ESP32
    participant Api as API de leituras
    participant Db as EF Core / SQLite
    participant Rules as Serviço de alertas planejado
    Sender->>Api: POST /api/leituras com origem e medidoEmUtc
    Api->>Api: Validar payload e normalizar UTC
    alt Payload inválido
        Api-->>Sender: HTTP 400
    else Payload válido
        Api->>Db: Consultar geladeira
        alt Geladeira ausente
            Db-->>Api: Não encontrada
            Api-->>Sender: HTTP 404
        else Geladeira existente
            Db-->>Api: Geladeira
            Api->>Api: Gerar recebidoEmUtc no servidor
            Api->>Db: Persistir leitura com origem e dois tempos
            Db-->>Api: ID da leitura
            Api->>Rules: Avaliar leitura e estado anterior da mesma origem
            Rules->>Db: Registrar ou resolver alerta quando aplicável
            Db-->>Rules: Persistência confirmada
            Rules-->>Api: Avaliação concluída
            Api-->>Sender: HTTP 201 com identificação
        end
    end
```

É uma sequência de projeto. A garantia entre gravação da leitura e atualização dos alertas deverá ser definida na etapa das regras, incluindo transação e tratamento de falhas. Temperatura e porta não geram medições físicas quando o emissor é o simulador.

## 8. Sequência — ausência futura de leituras

```mermaid
sequenceDiagram
    participant Timer as Verificação periódica interna
    participant Rules as Serviço de monitoramento planejado
    participant Db as EF Core / SQLite
    Timer->>Rules: Verificar no instante atual UTC
    Rules->>Db: Consultar monitoramentos esperados e último recebimento por origem
    Db-->>Rules: Expectativa, intervalo e último recebidoEmUtc
    alt Monitoramento ainda não esperado
        Rules->>Rules: Não gerar alerta de ausência
    else Monitoramento esperado
        Rules->>Rules: Comparar referência de recebimento com intervalo configurado
        alt Intervalo ultrapassado
            Rules->>Db: Abrir alerta de ausência se não houver ocorrência aberta
        else Comunicação recente
            Rules->>Db: Resolver ocorrência aberta conforme regra definida
        end
    end
```

Na ativação sem primeira leitura, uma referência inicial de monitoramento deverá existir para que a regra seja definida. Uma leitura simulada não satisfaz a expectativa de comunicação do hardware. Ausência gera um alerta, não uma leitura artificial.

## 9. Estados — ocorrência futura de alerta

```mermaid
stateDiagram-v2
    [*] --> Aberto: Condição anormal detectada e persistida
    Aberto --> Aberto: Condição continua / preservar a mesma ocorrência
    Aberto --> Resolvido: Critério de resolução atendido
    Resolvido --> [*]: Manter ocorrência no histórico
```

Uma nova condição após resolução origina uma nova ocorrência. O critério de resolução será definido por tipo de alerta. O modelo proposto representa o estado por `ResolvidoEmUtc`: nulo para aberto e preenchido para resolvido. Não existe transição manual implementada na base.

## 10. Implantação — UML em PlantUML

```plantuml
@startuml
node "Computador de desenvolvimento\nWindows / execução local" as Computer {
  node "Navegador" as Browser {
    artifact "HTML, CSS e JavaScript" as Web
  }
  node "Processo ASP.NET Core\n.NET 10" as App {
    artifact "ICEPLAY API" as Api
  }
  database "Arquivo SQLite local" as Db
  node "Simulador futuro" as Simulator
}

node "ESP32 futuro\nHardware não disponível na etapa inicial" as Esp {
  artifact "Firmware futuro" as Firmware
}
node "DS18B20 futuro" as Temperature
node "Sensor magnético futuro" as Door

Browser --> App : HTTP em localhost
Api --> Db : EF Core / SQLite
Simulator ..> Api : HTTP POST /api/leituras\norigem Simulacao
Esp ..> Api : HTTP(S) futuro\ncontrato de ingestão
Temperature ..> Esp : interface de temperatura futura
Door ..> Esp : sinal digital futuro
@enduml
```

A execução inicial é em localhost. Rede externa, autenticação e HTTPS devem ser definidos antes de conectar dispositivos fora do computador local. DS18B20, sensor magnético e ESP32 são implantação prevista, sem alegação de instalação ou ensaio físico.

## 11. Rastreabilidade e atualização

| Diagrama | Requisitos relacionados | Quando revisar |
| --- | --- | --- |
| Casos de uso | RF01–RF13 | A cada alteração de escopo aprovada |
| Classes da base | RF01 e futura RF03 | Após mudança de `Geladeira` ou contexto |
| Classes e ER futuros | RF04–RF11 | Antes e depois de migrations de leituras/alertas |
| Componentes e implantação | RNF01, RNF08–RNF10 | Quando mudar execução, rede ou dependência |
| Sequência de saúde | RF01 | Quando mudar o contrato ou o teste de saúde |
| Sequência de ingestão | RF04–RF06, RF12–RF13 | Ao implementar e validar a API de sensores |
| Sequência de ausência | RF10 | Ao definir e testar expectativa e intervalo |
| Estados de alertas | RF09–RF11 | Ao definir detecção, duplicação e resolução |

Os identificadores são os de [planejamento.md](planejamento.md). A entrega escrita final deve incluir versões de diagramas coerentes com o código e referências para evidências reais; fontes de diagramas planejados não devem ser usadas como resultado de testes.
