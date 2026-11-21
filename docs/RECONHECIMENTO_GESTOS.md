# Reconhecimento de gestos — Etapa 05

## Recursos e origem

- Biblioteca: `@mediapipe/tasks-vision` **1.2.3**, licença Apache-2.0, instalada com versão exata.
- Modelo oficial: [Gesture Recognizer float16/1](https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task), instalado localmente em `public/models/gesture_recognizer.task` por `npm run setup:gesture-model`. [Documentação e model card](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer).
- SHA-256 do arquivo local: `97952348CF6A6A4915C2EA1496B4B37EBABC50CBBF80571435643C455F2B0482` (8.373.440 bytes).
- WASM e loaders: copiados da mesma versão do pacote npm para `public/mediapipe/wasm/`; Apache-2.0, com texto em `public/mediapipe/LICENSE`. A publicação deve manter esses arquivos sob a base configurada no Vite. Nenhum CDN é usado durante a operação.
- A documentação oficial lista os quatro gestos usados pelo projeto e descreve `recognizeForVideo` como chamada síncrona. A licença Apache-2.0 do SDK consta no pacote; a documentação do modelo não declara uma licença separada no model card consultado. Por isso, o binário `.task` não é versionado. Revisar as condições de redistribuição antes de distribuí-lo em implantação pública.

## Fluxo e parâmetros

O participante ativa a IA após abrir a câmera. O hook reutiliza o `HTMLVideoElement` e o `MediaStream` já abertos. O worker recebe um `ImageBitmap` proporcional de até 320 px de largura e analisa no máximo uma mão com CPU/WASM. Quadros novos são amostrados conforme a carga, com teto de 10 Hz e uma inferência pendente. Em caso de falha, a cabine suspende a IA e mantém os controles manuais. A configuração vigente e as medições estão no fim deste documento.

`src/config/gestureConfig.ts` concentra os limiares, os tempos de confirmação e as tolerâncias descritos na configuração vigente no fim deste documento. O tempo vem de `performance.now()`, sem supor frequência fixa de quadros. Trocas de gesto, de estado e perdas de estabilidade prolongadas reiniciam a confirmação. Estados permitidos: `idle` para palma aberta (5 s) e paz (10 s), `countdown` para punho fechado (cancelar), `review` para polegar para cima (confirmar). `capturing` e `confirmed` não aceitam comandos.

A inferência é suspensa quando a IA está desligada, a câmera indisponível, a página oculta, o usuário sai da cabine ou o estado não permite comandos. Ao sair, o worker/modelo é encerrado. Quadros usados para inferência não são armazenados ou transmitidos. O JPEG continua na resolução original da câmera.

## Validação física pendente

Com webcam integrada e DroidCam via Wi-Fi, em `localhost` ou HTTPS:

1. Iniciar a cabine, ativar a IA e confirmar carregamento local do modelo e WASM no navegador.
2. Testar cada gesto pela duração da configuração vigente, além de gestos desconhecidos, baixa iluminação, mãos múltiplas e distâncias de evento.
3. Verificar cancelamento na contagem e confirmação na revisão, sem tocar no computador; verificar que manter um gesto não repete comando.
4. Trocar e desconectar a câmera, desligar a IA, ocultar a aba e sair da cabine durante carregamento/inferência.
5. Comparar fluidez e latência do vídeo com IA ligada/desligada, observar CPU e memória por período prolongado. Se a IA suspender, conferir a fluidez e a retomada manual.
6. Confirmar todos os botões manuais e ausência de chamadas de rede com quadros ou coordenadas.

Essas verificações dependem de hardware e não foram realizadas pelos testes automatizados.

## Revisão corretiva da Etapa 05 — histórico

O intervalo normal entre amostras aceita o período configurado (100 ms no worker ou 200 ms no fallback) mais 150 ms de variação. Uma interrupção maior reinicia a estabilidade sem somar o intervalo. Detecção ausente usa a tolerância separada de 180 ms; intervalos sem detecção não somam tempo de confirmação.

