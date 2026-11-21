# Cenários virtuais — Etapa 07

Escolha o fundo antes de iniciar a captura. Há quatro ilustrações locais em `public/backgrounds/` para Laboratório de Inteligência Artificial, Centro de dados, Redes Neurais e Laboratório de Robótica. A opção Fundo original segue pelo fluxo anterior de composição. As ilustrações foram criadas para o projeto e exportadas como WebP de 1200 × 675 para decodificação no worker. Elas não dependem de fontes, scripts ou imagens externas.

## Modelo e execução

Usamos o MediaPipe Selfie Segmenter quadrado, versão 1 com pesos FP16, via `@mediapipe/tasks-vision` e WASM locais. A entrada do modelo é 256 × 256. A máscara de confiança permite suavizar a transição entre pessoa e fundo. O modelo binário tem 249.537 bytes e seu SHA-256 é `191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b`. O [modelo oficial](https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite) está em `public/models/selfie_segmenter.tflite` e a [ficha do modelo](https://huggingface.co/litert-community/MediaPipe-ImageSegmenter-Selfie-Square) indica Apache-2.0. O texto da licença está em `public/mediapipe/LICENSE`.

A cabine captura o JPEG original e, para cenários virtuais, reserva a execução de visão. O worker de gestos conclui o trabalho já iniciado e fica sem novas inferências durante a segmentação. O segmentador é carregado sob demanda em um segundo Web Worker e recebe uma cópia reduzida a até 512 px no maior lado. A máscara suave volta à resolução original no Canvas. A foto mantém enquadramento e orientação, o cenário cobre proporcionalmente o fundo e a moldura 4:3 ou 16:9 é desenhada por último. O resultado é um JPEG 0,95 e a sessão conserva o original separado.

O worker libera o resultado do modelo, os bitmaps e as superfícies ao concluir. Uma superfície RGBA em 1920 × 1080 ocupa cerca de 8 MiB. O Canvas final e o bitmap original usam juntos cerca de 16 MiB nessa resolução, além do cenário, da moldura, da máscara e da memória de WASM, que varia por navegador. Em caso de cancelamento ou após 25 s, o worker é encerrado e a cabine aplica a moldura ao fundo original. A câmera continua aberta. É necessário suporte do navegador a Web Workers, OffscreenCanvas, ImageBitmap e ao runtime WASM do MediaPipe.

## Validação no equipamento do evento

1. Execute `npm run dev` e valide cada cenário com DroidCam e webcam, em 640 × 480 e 1920 × 1080. Observe contorno do cabelo, roupas e mãos, além de iluminação e contraste variados.
2. Confira que a prévia continua fluida enquanto o worker prepara a foto. Confirme pelo botão e por `Thumb_Up`. Teste cancelar o cenário, repetir a captura, trocar a câmera e sair durante o processamento.
3. Verifique o fundo original e simule a falta do modelo para confirmar que a foto recebe a moldura e pode ser confirmada. Teste em rede isolada após servir os arquivos locais.

O modelo é voltado a retratos. Penumbras, movimento, cabelos finos, acessórios, participantes distantes ou múltiplas pessoas podem degradar as bordas. A cabine mantém o original se não houver uma máscara com confiança suficiente. As fotos não são enviadas a serviços externos. A validação física de qualidade e fluidez continua pendente.

Em Chrome headless, o worker do build processou um retrato público do MediaPipe em 640 × 480 e 1920 × 1080. As tarefas completas, com inicialização do modelo, levaram 10,6 s e 8,2 s. A checagem do JPEG verificou as dimensões, pixels da pessoa preservados, pixels do fundo substituídos e a arte oficial sobre a composição. O ensaio não mede a latência nem o FPS com câmeras físicas.
