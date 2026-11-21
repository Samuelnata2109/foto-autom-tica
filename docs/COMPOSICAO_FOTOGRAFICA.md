# Composição fotográfica — Etapa 06

A cabine usa duas artes oficiais Redes Neurais, incluídas no build pelo Vite. Os PNGs fornecidos foram copiados byte a byte e têm canal alfa.

| Proporção da captura | Arte em `src/assets/frames/`   | Dimensões da arte |
| -------------------- | ------------------------------ | ----------------- |
| 16:9                 | `feira-das-profissoes.png`     | 1920 × 1080       |
| 4:3                  | `feira-das-profissoes-4x3.png` | 640 × 480         |

A escolha usa as dimensões do JPEG original e compara as proporções exatamente. A resolução informada pelo driver, a configuração do celular e o nome da câmera não determinam a escolha. Se o DroidCam entregar 1920 × 1080 ao navegador, a moldura será 16:9. A seleção acontece na composição, após a captura.

O Canvas tem o tamanho exato da fotografia. Ele desenha o quadro inteiro na orientação original e redimensiona somente a arte, proporcionalmente, para sobrepor com alfa `source-over`. Isso preserva a parte superior e inferior da captura 4:3 e permite usar a arte de 640 × 480 em fotos 4:3 maiores. O espelhamento da prévia não afeta o JPEG final, que usa qualidade 0,95.

Outras proporções, incluindo retrato e medidas apenas próximas de 16:9 ou 4:3, mantêm o JPEG original, com aviso na revisão. A cabine também mantém o original quando falta a arte correspondente, a proporção da arte é incompatível ou a composição falha.

O estado da sessão conserva o original separado do resultado, que expõe Blob, dimensões e URL temporária. A confirmação manual e o comando `Thumb_Up` aprovam o mesmo resultado exibido. Repetir ou sair revoga a URL. A composição fecha os bitmaps e libera o Canvas, inclusive em caso de falha. Sair da cabine aborta a operação pendente. Se a câmera for desconectada após o JPEG original estar pronto, a revisão continua disponível. O processamento é local.

Com cenário virtual, a Etapa 07 segmenta o primeiro plano antes da moldura e exporta o JPEG no worker. O fluxo de fundo original também é usado como alternativa após cancelamento ou falha. Consulte [Cenários virtuais](CENARIOS_VIRTUAIS.md).

Na revisão, as dimensões do JPEG determinam a proporção do painel. O painel respeita a largura disponível e o limite de 65% da altura visível. A imagem ocupa sua largura com altura proporcional, sem margem interna. Antes, o limite de altura do painel não limitava a altura do elemento de imagem. No ensaio em Chrome, uma captura 4:3 ocupou 824 px de altura em um painel com limite próximo de 457 px. Com o ajuste, o painel e a imagem acompanham o mesmo enquadramento.

Na região inspecionada da abertura da arte 4:3 (x de 25 a 614, y de 120 a 420), não foram encontrados pixels quase pretos com alfa acima de 4/255. Os PNGs originais continuam em uso. Com uma fotografia pública e um padrão sintético em 640 × 480 e 1920 × 1080, o Chrome confirmou as dimensões finais e pixels preservados à esquerda, no centro e à direita da abertura. O ensaio não reproduziu as faixas laterais relatadas. Se elas aparecerem dentro do próprio JPEG, compare com o quadro original do DroidCam. A composição conserva qualquer faixa que já faça parte do quadro entregue pelo dispositivo.

## Validação física

1. Execute `npm run dev`. Para testar gestos, prepare o modelo com `npm run setup:gesture-model` se necessário.
2. Capture em 1920 × 1080 e 640 × 480. Confira as dimensões na revisão, a arte correspondente e a preservação do enquadramento em 4:3. Use um objeto com texto para conferir a orientação com a prévia espelhada e sem espelhamento.
3. Confirme pelo botão e repita a operação com `Thumb_Up`. Teste tirar novamente, sair durante o processamento e retornar à cabine.
4. Sem o PNG, ou com um PNG de teste inválido localmente, confirme que a revisão avisa e mantém a foto original.

A aprovação depende da validação com o equipamento do evento.