O fallback troca o período efetivo para 200 ms mesmo após o worker estar ativo. A transição invalida quadros pendentes e limpa a confirmação. Timeouts configuráveis de 15 s para inicialização e 3 s para resposta encerram o worker e tentam fallback uma única vez por sessão. Resultados exigem ID pendente, geração de sessão e modo, fonte, elemento de vídeo, estado e época de visibilidade válidos. Promessas antigas só encerram seus próprios recursos. Bitmaps são fechados localmente ou transferidos ao worker, que os fecha em finally.

## Refinamento experimental — posterior ao merge do PR #9

Na validação física, o participante relatou palma confundida com paz, polegar pouco reconhecido e comandos de paz e punho que não completavam. A Etapa 05 está em calibração, aguardando novo teste físico.

No Chrome, com o SDK 1.2.3 e o modelo local, um worker ES usando o loader clássico falhou com `ModuleFactory not set.`. O mesmo teste com `forVisionTasks(wasmRoot, true)` inicializou o modelo e processou um quadro. O build Vite emite o worker como ES e os caminhos são resolvidos na página antes do envio. O painel conserva o erro original ou a identificação do timeout.

No guia, abra **Diagnóstico de gestos**, ative a IA e marque **Observar todas as fases sem executar comandos**. Mostre os quatro gestos individualmente e confira classe bruta, confiança, geometria, votação, estabilidade, intervalos e estado. Ative os 21 pontos para conferir enquadramento e espelhamento. Fechar o painel encerra a observação. Para testar comandos, desmarque a observação, use palma e paz em repouso, punho durante a contagem e polegar durante a revisão. Repita com as duas mãos, nas distâncias de uso, com webcam integrada e DroidCam. Registre apenas os valores exibidos, o comando e eventuais falhas.

Os ângulos e distâncias relativas usam coordenadas 3D do modelo. Conflitos entre classes são bloqueados. O voto usa os escores originais em uma janela de 450 ms e exige 60% do peso para a classe atual. Uma amostra divergente pausa a estabilidade. Interrupções longas reiniciam a confirmação. O painel calcula métricas apenas enquanto aberto e o worker só transfere coordenadas para a sobreposição quando solicitada.

