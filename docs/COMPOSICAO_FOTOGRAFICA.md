# Composição fotográfica — Etapa 06

A cabine usa duas artes oficiais Redes Neurais, incluídas no build pelo Vite. Os PNGs fornecidos foram copiados byte a byte e têm canal alfa.

| Proporção da captura | Arte em `src/assets/frames/`   | Dimensões da arte |
| -------------------- | ------------------------------ | ----------------- |
| 16:9                 | `feira-das-profissoes.png`     | 1920 × 1080       |
| 4:3                  | `feira-das-profissoes-4x3.png` | 640 × 480         |

A escolha usa as dimensões do JPEG original e compara as proporções exatamente. A resolução informada pelo driver, a configuração do celular e o nome da câmera não determinam a escolha. Se o DroidCam entregar 1920 × 1080 ao navegador, a moldura será 16:9. A seleção acontece na composição, após a captura.

O Canvas tem o tamanho exato da fotografia. Ele desenha o quadro inteiro na orientação original e redimensiona somente a arte, proporcionalmente, para sobrepor com alfa `source-over`. Isso preserva a parte superior e inferior da captura 4:3 e permite usar a arte de 640 × 480 em fotos 4:3 maiores. O espelhamento da prévia não afeta o JPEG final, que usa qualidade 0,95.

Outras proporções, incluindo retrato e medidas apenas próximas de 16:9 ou 4:3, mantêm o JPEG original, com aviso na revisão. A cabine também mantém o original quando falta a arte correspondente, a proporção da arte é incompatível ou a composição falha.

O estado da sessão conserva o original separado do resultado, que expõe Blob, dimensões e URL temporária. A confirmação manual e o comando `Thumb_Up` aprovam o mesmo resultado exibido. A câmera usa o mesmo fluxo da sessão. Repetir ou sair revoga a URL. A composição fecha os bitmaps e libera o Canvas, inclusive em caso de falha. Saída ou troca de câmera invalida a operação pendente. O processamento é local.

## Validação física

1. Execute `npm run dev`. Para testar gestos, prepare o modelo com `npm run setup:gesture-model` se necessário.
2. Capture em 1920 × 1080 e 640 × 480. Confira as dimensões na revisão, a arte correspondente e a preservação do enquadramento em 4:3. Use um objeto com texto para conferir a orientação com a prévia espelhada e sem espelhamento.
3. Confirme pelo botão e repita a operação com `Thumb_Up`. Teste tirar novamente, sair durante o processamento e retornar à cabine.
4. Sem o PNG, ou com um PNG de teste inválido localmente, confirme que a revisão avisa e mantém a foto original.

A aprovação depende da validação com o equipamento do evento.
