# Modelagem consolidada do ICEPLAY

Modelo do código, revisado em 17/11/2026 contra a versão `98dabcc`. `uml.md` e as figuras de `diagramas/` permanecem como versões históricas. Os diagramas descrevem software atual; o nó físico está preparado em firmware, sem ensaio de sensores executado. O reconhecimento USB de 16/11 é parcial. O [complemento editável](tcc/materiais-modelagem-2026-11-17/README.md) contém os requisitos, oito casos de uso detalhados, classes completas, figuras e rastreabilidade dos testes. As figuras são modelos, não capturas de execução.

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

![Casos de uso do ICEPLAY](tcc/materiais-modelagem-2026-11-17/figuras/casos-de-uso.svg)

Fonte: código e requisitos do ICEPLAY, com assistência de IA, 17/11/2026. O limite deste modelo é a aplicação ICEPLAY: Operador e Emissor de leituras são papéis externos; relógio, worker e SQLite são internos. Por isso, o relógio não é ator nesta revisão. O emissor pode ser o simulador ou o futuro ESP32; o envio físico continua pendente. Não foram adicionados casos de uso fictícios de login por usuário/senha ou encerramento manual de alertas.

Fonte editável em [PlantUML](tcc/materiais-modelagem-2026-11-17/figuras/casos-de-uso.puml). O SVG/PNG foi desenhado a partir do mesmo catálogo, sem executar um renderizador PlantUML nesta entrega:

```plantuml
@startuml
left to right direction
actor Operador
actor "Emissor de leituras" as Emissor
rectangle ICEPLAY {
  usecase "UC01 Autorizar navegador" as UC01
  usecase "UC02 Gerenciar geladeiras" as UC02
  usecase "UC03 Consultar painel" as UC03
  usecase "UC04 Consultar histórico" as UC04
  usecase "UC05 Configurar monitoramento" as UC05
  usecase "UC06 Consultar alertas" as UC06
  usecase "UC07 Gerenciar credencial" as UC07
  usecase "UC08 Enviar leitura" as UC08
}
Operador -- UC01
Operador -- UC02
Operador -- UC03
Operador -- UC04
Operador -- UC05
Operador -- UC06
Operador -- UC07
Emissor -- UC08
note bottom of Emissor
Simulador executado; ESP32 apenas compilado.
end note
@enduml
```

Os oito casos estão [especificados com pré-condições, fluxo, alternativas, pós-condições e testes](tcc/materiais-modelagem-2026-11-17/modelagem-validacao.md#5-casos-de-uso). Enviar leitura exige geladeira e contrato válidos; com credencial, equipamento/origem autorizados. Consultar histórico exige equipamento/origem; alterar parâmetros exige entradas válidas e sessão/CSRF no acesso móvel protegido. A avaliação assíncrona das regras é detalhada na sequência abaixo.

## Classes e cardinalidades

![Classes e relacionamentos](tcc/materiais-modelagem-2026-11-17/figuras/classes.svg)

Fonte: Models e IceplayDbContext do ICEPLAY, com assistência de IA, 17/11/2026. O diagrama apresenta as seis entidades, todos os 49 atributos públicos e as sete associações efetivamente mapeadas no EF Core. `?` indica atributo anulável em C#. Não foram inventados métodos nas entidades: operações são implementadas em controllers e serviços.

O [dicionário completo e as multiplicidades/regras de exclusão](tcc/materiais-modelagem-2026-11-17/modelagem-validacao.md#6-classes-e-persistência), o [modelo JSON](tcc/materiais-modelagem-2026-11-17/modelo-classes.json) e a [fonte PlantUML](tcc/materiais-modelagem-2026-11-17/figuras/classes.puml) permitem conferir a figura. `UltimaLeituraId` do checkpoint é marcador e **não possui FK declarada**. Leituras legadas podem não ter dispositivo/UUID; o vínculo da leitura de abertura de alerta também é opcional. Não há tabela separada para enumerações. As figuras antigas foram preservadas como histórico e a versão completa acima é a referência para o TCC atual.

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