Na imagem pública [thumb_up.jpg](https://storage.googleapis.com/mediapipe-assets/thumb_up.jpg), o modelo oficial classificou polegar com confiança entre 0,689 e 0,743 em quatro inferências alternando 320 e 640 px. A experiência não demonstrou vantagem para 640 px. Mantivemos 320 px, teto de 10 Hz no worker e 5 Hz no fallback. Mantivemos 2 s até medir falsos acionamentos no evento. A confiança experimental de 0,65 exige concordância com a geometria. Nos demais casos aceitos o mínimo continua 0,80. A foto continua na resolução original.

A geometria classificou como `Thumb_Up` os landmarks reais extraídos da imagem pública em ambas as larguras após considerar a extensão do polegar em relação às duas bordas da palma. O teste com uma foto estática não mede precisão para diferentes participantes. O primeiro quadro com a foto levou de 5,9 a 8,0 s em Chrome headless sob carga. O worker prepara o grafo com um quadro vazio antes de anunciar que está pronto, dentro do timeout de inicialização existente. O timeout de resposta dos quadros da câmera continua em 3 s.

## Calibração direcionada — histórico

O usuário aprovou fisicamente palma e paz, mas relatou punho identificado sem cancelamento, polegar inadequado, timeout do worker e fallback a aproximadamente 2,4 Hz. A etapa permanece **em calibração**. Os limites anteriores acima registram o histórico, não a configuração atual.

- **Causa temporal:** 2,4 Hz corresponde a cerca de 417 ms entre amostras, acima dos 350 ms aceitos anteriormente no fallback (200 + 150). A validação agora mede os intervalos entregues, com média móvel e tolerância de 150 ms. Intervalos acima de 750 ms nunca alimentam essa média nem somam estabilidade. Amostras sem detecção pausam a contagem e perdas prolongadas reiniciam o progresso. A frequência de execução continua limitada a 10/5 Hz, independentemente da frequência efetivamente alcançada.
- **Cancelamento:** confirmação específica de 800 ms; somente `countdown`. Cancelar ignora o cooldown global da captura anterior, mas preserva estabilidade, votação, confiança e liberação obrigatória. Os demais comandos continuam com 2 s e cooldown de 2 s. O encaminhamento existente a `capture.cancel()` e `capture.confirm()` foi preservado.
- **Polegar:** a geometria anterior podia classificar um polegar curto estendido como punho, vetando uma classificação oficial válida. Uma verificação complementar, exclusiva da classe bruta `Thumb_Up`, exige quatro dedos flexionados, razão comprimento direto/comprimento articulado do polegar ≥ 0,90 e distância da ponta ao centro da palma ≥ 1,15 vezes a distância da articulação IP ao centro. Usa landmarks 3D e não coordenadas verticais. Não altera as regras de palma e paz. Concordância permite o limiar já existente de 0,65; sem concordância permanece 0,80. Geometria ambígua/conflitante não gera substituição arbitrária de classe. Os valores de extensão, afastamento e quantidade de dedos flexionados aparecem no diagnóstico. Este ajuste é uma hipótese testada com poses sintéticas, ainda sem landmarks da mão do participante para confirmação física.
- **Worker:** timeout de inicialização/aquecimento passa de 15 para 60 s, conforme solicitado e considerando a medição anterior de 38,2 s. O carregamento assíncrono e aquecimento em `OffscreenCanvas` no worker permanecem; a câmera e os comandos manuais não aguardam esse processo. Resposta de inferência continua limitada a 3 s. Erros reais continuam visíveis; timeout encerra o worker e tenta fallback uma vez. Nenhum novo ensaio de latência física foi realizado nesta correção.
- **Preservado:** 320 px apenas para inferência, JPEG original, modelo/SDK, confiança geral, interface principal, privacidade e isolamento de sessões. Nenhuma dependência nova.

### Roteiro físico desta correção

Execute `npm run dev` (e `npm run setup:gesture-model` caso o modelo local esteja ausente). Com webcam e DroidCam, ative a IA e aguarde até 60 s; confira o backend e registre eventual erro específico. Durante o carregamento, verifique vídeo e captura manual. Abra o diagnóstico, ative a observação sem comandos e registre classe bruta/confiança/geometria e métricas do polegar nas duas mãos e diferentes orientações. Não é necessário armazenar imagens.

Desative a observação para testar ações: palma → 5 s; paz → 10 s; punho estável por pelo menos 800 ms durante a contagem → cancelar (inclusive logo após iniciar por gesto); polegar por 2 s na revisão → confirmar. O atraso até a próxima amostra depende da frequência real. Confira também punho breve, mão relaxada, dedos parcialmente abertos, ausência de mão e pausas: não devem disparar comandos. Repita mantendo o gesto após a ação e com IA desligada/reativada. Registre frequência, estabilidade, motivo de bloqueio e comando executado. A aprovação física dos quatro gestos é necessária para encerrar a Etapa 05.

## Proteção da prévia e medições

O relato com DroidCam registrou prévia fluida com a IA desligada e travamentos após `Tempo limite de inferência`, com backend `CPU na thread principal`. O código anterior executava `recognizeForVideo` de forma síncrona na interface depois do timeout. Esse caminho pode bloquear a renderização mesmo com limite de 5 Hz. O timeout antigo iniciava após transferir o bitmap e media todo o percurso até a resposta, incluindo execução e entrega. Ele não distinguia o cálculo do modelo da espera por mensagens. O ensaio histórico de 5,9–8,0 s no primeiro quadro com mão indica que 3 s podem ser insuficientes durante o aquecimento. O relato físico ainda não permite determinar qual fase excedeu o limite. Consulte a [documentação do Gesture Recognizer](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer?tab=Web).

- O MediaPipe usa CPU/WASM exclusivamente no worker. Uma falha encerra o worker e suspende a IA, preservando a câmera e os botões. **Tentar reativar IA** cria um worker novo sob demanda. Não há tentativas automáticas em ciclo.
- O inicializador tem até 60 s. A preparação do bitmap tem até 3 s. A primeira amostra de vídeo aquece o caminho real, tem orçamento separado de 12 s e não executa comandos. Após ela, cada resposta continua limitada a 3 s. O worker sinaliza o início de cada execução para distinguir atraso de entrega e atraso após o início.
- A cabine prepara um quadro novo por vez via `requestVideoFrameCallback`, com temporizador em navegadores sem essa API. Enquanto trabalha, nenhum quadro entra em fila. Em regime, a média exponencial do custo entre preparação e resposta ajusta o intervalo entre 100 e 500 ms, com alvo de duas vezes o custo. Após cada resposta, o agendamento também reserva uma pausa de metade do custo observado, limitada a 500 ms. O teto de 10 Hz é um limite de amostragem. Quadros mais lentos podem reduzir a frequência efetiva abaixo de 2 Hz e atrasar ou impedir a confirmação por falta de continuidade. Resultados com mais de 750 ms de idade são descartados para decisões de gesto. A entrada mantém 320 px de largura máxima. O bitmap é transferido e fechado no worker, ou fechado localmente se a operação ficar obsoleta antes da transferência.
- O painel separa os valores reportados por `MediaStreamTrack.getSettings()`, a resolução entregue ao elemento de vídeo, o FPS processado e a estimativa de FPS exibido. A diferença entre os contadores totais e de descarte é amostrada a cada segundo com o painel aberto. O driver virtual pode entregar 1920 × 1080 ao navegador com uma origem configurada para 640 × 480. O FPS reportado na faixa é nominal. O navegador não enxerga diretamente a resolução ou o FPS físico do celular atrás do driver. Referências: [callback de quadros](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback) e [contadores de reprodução](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/getVideoPlaybackQuality).
- O painel mostra frequência média de respostas (inclui pausas), média e máximo dos tempos medidos no worker, preparação média no navegador, tempo de inicialização e contadores de timeout e outras falhas da sessão. As métricas da IA são publicadas em intervalos de pelo menos 500 ms durante a inferência, com atualização adicional em mudanças de estado. A sobreposição opcional recebe os landmarks para acompanhar os quadros amostrados.

No Chrome headless, o worker do build classificou quatro quadros derivados da imagem pública [thumb_up.jpg](https://storage.googleapis.com/mediapipe-assets/thumb_up.jpg) como `Thumb_Up`. Inicializou em 13,16 s, com preparação de 3–10 ms e sinal de início recebido em 1–6 ms após o envio. A primeira inferência levou 892 ms e as três seguintes levaram 291–366 ms. O ensaio isolou o worker com uma imagem estática. O registro histórico de 5,9–8,0 s veio de outra execução sob carga, sem comparação controlada.

Para comparar no equipamento do evento, mantenha a mesma câmera, resolução e iluminação. Deixe os pontos da mão desligados, abra o painel e anote os FPS de prévia em três janelas de 20 s: IA desligada, IA ligada em regime e IA desligada novamente. Compare webcam e DroidCam. Registre as configurações da faixa, média e máximo da inferência, tempo de preparação, frequência da IA e eventuais falhas. Repita palma, paz, punho e polegar, teste a retomada após falha e confira os controles manuais e o JPEG com a moldura oficial. Nenhuma medição física posterior foi concluída nesta correção.

## Tolerância e tempo de confirmação — configuração vigente

A verificação anterior já usava landmarks 3D, mas exigia ângulo e alcance estritos nos quatro dedos. Quando um dedo levemente curvado deixava a geometria inconclusiva, o escore mínimo voltava a 0,80. Se o modelo alternasse entre escores altos e baixos, a confirmação podia pausar repetidamente, sobretudo com amostras espaçadas.

| Gesto             | Confiança com geometria compatível | Confirmação mínima | Comando                    |
| ----------------- | ---------------------------------: | -----------------: | -------------------------- |
| Palma aberta      |                               0,68 |              1,5 s | Inicia 5 s                 |
| Sinal de paz      |                               0,68 |              1,5 s | Inicia 10 s                |
| Punho fechado     |                               0,66 |              0,8 s | Cancela a contagem         |
| Polegar para cima |                               0,65 |              1,5 s | Confirma a foto na revisão |

- A extensão usa a razão entre o comprimento direto e o trajeto articulado do dedo. A palma aceita razão a partir de 0,86 nos quatro dedos. O sinal de paz exige 0,90 no indicador e no médio, separação mínima de 0,28 do tamanho estimado da palma e anelar e mínimo dobrados. O polegar exige os mesmos critérios de extensão da calibração anterior, com pelo menos três dedos dobrados e nenhum dos outros dedos estendido. Essas relações usam os pontos 3D, sem exigir posição na imagem, tamanho fixo da mão ou mão direita.
- Sem apoio da geometria, vale o mínimo de 0,80. Conflitos entre a classe do modelo e a geometria são rejeitados. A histerese aceita até 0,04 a menos apenas para o mesmo gesto já reconhecido e com apoio geométrico. A votação conserva 60% de peso a favor do gesto da amostra atual e usa de 450 a 750 ms conforme a frequência. Aprovar exige pelo menos três amostras. Intervalos sem detecção não entram no tempo de confirmação.
- O cooldown de 2 s continua valendo para início e confirmação. O punho pode cancelar durante esse intervalo. Um gesto mantém o bloqueio até haver pelo menos 300 ms entre observações consistentes de liberação ou troca de gesto. Um quadro incerto não rearma o comando.
- A prévia usa o mesmo Worker CPU/WASM, com entrada de até 320 px, limite adaptativo de 10 Hz e um quadro em processamento. A IA acompanha uma mão por vez. O espelhamento visual da câmera não modifica a entrada do modelo.

### Roteiro de validação física

Com `npm run dev`, ative a IA e selecione a webcam integrada. No painel de diagnóstico, habilite a observação sem comandos. Mostre cada gesto com cada mão, no centro e nas laterais, perto e longe, inclinado para os dois lados e com o espelhamento ligado e desligado. Confira a indicação de mão detectada, a classe e a frequência do Worker. Repita com o DroidCam nas condições de iluminação do evento.

Desligue a observação e execute os quatro comandos nas fases indicadas. Verifique o indicador de progresso e a mensagem após a ação. Mantenha o gesto alguns segundos e confira que dispara apenas uma vez. Ao deixar a mão cair, acenar, apontar ou alternar rapidamente entre palma e paz, confira que a captura não inicia. Compare a latência e os FPS da prévia com a mesma câmera, distância e iluminação. Os testes sintéticos exercitam a geometria e a confirmação. A precisão do modelo em vídeo e a fluidez com cada câmera exigem esse ensaio.

### Continuidade com classificações intermitentes

- A calibração usa primeiro a geometria 3D. Quando ela fica inconclusiva, os pontos do quadro podem corroborar a mesma classe oficial com confiança de pelo menos **0,74**. Os eixos da imagem são convertidos para a mesma unidade com a proporção real do quadro de inferência. A geometria 3D conclusiva conserva a prioridade, inclusive quando contradiz a classe oficial. [Saída do MediaPipe Gesture Recognizer](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer?tab=Web#task-output)
- A confirmação pode preservar o progresso por uma única amostra incerta quando a mão segue visível. Os dois intervalos vizinhos precisam estar dentro da cadência esperada e do teto de **750 ms por intervalo**. O tempo entre a última amostra aceita e a retomada fica fora da confirmação. A primeira amostra após uma pausa apenas retoma a verificação. Pausas prolongadas seguem reiniciando a confirmação.
- Exemplo sintético com amostras a cada 420 ms: a cabine já acumulou 840 ms quando uma classificação incerta chega em 1.260 ms. A classificação aceita de 1.680 ms preserva os 840 ms, e a ação ocorre em 2.520 ms, após acumular 1.680 ms de estabilidade observada. Os tempos de 1,5 s e 800 ms, as fases e o cooldown continuam valendo.
- Durante o teste físico, confira no guia se aparece **Observação ativa · comandos pausados**. No diagnóstico, compare **geometria (3D)** e **geometria (imagem)** ao mudar de posição. Teste também uma pequena rotação sem retirar a mão do enquadramento e verifique se o progresso retoma com segurança. Comandos continuam bloqueados na fase incorreta e a mão permanece limitada a uma por vez.
