# ICEPLAY no iPhone — rede local

Este modo usa a aplicação existente no computador, o mesmo SQLite e a interface responsiva. O computador pode estar conectado por cabo e o iPhone por Wi-Fi ao mesmo roteador. O modo foi testado em software por HTTPS no IPv4 local; **a instalação do certificado, firewall e execução no iPhone físico estão pendentes**.

## Preparar no computador

Abra PowerShell 7 e entre em `C:\Users\otavi\Downloads\iceplay`. Nesta execução, o IP encontrado foi `192.168.1.123/24`, Ethernet. Confirme o IP novamente se trocar de rede:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.AddressState -eq 'Preferred' }
.\scripts\prepare-mobile.ps1 -EnderecoIp 192.168.1.123
```

A preparação gera uma CA local, certificado de servidor para esse IP e código aleatório. Salva os arquivos somente em `.tools/mobile`, fora do Git, com acesso da conta local. Não instala certificados no Windows, não muda a rede nem o banco. Reexecutar com o mesmo endereço preserva o certificado e o código. O certificado de servidor vale 90 dias; os arquivos efetivos contêm sua validade.

O código pode ser consultado **somente no seu computador**, sem colar em conversas, evidências ou capturas:

```powershell
Get-Content .\.tools\mobile\codigo-acesso.txt
Get-FileHash .\.tools\mobile\ICEPLAY-local.cer -Algorithm SHA256
```

Nunca envie `settings.json`, `servidor.pfx` ou `codigo-acesso.txt` para GitHub ou outra IA. Somente `ICEPLAY-local.cer` é público; a página de preparação disponibiliza esse arquivo, nunca a chave privada.

## Liberar somente o necessário

Em **PowerShell 7 como administrador**, na pasta do projeto:

```powershell
.\scripts\mobile-firewall.ps1 -Acao Ativar
```

A regra tem nome específico do ICEPLAY, limita entrada ao IPv4/interface configurados, às portas TCP 5443 e 5081 e a `LocalSubnet`. O perfil atual do Windows é Público; o script preserva esse perfil e mantém o firewall ativo. Use em uma rede local sob seu controle, sem encaminhar portas no roteador. A execução automatizada desta sessão não pôde aplicar a regra por falta de privilégios administrativos; sua criação/remoção ainda precisa ser conferida pelo usuário.

## Iniciar

Encerre a instância anterior com Ctrl+C. Em PowerShell normal:

```powershell
.\scripts\run-mobile.ps1
```

Mantenha o terminal e o computador ligados. Os endereços desta configuração são:

- Computador: `http://localhost:5080` — operação local, incluindo simulador.
- Preparação do iPhone: `http://192.168.1.123:5081` — somente instruções e certificado público; API bloqueada nessa porta.
- Aplicação no iPhone: `https://192.168.1.123:5443/#acesso-movel` — API protegida por sessão.

Não inicie `run.ps1` e `run-mobile.ps1` juntos: compartilham a porta local e o banco. O script móvel recusa portas ocupadas e IP que já não pertença ao computador.

## Instalar o certificado no iPhone

1. Conecte o iPhone ao mesmo roteador. Uma rede de convidados pode impedir a comunicação entre aparelhos.
2. No Safari, abra `http://192.168.1.123:5081`. Essa página HTTP entrega somente o certificado público. Compare o SHA-256 com o exibido no computador; a própria página HTTP não é uma fonte independente para confirmar sua autenticidade.
3. Baixe o certificado **ICEPLAY Local**. Em Ajustes, abra **Perfil Baixado**, confira e instale o perfil. Também pode aparecer em Geral → VPN e Gerenciamento de Dispositivo. Você realiza pessoalmente essa alteração de confiança.
4. Acesse Ajustes → Geral → Sobre → Certificados Confiáveis e ative a confiança total somente para a CA **ICEPLAY Local** que acabou de conferir.
5. Abra `https://192.168.1.123:5443/#acesso-movel`. Caso apareça aviso de certificado, pare e confira IP, validade e instalação; não prossiga ignorando o aviso.
6. Informe o código guardado no computador e toque em **Conectar dispositivo**. Depois use os atalhos inferiores Painel, Geladeiras e Acesso.

A Apple documenta separadamente a [instalação do perfil](https://support.apple.com/pt-br/102400) e a [ativação de confiança SSL/TLS](https://support.apple.com/pt-br/102390). Certificados instalados manualmente exigem essa ativação. Menus podem variar conforme a versão do iOS. Ao encerrar os testes, remova o perfil específico do ICEPLAY do iPhone.

## Verificar no aparelho — pendente

Registrar versão do iOS, data e resultados reais quando o teste ocorrer:

1. Confirmar que HTTPS abre sem aviso e que a API exige código antes de mostrar cadastros.
2. Conectar, consultar a geladeira existente e conferir a saúde real.
3. Cadastrar uma geladeira identificada como teste; consultar, editar e excluir somente esse registro, desde que esteja sem leituras.
4. Para demonstrar monitoramento, enviar explicitamente uma simulação no computador com um ID escolhido pelo usuário e verificar origem, temperatura, porta e horários no iPhone. Isso grava dados de teste por ação explícita, nunca medição física.
5. Conferir orientação vertical/horizontal, campos com teclado aberto, zoom e atalhos inferiores.
6. Sair, verificar que os dados deixam de ser acessíveis e reconectar. Reiniciar o servidor deve exigir nova conexão e preservar os dados SQLite.

Não registrar aprovação dessas etapas antes de executá-las no aparelho. Os testes de viewport e os testes TLS no computador são evidências diferentes.

## Sessão, manutenção e encerramento

O código compartilhado autoriza consulta e alteração para um operador local. Não há contas individuais, perfis de permissão ou auditoria por usuário. A sessão usa cookie HttpOnly/Secure/SameSite Strict, dura até 8 horas sem renovação automática e é invalidada ao reiniciar. Alterações exigem token CSRF; a entrada aceita no máximo oito tentativas por minuto no total da instância. O código não é colocado em URL nem salvo em localStorage/sessionStorage. Não há funcionamento offline ou notificações com a página fechada.

Para encerrar, use **Sair deste dispositivo**, Ctrl+C no servidor e, em PowerShell administrador, remova a regra específica:

```powershell
.\scripts\mobile-firewall.ps1 -Acao Desativar
```

Se o IP mudar ou o certificado expirar, encerre o servidor e remova a regra antiga **antes** de renovar a configuração. Depois execute `prepare-mobile.ps1 -EnderecoIp NOVO_IP -RenovarCertificado`, recrie a regra, instale/confie no novo certificado e use o novo código. A renovação substitui os arquivos locais de acesso; não apaga o SQLite.

Se a página não abrir: confira servidor em execução, IPv4 atual, Wi-Fi do mesmo roteador, regra de firewall e isolamento da rede de convidados. Não desative globalmente o firewall nem exponha as portas na internet. Acesso por 4G/5G e hospedagem pública ficam para uma etapa própria. O simulador continua no computador em localhost; autenticação de sensores remotos ainda requer um contrato específico.
