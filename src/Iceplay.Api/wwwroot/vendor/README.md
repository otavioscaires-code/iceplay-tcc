# QR Code generator — Project Nayuki

`qrcodegen-v1.8.0.js`: artefato oficial ES6 da versão 1.8.0, sem alterações.

- Origem: <https://github.com/nayuki/QR-Code-generator/releases/download/v1.8.0/qrcodegen-v1.8.0-es6.js>
- Documentação: <https://www.nayuki.io/page/qr-code-generator-library>
- SHA-256: `6a1116192ed1dd67fa1bf31e77f5817103d71c23bbac24c382e698b7668bdd01`
- Licença MIT, preservada no cabeçalho do arquivo. Não atribuir esta biblioteca ao autor do ICEPLAY.

Usada somente na página Acesso para codificar o convite temporário como SVG. A geração é local, sem CDN, serviço externo, npm ou pacote NuGet. O QR tem margem branca de quatro módulos, preto sobre branco e não recebe logotipo sobre os dados. A autenticação e o consumo único são responsabilidade da API, não da biblioteca.

## Leitura — jsQR 1.4.0

`jsqr-v1.4.0.js`: `dist/jsQR.js` extraído, sem alterações, do pacote oficial <https://registry.npmjs.org/jsqr/-/jsqr-1.4.0.tgz>. Licença Apache-2.0 preservada em `jsqr-LICENSE.txt`; pacote sem arquivo NOTICE. Projeto: <https://github.com/cozmo/jsQR>.

- Integridade do pacote verificada com SHA-512/SRI: `sha512-dxLob7q65Xg2DvstYkRpkYtmKm2sPJ9oFhrhmudT1dZvNFFTlroai3AWSpLey/w5vMcLBXRgOJsbXpdN9HzU/A==`.
- SHA-256 JS: `bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859`.
- SHA-256 licença: `c6596eb7be8581c18be736c846fb9173b69eccf6ef94c5135893ec56bd92ba08`.

Decodifica os pixels do vídeo em memória no navegador. O ICEPLAY controla câmera, valida a origem do convite e autentica pela API existente. Sem upload de imagens, CDN ou instalação de npm. As bibliotecas têm autores próprios e não são código original do TCC.
