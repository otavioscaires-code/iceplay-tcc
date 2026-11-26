# Como usar o ICEPLAY na apresentação

O computador executa a aplicação e guarda o SQLite. A ESP32 envia medições pelo Wi-Fi e pode ser alimentada por carregador USB. O celular consulta a aplicação pela rede local. O computador e a aplicação precisam permanecer ligados.

## Abrir no computador e conectar o celular

1. Extraia o pacote inteiro para uma pasta. Abra `Iniciar-ICEPLAY.cmd` para acesso apenas local, ou `Iniciar-ICEPLAY-Mobile.cmd` com o perfil HTTPS preparado para esse computador e rede. Mantenha a janela do servidor aberta.
2. No computador do servidor, abra [Acesso e QR Code](http://localhost:5080/acesso?modo=qr). Clique em **Gerar QR Code**.
3. Conecte o iPhone ao Wi-Fi da mesma rede. Abra o endereço HTTPS mostrado na página Acesso do computador. Nesta instalação, é `https://192.168.1.123:5443/acesso?modo=qr`; esse IP pode mudar em outro ambiente.
4. Toque em **Ler QR Code**, aponte para o código do computador e confirme **Conectar este dispositivo**. O convite expira em 120 segundos e é de uso único. Reiniciar o servidor exige conectar o celular novamente.

No outro notebook, o perfil HTTPS, o endereço da API usado pela ESP32 e a rede precisam corresponder ao destino. Não basta copiar o perfil privado deste PC. O pacote funciona sem instalar o SDK .NET; a configuração da rede e do certificado continua necessária.

## Entender as páginas

| Página | Uso |
|---|---|
| Visão geral | Selecionar **Hardware** em Origem para acompanhar a ESP32; conferir temperatura, porta, horário e idade da medição. |
| Geladeiras | Consultar e editar os cadastros. Não cadastrar novamente o equipamento que já recebe medições. |
| Histórico | Selecionar equipamento, Hardware e período; consultar tabela e gráfico da página atual. |
| Configurações | Conferir os limites, tempos, origem Hardware e monitoramento ativo da geladeira escolhida. |
| Alertas | Consultar episódios abertos e encerrados. Ler o motivo do encerramento: encerrado nem sempre significa normalizado. |

Os limites atuais de 0 a 28 °C foram usados nos testes de bancada. São parâmetros de ensaio, não uma recomendação para conservação de alimentos. A recência visual do painel é independente dos prazos que geram alertas.

## Testar e ativar o som

1. Abra **Alertas** ou **Visão geral**. Para a placa, selecione **Hardware** em Origem.
2. Toque em **Testar som**. Devem ser ouvidos três bipes; confira volume, saída de áudio e modo silencioso do aparelho se necessário. Esse teste não cria alertas.
3. Toque em **Ativar som**. O aviso acompanha episódios abertos da origem selecionada e repete a cada 30 segundos enquanto houver algum. A consulta é atualizada em até 15 segundos com a página visível.
4. Use **Silenciar** para parar o áudio deste navegador. Os episódios continuam no sistema. Ao navegar ou recarregar, ative novamente.

Temperatura fora da faixa, porta confirmada aberta por tempo suficiente e ausência de medições podem gerar episódios. Apenas a temperatura subir dentro da faixa não dispara alerta por tendência. Em Alertas, o som considera todas as geladeiras da origem escolhida, mesmo com outros filtros de listagem.

Mantenha a página visível e o aparelho desbloqueado. O recurso usa o áudio do navegador; não há buzzer na ESP32 ou aviso garantido com a tela bloqueada, página fechada ou computador desligado.

## Conferir antes de apresentar

- Abrir o pacote no notebook e na rede que serão usados na apresentação.
- Confirmar medições recentes de Hardware, o estado da porta e a configuração do equipamento.
- Parear o celular e confirmar o áudio em cada aparelho usado.
- Guardar uma cópia consistente dos dados reais e os registros dos ensaios.
- Apresentar o ensaio doméstico como protótipo: a janela original de 30 minutos teve queda média de 0,85 °C, abaixo do critério de 1 °C. A extensão exploratória não altera esse resultado.

Se faltar comunicação, confira servidor, Wi-Fi e alimentação USB da placa antes de mexer nas conexões. Não revogue a credencial de uso durante a demonstração: a placa bloqueia os envios após a recusa e exige correção e reinício.
