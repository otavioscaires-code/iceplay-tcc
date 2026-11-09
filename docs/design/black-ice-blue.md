# ICEPLAY — Black & Ice Blue

Direção apresentada ao aluno antes da aplicação do tema em 30/10/2026; situação das áreas atualizada em **09/11/2026**. O [estudo vetorial](proposta-black-ice-blue.svg) preserva a proposta original de marca/componentes e a navegação então futura, com exemplos sem medições. Não é captura de execução nem prova de telas funcionais.

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

O símbolo local `wwwroot/assets/iceplay-mark.svg` tem seis eixos e ramificações geométricas. Compõe logotipo e favicon e aparece em detalhes pequenos dos cabeçalhos de página e das chamadas de seção, com baixa opacidade. Pseudo-elementos decorativos não capturam interação; o símbolo do logotipo tem alt vazio e contêiner oculto da árvore acessível.

O tema mantém brilhos discretos e sombra azul no símbolo. A decoração é estática. Efeitos de botões respeitam `prefers-reduced-motion`, e a decoração é removida em `forced-colors`. Todos os recursos são locais e seguem a CSP atual. Não houve nova dependência ou animação contínua.

## Aplicação por área

| Área | Situação |
| --- | --- |
| Visão geral (`/dashboard` ou `/`) | Saúde real, indicadores da consulta, seletores, cartões e estados das últimas leituras. Alertas são explicitamente indisponíveis, sem contagem fictícia. |
| Geladeiras (`/geladeiras`) | Cadastro/listagem, detalhes, edição, validação, confirmação de exclusão, última medição consultada e link para histórico. |
| Acesso móvel (`/acesso`) | Página própria com os campos e ações de conectar/sair. |
| Histórico (`/historico`) | Interface implementada: filtros de equipamento/origem/período, gráfico das amostras da página, tabela com origem e dois timestamps, paginação e estados vazio/erro. |
| Alertas (`/alertas`) | Página própria com mensagem de backend pendente; ainda não gera nem consulta ocorrências. |
| Configurações (`/configuracoes`) | Página própria informa limites/tolerâncias planejados e ausência de persistência/API. Não oferece gravação fictícia. |
| Sobre (`/sobre`) | Base técnica e próximos passos preservados em documento próprio. |

Cada área é um documento HTML independente servido pelo ASP.NET Core, com URL e links normais. A barra lateral fixa no desktop indica a página principal selecionada; no celular, o botão **Menu** abre/fecha a navegação. Isso não utiliza JavaScript para substituir páginas por blocos ocultos. Links antigos de seções são encaminhados aos documentos correspondentes. Backend, endpoints e identidade visual foram reaproveitados.

## Celular e legibilidade

O CSS adapta menu, cartões e filtros às telas estreitas, com uma coluna no celular, campos móveis de 16 px, área segura do iPhone e alvos de toque de 44 px ou mais. Há foco azul-gelo explícito, quebra de textos longos e grids flexíveis. A tabela de histórico tem rolagem horizontal própria. O gráfico representa somente as amostras da página recebida; a escala visual não configura limites de alerta.

Referências para contraste: [texto, WCAG 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum) e [controles, WCAG 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast). Os pares de tokens avaliados passaram nos limites de 4,5:1 para texto e 3:1 para bordas essenciais; isso não certifica conformidade integral nem valida todos os pixels renderizados.

## Validação e pendência visual

O [relatório de 30/10](../etapa-visual-2026-10-30.md) preserva os testes históricos do tema e o bloqueio de navegador então encontrado. Em 09/11, o aluno confirmou parte do uso no iPhone e enviou foto mostrando a página Histórico com tabela/gráfico e três leituras explicitamente simuladas; o [registro manual](../evidencias/2026-11-09-iphone/validacao-manual.md) delimita essa evidência. A foto corresponde à versão anterior aos refinamentos posteriores do gráfico/acesso, que ainda precisam de conferência visual no aparelho. Ela não certifica todas as páginas, orientações ou viewports.

O [relatório de páginas](../etapa-paginas-2026-11-09.md) registra os resultados de software dessa revisão. Verificações HTTP/DOM e o estudo SVG não substituem renderização no navegador ou ensaio físico com sensores.
