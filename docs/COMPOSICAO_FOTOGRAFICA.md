# Composição fotográfica — Etapa 06

A moldura oficial Redes Neurais da Feira das Profissões está em `src/assets/frames/feira-das-profissoes.png`. O PNG fornecido tem 1920 × 1080 (16:9), canal alfa e uma região central amostrada de 100 × 100 pixels totalmente transparente. A cópia preserva os bytes da arte original. O Vite inclui o PNG no build. Se houver falha ao aplicar a moldura, a revisão exibe um aviso e permite confirmar ou repetir a foto original.

A cabine captura primeiro o JPEG original. O serviço decodifica a foto e o PNG local, recorta a foto ao centro em 16:9 e usa a resolução da moldura ou a do recorte, a que for maior, arredondada para dimensões inteiras em 16:9. O Canvas desenha a foto na orientação da captura e sobrepõe o PNG com composição alfa `source-over`. O espelhamento da prévia da câmera não é aplicado. O JPEG final tem qualidade 0,95.

O estado da sessão conserva o original separado do resultado, que expõe Blob, dimensões e URL temporária. A confirmação manual e o comando `Thumb_Up` aprovam o mesmo resultado exibido. A câmera usa o mesmo fluxo da sessão. Repetir ou sair revoga a URL. A composição fecha os bitmaps e libera o Canvas, inclusive em caso de falha. Saída ou troca de câmera invalida a operação pendente. O processamento é local.

## Validação física

1. Execute `npm run dev`. Para testar gestos, prepare o modelo com `npm run setup:gesture-model` se necessário.
2. Capture na webcam e no DroidCam com prévia espelhada e sem espelhamento. Use um objeto com texto para conferir a orientação. Verifique centro transparente, alinhamento das bordas e dimensões na revisão, inclusive com uma câmera 4:3.
3. Confirme pelo botão e repita a operação com `Thumb_Up`. Teste tirar novamente, sair durante o processamento e retornar à cabine.
4. Sem o PNG, ou com um PNG de teste inválido localmente, confirme que a revisão avisa e mantém a foto original.

A aprovação depende da validação com o equipamento do evento.
