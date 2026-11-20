# Reconhecimento de gestos — Etapa 05

## Recursos e origem

- Biblioteca: `@mediapipe/tasks-vision` **1.2.3**, licença Apache-2.0, instalada com versão exata.
- Modelo oficial: [Gesture Recognizer float16/1](https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task), instalado localmente em `public/models/gesture_recognizer.task` por `npm run setup:gesture-model`. [Documentação e model card](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer).
- SHA-256 do arquivo local: `97952348CF6A6A4915C2EA1496B4B37EBABC50CBBF80571435643C455F2B0482` (8.373.440 bytes).
- WASM e loaders: copiados da mesma versão do pacote npm para `public/mediapipe/wasm/`; Apache-2.0, com texto em `public/mediapipe/LICENSE`. A publicação deve manter esses arquivos sob a base configurada no Vite. Nenhum CDN é usado durante a operação.
- A documentação oficial lista os quatro gestos usados pelo projeto e descreve `recognizeForVideo` como chamada síncrona. A licença Apache-2.0 do SDK consta no pacote; a documentação do modelo não declara uma licença separada no model card consultado. Por isso, o binário `.task` não é versionado. Revisar as condições de redistribuição antes de distribuí-lo em implantação pública.

## Fluxo e parâmetros

O participante ativa a IA após abrir a câmera. O hook usa o `HTMLVideoElement` e o `MediaStream` já abertos; nenhum novo `getUserMedia` é feito. Um `ImageBitmap` proporcional de até 320 px de largura é enviado ao worker, que processa no máximo uma mão com CPU e retorna apenas nome e confiança do gesto. Apenas quadros novos são aceitos. Há no máximo uma inferência pendente e aproximadamente 10 inferências por segundo. Quadros intermediários são descartados. Se o worker falhar, a alternativa na thread principal limita a 5 inferências por segundo; pode afetar a fluidez em máquinas lentas.

`src/config/gestureConfig.ts` concentra confiança mínima 0,80, confirmação estável por 2 s, tolerância de 180 ms a perda momentânea e intervalo de 2 s entre comandos. O tempo vem de `performance.now()`, sem supor frequência fixa de quadros. A perda de estabilidade ou troca de gesto reinicia a confirmação; o mesmo gesto deve ser liberado ou trocado para repetir. A mudança de estado limpa o progresso. Estados permitidos: `idle` para palma aberta (5 s) e paz (10 s), `countdown` para punho fechado (cancelar), `review` para polegar para cima (confirmar). `capturing` e `confirmed` não aceitam comandos.

A inferência é suspensa quando a IA está desligada, a câmera indisponível, a página oculta, o usuário sai da cabine ou o estado não permite comandos. Ao sair, o worker/modelo é encerrado. Quadros usados para inferência não são armazenados ou transmitidos. O JPEG continua na resolução original da câmera.

## Validação física pendente

Com webcam integrada e DroidCam via Wi-Fi, em `localhost` ou HTTPS:

1. Iniciar a cabine, ativar a IA e confirmar carregamento local do modelo e WASM no navegador.
2. Testar cada gesto por 2 s, gestos desconhecidos, baixa iluminação, mãos múltiplas e distâncias de evento.
3. Verificar cancelamento na contagem e confirmação na revisão, sem tocar no computador; verificar que manter um gesto não repete comando.
4. Trocar e desconectar a câmera, desligar a IA, ocultar a aba e sair da cabine durante carregamento/inferência.
5. Comparar fluidez e latência do vídeo com IA ligada/desligada, observar CPU e memória por período prolongado. Se ocorrer fallback, verificar novamente latência.
6. Confirmar todos os botões manuais e ausência de chamadas de rede com quadros ou coordenadas.

Essas verificações dependem de hardware e não foram realizadas pelos testes automatizados.

## Revisão corretiva da Etapa 05

O intervalo normal entre amostras aceita o período configurado (100 ms no worker ou 200 ms no fallback) mais 150 ms de variação. Uma interrupção maior reinicia a estabilidade sem somar o intervalo. Detecção ausente usa a tolerância separada de 180 ms; intervalos sem detecção não somam tempo de confirmação.

O fallback troca o período efetivo para 200 ms mesmo após o worker estar ativo. A transição invalida quadros pendentes e limpa a confirmação. Timeouts configuráveis de 15 s para inicialização e 3 s para resposta encerram o worker e tentam fallback uma única vez por sessão. Resultados exigem ID pendente, geração de sessão e modo, fonte, elemento de vídeo, estado e época de visibilidade válidos. Promessas antigas só encerram seus próprios recursos. Bitmaps são fechados localmente ou transferidos ao worker, que os fecha em finally.
