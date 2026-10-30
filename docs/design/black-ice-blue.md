# ICEPLAY — Black & Ice Blue

Direção apresentada ao aluno antes da aplicação do tema em 30/10/2026. O [estudo vetorial](proposta-black-ice-blue.svg) apresenta marca, componentes e navegação futura, com exemplos sem medições. Não é captura de execução nem prova de telas funcionais.

## Paleta e componentes

| Papel | Cor |
| --- | --- |
| Fundo | `#070B10` |
| Superfície / superfície elevada | `#0E151F` / `#121D2A` |
| Superfície interativa | `#182637` |
| Texto / texto secundário | `#EDF5FC` / `#9CB0C4` |
| Ação / azul-gelo e foco | `#48A9FF` / `#A5DFFF` |
| Texto sobre ação azul | `#04111D` |
| Borda decorativa / borda de controle | `#263546` / `#607B95` |
| Positivo / atenção / erro | `#70D7AC` / `#F1C572` / `#FF929C` |

`wwwroot/theme.css` centraliza os tokens; `styles.css` aplica os componentes e layouts. Os cartões têm raio de 14 px, os controles 8 px, bordas finas e profundidade sutil. A tipografia usa Segoe UI Variable/Segoe UI/system-ui, sem downloads. Verde, amarelo e vermelho ficam reservados ao feedback operacional, atenção, erro e ações destrutivas. Estados continuam descritos por texto, além da cor.

## Floco e efeitos

O símbolo local `wwwroot/assets/iceplay-mark.svg` tem seis eixos e ramificações geométricas. Compõe logotipo e favicon e aparece em detalhes pequenos do cabeçalho (48 px, baixa opacidade) e das chamadas de seção (16 px). Pseudo-elementos decorativos não capturam interação; o símbolo do logotipo tem alt vazio e contêiner oculto da árvore acessível.

Há uma iluminação radial suave na visão geral e sombra azul discreta no símbolo. A decoração é estática. Efeitos de botões respeitam `prefers-reduced-motion`, e a decoração é removida em `forced-colors`. Todos os recursos são locais e seguem a CSP atual. Não houve nova dependência ou animação contínua.

## Aplicação por área

| Área | Situação |
| --- | --- |
| Visão geral e Painel | Tema aplicado a cabeçalho, saúde real, seletores, cartões, ausência de dados e estados de leitura. |
| Geladeiras | Tema aplicado ao cadastro/listagem, detalhes, edição, validação e confirmação de exclusão. |
| Acesso móvel | Mesmo tema nos campos e ações de conectar/sair. |
| Histórico | A API existe; a tela ainda está pendente. Usar os mesmos tokens/controles, filtros e lista/tabela legível com origem e dois timestamps. |
| Alertas | Tela e regras ainda pendentes. Usar cores somente para estados reais; não apresentar contagem como se já houvesse consulta. |
| Configurações | Tela e persistência de limites ainda pendentes. Usar formulário por equipamento com os mesmos controles, sem valores aparentemente salvos sem API. |

A navegação funcional atual foi preservada. Não foram criados links mortos ou módulos fictícios para reproduzir o menu futuro do estudo visual.

## Celular e legibilidade

O código conserva breakpoints de 700/920/1000 px, uma coluna no celular, campos móveis de 16 px, área segura inferior do iPhone e alvos de toque de 44 px ou mais. Há foco azul-gelo explícito, quebra de textos longos e grids flexíveis.

Referências para contraste: [texto, WCAG 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum) e [controles, WCAG 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast). Os pares de tokens avaliados passaram nos limites de 4,5:1 para texto e 3:1 para bordas essenciais; isso não certifica conformidade integral nem valida todos os pixels renderizados.

## Validação e pendência visual

Resultados e comandos: [relatório da etapa](../etapa-visual-2026-10-30.md). Foram executados build, regressões, consultas HTTP de assets e inspeções estáticas. O navegador continuou retornando `Local browser use is disabled in Work settings`, mesmo após o aluno informar que iria habilitá-lo. Falta conferir a renderização em desktop/celular e Safari/iPhone físico. O estudo SVG não substitui essa execução.
