# Progresso

## 19/11/2026 — Etapa 01/12 — Planejamento e arquitetura

- **Status:** integrada a `develop` pelo [PR #3](https://github.com/Samuelnata2109/foto-autom-tica/pull/3), merge `c8bd557`.
- **Entregas:** página provisória em português, configuração da aplicação e das
  verificações automatizadas, estrutura modular e planejamento técnico das próximas etapas.
- **Arquivos:** `index.html`, `src/main.tsx`, `src/pages/HomePage.tsx`, `src/styles.css`,
  `tests/HomePage.test.tsx`, `package.json`, `package-lock.json`, `tsconfig.json`,
  `vite.config.ts`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.env.example`,
  `.gitignore`, `README.md` e os cinco documentos em `docs/`.
- **Decisões:** TypeScript estrito, Tailwind pelo plugin do Vite, teste de renderização
  sem navegador e criação dos módulos conforme o primeiro uso.
- **Dependências:** React e React DOM em execução. Vite, Tailwind CSS e seus plugins,
  TypeScript e tipos, ESLint, Prettier e Vitest em desenvolvimento.
- **Validação:** `npm run lint`, `npm run typecheck`, `npm run test` (2 testes aprovados)
  e `npm run build` passaram com Node.js 26.13.1 e npm 11.20.0. A auditoria reportou zero
  vulnerabilidades no momento da instalação. Nenhum erro foi encontrado nesses quatro scripts.
- **Validação manual pendente:** abrir a página com `npm run dev` e conferir a legibilidade
  e o conteúdo em tamanhos de tela diferentes. Esta etapa não exige equipamentos físicos.
- **Limitações:** a página é provisória. Vídeo, gestos, fotos e integrações permanecem
  no planejamento e serão validados nas respectivas etapas.
- **Branch:** `feature/01-project-architecture`.
- **Commit de implementação:** `bac3f59`.
- **Próxima etapa:** 02 — Interface e identidade visual, após revisão e autorização.

## 19/11/2026 — Etapa 02/12 — Interface e identidade visual

- **Status:** integrada a `develop` pelo [PR #5](https://github.com/Samuelnata2109/foto-autom-tica/pull/5), merge `5495a62`.
- **Entregas:** recepção, cabine, guia lateral de gestos, seleção visual de 5 e 10 segundos,
  controle de tela cheia e prévias de contagem, revisão e compartilhamento.
- **Arquivos:** `src/App.tsx`, `src/main.tsx`, `src/pages/`, `src/components/`, `src/hooks/`,
  `src/styles.css`, `tests/BoothFlow.test.tsx`, `public/licenses/`, manifestos npm, README e
  documentação em `docs/`. O teste da página provisória foi substituído pelo teste do fluxo.
- **Decisões:** design tokens em CSS, fontes latinas locais, rotas com fragmento,
  rádio nativo, Motion com movimento reduzido e prévias exclusivas de desenvolvimento.
- **Dependências:** Lucide React, Motion, React Router, Fontsource Inter e Space Grotesk.
  jsdom para testes. Node.js 22.22.2+, 24.15+ ou 26 nas respectivas séries.
- **Validação automatizada:** lint, typecheck, build e 6 testes passaram em Node.js 26.13.1.
  npm reportou zero vulnerabilidades na instalação.
- **Chrome headless:** recepção e cabine em 1920×1080, 1366×768, 1280×720, 768×1024,
  390×844 e 320×568. Foram verificados ausência de rolagem horizontal, posição do painel
  de gestos, navegação e seleção por teclado. As três prévias passaram em 320×568 com
  movimento reduzido. Link e endereço direto das prévias foram verificados em produção.
- **Correções:** imports de fontes e do ícone de compartilhamento, conflito de tipos do Motion
  e rolagem horizontal na recepção de 320 px.
- **Limitações e pendências:** validação presencial em monitor de evento, incluindo tela cheia,
  e revisão humana. A seleção de duração é visual. Recursos fotográficos seguem no roadmap.
- **Branch:** `feature/02-ui-design`.
- **Commit de implementação:** `bda8d36`.
- **Próxima etapa:** 03 — Integração da câmera, após revisão e autorização.

## 20/11/2026 — Etapa 03/12 — Integração da câmera

- **Status:** integrada a `develop` pelo [PR #7](https://github.com/Samuelnata2109/foto-autom-tica/pull/7), merge `17a4b9f`.
- **Entregas:** vídeo ao vivo, seleção e atualização de dispositivos, espelhamento
  da prévia, resolução e FPS informados pelo navegador, estados de erro, desconexão,
  tentativa manual e liberação de recursos.
- **Arquivos:** `src/hooks/useCamera.ts`, `src/services/camera.ts`, componentes de
  câmera, `BoothPage.tsx`, `src/styles.css`, `tests/BoothFlow.test.tsx`, README e
  documentação, incluindo [CONFIGURACAO_CAMERA.md](CONFIGURACAO_CAMERA.md).
- **Decisão:** MediaDevices para webcams físicas e DroidCam virtual. USB e Wi-Fi
  são configurados no cliente DroidCam. A cabine solicita somente vídeo.
- **Dependências:** APIs nativas do navegador e ferramentas já instaladas.
- **Validação automatizada:** lint, typecheck, build, format:check e 15 testes passaram.
  Os testes de câmera usam mocks de MediaDevices e cobrem permissões, seleção,
  desconexão, encerramento, espelhamento e estados da interface.
- **Ajuste de validação:** o limite de tempo do Vitest passou a 15 s para acomodar
  a montagem e navegação de telas no jsdom em ambientes mais lentos.
- **Limitações:** se o driver mantiver a faixa ativa após perder o sinal, confirme
  o vídeo no cliente DroidCam e reinicie a câmera na cabine.
- **Validação física relatada pelo desenvolvedor:** webcam integrada e DroidCam
  via Wi-Fi passaram nos testes de transmissão, alternância de câmera, espelhamento,
  reconexão e tela cheia. Tela verde, atrasos e travamentos foram resolvidos com
  ajustes externos no DroidCam. As configurações não foram informadas. O USB
  não funcionou no equipamento utilizado.
- **Branch:** `feature/03-camera-integration`.
- **Commit de implementação:** `bbc699b`.
- **Próxima etapa:** 04 — Sistema fotográfico, após revisão e autorização.

## 20/11/2026 — Etapa 04/12 — Sistema fotográfico

- **Status:** integrada a `develop` pelo PR #8, merge `64df907`, conforme repositório e confirmação do desenvolvedor.
- **Entregas:** temporizadores de 5 e 10 segundos, cancelamento, captura JPEG, revisão,
  confirmação em memória, repetição e limpeza de recursos.
- **Arquivos:** `src/hooks/useCountdown.ts`, `src/hooks/usePhotoCapture.ts`,
  `src/services/photoCapture.ts`, `src/types/photo.ts`, `src/components/PhotoReview.tsx`,
  controles e visor da cabine, `src/styles.css`, `tests/PhotoCapture.test.tsx` e documentação.
- **Decisões:** prazo monotônico, uma operação por vez e Canvas na resolução original.
  JPEG a 0,95 e Object URL revogada ao repetir ou sair. O espelhamento permanece visual.
- **Dependências:** nenhuma adicionada.
- **Validação automatizada:** lint, typecheck, build e format:check passaram.
  O Vitest aprovou 25 testes, incluindo 10 novos com relógio, vídeo e Canvas simulados.
  A cobertura inclui cancelamento, disparo único, erros, revisão e limpeza de recursos.
- **Limitações:** a confirmação vale apenas para a cabine aberta. A foto é
  descartada ao sair e a personalização aguarda a Etapa 06.
- **Validação física relatada pelo desenvolvedor:** captura JPEG e revisão fotográfica
  aprovadas com webcam integrada e DroidCam via Wi-Fi. Os ajustes externos do DroidCam
  resolveram atraso, travamento e tela verde; as configurações não foram informadas.
  Cancelamento por desconexão durante contagem permanece sem validação física registrada.
- **Branch:** `feature/04-photo-capture`.
- **Commit e PR:** `6b3aaaa`, PR #8 integrado.
- **Próxima etapa:** 05 — Reconhecimento de gestos com IA, após revisão e autorização.

## 20/11/2026 — Etapa 05/12 — Reconhecimento de gestos com IA

- **Status:** implementação em `feature/05-gesture-recognition`, aguardando revisão.
- **Entregas:** reconhecimento local de palma aberta, sinal de paz, punho fechado e polegar para cima; ações conforme estado da sessão; progresso temporal, confiança mínima, tolerância breve, cooldown e liberação do gesto; botão de ativação, estados de IA e orientação contextual; vídeo ativo durante revisão. Os controles manuais continuam disponíveis.
- **Arquivos:** `src/config/gestureConfig.ts`, `src/types/gesture.ts`, `src/services/gestureRecognizer.ts`, `src/services/gestureValidation.ts`, `src/workers/gestureRecognition.worker.ts`, `src/hooks/useGestureRecognition.ts`, `src/components/GestureGuide.tsx`, `src/components/PhotoReview.tsx`, `src/pages/BoothPage.tsx`, `src/styles.css`, `tests/GestureValidation.test.ts`, `tests/GestureRecognition.test.tsx`, `scripts/setup-gesture-model.mjs`, recursos em `public/models/` e `public/mediapipe/wasm/`, README e documentação.
- **Decisões:** modelo oficial float16/1, pacote npm fixo 1.2.3, CPU em worker prioritário, fallback com frequência menor na thread principal, entrada de inferência reduzida independentemente do JPEG. Sem segunda conexão de câmera ou envio de quadros.
- **Dependência:** `@mediapipe/tasks-vision@1.2.3` (Apache-2.0).
- **Validações automatizadas:** lint, typecheck, format:check e build passaram. A suíte passou com 35 testes ao limitar o Vitest a um worker. Uma tentativa paralela anterior teve timeout na inicialização de worker sob carga de I/O, sem falha de asserção nas suítes concluídas.
- **Erros corrigidos:** teste legado do aviso da Etapa 05, expectativa temporal do novo teste e exclusão dos loaders WASM de fornecedor das verificações de código fonte.
- **Limitações:** validação do modelo, precisão, latência e fluidez com webcam/DroidCam pendentes de teste físico. O modelo exige instalação inicial por `npm run setup:gesture-model` e sua licença de redistribuição requer revisão antes de implantação pública.
- **Branch:** `feature/05-gesture-recognition`.
- **Commit/PR:** registrar após publicação. Revisão pendente.
- **Próxima etapa prevista:** 06 — Editor fotográfico, somente após revisão, merge e autorização.

## 20/11/2026 — Revisão corretiva da Etapa 05

- **Escopo:** validação temporal compatível com 5/10 Hz e variação de amostragem; agendamento do fallback atualizado após falha em operação; timeout de inicialização e inferência; descarte de resultados obsoletos e isolamento de promessas entre sessões.
- **Arquivos:** hook de reconhecimento, serviço de validação, configuração, testes de gestos e documentação de reconhecimento.
- **Dependências:** nenhuma adicionada.
- **Branch:** feature/05-gesture-recognition; atualização do PR #9 para develop. Revisão pendente; sem merge.
- **Validação:** resultados registrados no relatório desta revisão. Testes usam inferência simulada; validação física de precisão e fluidez continua pendente.
- **Continuidade:** Etapa 06 depende de autorização.
- **Resultados da revisão:** lint, typecheck, format:check e 43 testes passaram (35 preservados, 8 novos). Build de produção verificado antes do commit. Testes manuais de reconhecimento real continuam pendentes.

## 20/11/2026 — Refinamento de precisão da Etapa 05, em calibração

A validação física relatou comandos de paz e punho incompletos, confusão entre palma e paz, dificuldade com polegar e fallback ativo. A etapa segue pendente de validação física. A falha de inicialização do worker foi reproduzida em Chrome com o SDK e o modelo reais. As medições e o roteiro estão em [Reconhecimento de gestos](RECONHECIMENTO_GESTOS.md).

O ajuste inclui carregador WASM modular, geometria 3D complementar, votação temporal e painel de diagnóstico com observação sem comandos. Foram alterados o hook, worker, configuração, tipos, serviços, página da cabine, estilos e configuração Vite. Os testes de precisão e de integração exercitam o classificador e o envio de comandos. Nenhuma dependência adicionada. O [PR #9](https://github.com/Samuelnata2109/foto-autom-tica/pull/9) foi integrado até `6379962`; o refinamento posterior `b8ad16f` ficou fora desse merge e foi preservado na nova branch corretiva como `ca64ad4`. A precisão e a fluidez com participantes continuam pendentes.

Lint, tipagem, formatação, build e os 55 testes passaram. O worker do build servido sob /booth/ retornou Thumb_Up, confiança 0,741, geometria concordante e 21 pontos na imagem pública. O ensaio direto em Chrome headless demorou 38,2 s até ready e 2,0 s para a resposta seguinte. Com essa latência, a cabine acionaria o fallback pelo timeout de inicialização de 15 s. Medir o tempo no navegador e hardware do evento.

## 20/11/2026 — Calibração direcionada da Etapa 05 (não concluída)

- **Validação física informada pelo usuário:** palma e paz reconhecidas e executadas corretamente; punho reconhecido sem cancelar; polegar inadequado; worker com timeout; fallback observado em aproximadamente 2,4 Hz. Sem novas medições físicas feitas pelo agente.
- **Correções:** amostragem temporal medida com limite de interrupção de 750 ms; punho confirma em 800 ms e pode cancelar durante cooldown; critério complementar exclusivo do polegar e métricas geométricas no diagnóstico; timeout experimental de inicialização/aquecimento de 60 s. Palma/paz e resolução fotográfica preservadas.
- **Arquivos modificados:** configuração, validação temporal, geometria, reconhecedor, tipos, hook, painel de diagnóstico, orientação do guia de gestos, três suítes de gestos e documentação de reconhecimento/progresso.
- **Dependências:** nenhuma adicionada; SDK e modelo mantidos. Carregamento/aquecimento assíncronos no worker reutilizados.
- **Branch:** `fix/05-gesture-calibration`, baseada em `develop` atualizado, com preservação do refinamento anterior (`ca64ad4`). Novo PR para `develop`; referência final no relatório de entrega. Sem merge.
- **Testes:** 66 testes automatizados passaram (`npm run test -- --maxWorkers=1`), incluindo 11 novos casos. Os 55 cenários anteriores foram mantidos; a expectativa antiga de 2 s para cancelamento foi atualizada para os 800 ms solicitados. Testes usam mocks, sem representar validação física.
- **Qualidade:** `npm run lint`, `npm run typecheck`, `npm run build` e `npm run format:check` passaram. Diff revisado, sem arquivos de credenciais adicionados.
- **Limitações/pendências:** hipóteses geométricas verificadas por mocks/poses sintéticas; aprovação física de punho/polegar e confirmação de ausência de regressão em palma/paz pendentes. Roteiro em `RECONHECIMENTO_GESTOS.md`. Aguardar revisão e aprovação; Etapa 06 não iniciada.

## 20/11/2026 — Etapa 06/12 — Composição com a moldura oficial

- **Status:** moldura oficial integrada em `feature/06-photo-frame-editor`, baseada em `develop` após a integração do PR #10. A etapa segue pendente da validação física no equipamento do evento e da revisão do [PR #11](https://github.com/Samuelnata2109/foto-autom-tica/pull/11).
- **Entrega:** composição automática com Canvas, recorte central 16:9 sem espelhamento e JPEG 0,95. A revisão mantém o original em memória e confirma o resultado exibido por botão ou pelo comando do polegar. Na ausência ou falha da moldura, a revisão avisa e utiliza o original.
- **Arquivos:** serviço `photoComposition.ts`, hook `usePhotoCapture.ts`, tipo `photo.ts`, componente `PhotoReview.tsx`, testes `PhotoComposition.test.ts` e `PhotoCapture.test.tsx`, instruções em `src/assets/frames/README.md` e [composição fotográfica](COMPOSICAO_FOTOGRAFICA.md).
- **Dependências:** nenhuma adicionada. A composição fecha bitmaps, libera o Canvas e mantém a URL temporária sob o ciclo de vida da sessão.
- **Testes automatizados:** 74 testes passaram com `npm run test -- --maxWorkers=1 --pool=threads`. A suíte cobre composição com mocks de Canvas, localização automática da arte, falhas, liberação de recursos e confirmação na cabine. A primeira execução sofreu timeout na inicialização de um worker do Vitest.
- **Arte oficial:** `src/assets/frames/feira-das-profissoes.png` recebeu uma cópia byte a byte do arquivo fornecido. Confirmados 1920 × 1080, proporção 16:9 e alfa zero em todos os 10.000 pixels da amostra central.
- **Validação no navegador:** Chrome em modo headless compôs o PNG oficial sobre um JPEG sintético de 1920 × 1080. A leitura do JPEG final confirmou a cor da foto no centro e a arte incorporada na borda.
- **Pendências:** testar com as câmeras do evento e aprovar a revisão. A Etapa 07 depende de autorização.

## 20/11/2026 — Correção de desempenho da IA na cabine

- **Status:** correção em `fix/gesture-worker-performance`, baseada na Etapa 06 com a moldura oficial. O PR #11 ainda está aberto e a validação física continua pendente.
- **Diagnóstico:** com DroidCam, a interface relatou timeout de 3 s seguido de inferência síncrona na thread principal. A prévia voltou a ficar fluida ao desligar a IA. A causa específica do atraso no worker do evento ainda precisa de medição.
- **Alterações:** worker exclusivo com retomada manual após falha, aquecimento do primeiro quadro, amostragem adaptativa sem fila e separação entre preparação, inferência e FPS de prévia. Mantidos os tempos, modelo e critérios dos quatro gestos. A resolução da fotografia e a composição da moldura continuam no fluxo da Etapa 06.
- **Arquivos:** hook, worker, serviço, configuração e protocolo de gestos, componentes de diagnóstico, guia, câmera e cabine, testes de worker e captura e [documentação de reconhecimento](RECONHECIMENTO_GESTOS.md). Nenhuma dependência adicionada.
- **Testes automatizados:** 81 passaram com `npm run test -- --maxWorkers=1 --pool=threads`, incluindo prazos, descarte, pausa adaptativa, retomada, limpeza, botões manuais e os quatro comandos de gesto.
- **Verificações:** lint, typecheck, build e formatação aprovados. O PNG no build manteve o SHA-256 original. Em Chrome headless com a imagem pública de polegar, o worker do build levou 892 ms na primeira inferência e 291–366 ms nas seguintes. A preparação levou 3–10 ms. Este ensaio não mede FPS do DroidCam.
- **Pendências:** medir com webcam e DroidCam, comparar fluidez com IA ligada e desligada e validar gestos, botões e revisão da foto. PR para `develop` no relatório de entrega. A Etapa 07 depende de autorização.

## 20/11/2026 — Etapa 06/12 — Molduras adaptativas

- **Base:** `feature/06-adaptive-photo-frames` parte de `develop` em `8434474`, que já contém os PRs #11 e #12.
- **Entrega:** seleção da arte 16:9 ou 4:3 pelas dimensões da captura, sobreposição proporcional em Canvas e JPEG 0,95 nas dimensões originais. Formatos sem arte correspondente mantêm o JPEG original com aviso. A regra roda somente após a captura.
- **Arquivos:** `photoComposition.ts`, `usePhotoCapture.ts`, `photo.ts`, `PhotoReview.tsx`, testes de composição e captura, PNG 4:3 e documentação. Nenhuma dependência adicionada.
- **Arte 4:3:** 640 × 480, hash idêntico ao arquivo fornecido. A amostra central de 100 × 100 pixels contém 9.393 pixels com alfa 0 e 607 com alfa 1 de 255.
- **Verificação:** 90 testes passaram com `npm run test -- --maxWorkers=1 --pool=threads`, incluindo seleção, ausência e falha de arte, proporções sem moldura, confirmação e repetição. Em Chrome headless, o JPEG composto preservou as dimensões e os pixels de referência do original na abertura central em 1920 × 1080, 640 × 480 e 1280 × 960. O teste também conferiu a arte incorporada na borda.
- **Pendências:** validar com as duas câmeras no equipamento do evento. PR para `develop` no relatório de entrega. A Etapa 07 depende de autorização.

## 20/11/2026 — Etapa 06/12 — Enquadramento da revisão

- **Defeito reproduzido:** o painel de revisão limitava sua altura enquanto a foto continuava dimensionada pela largura, podendo ultrapassar a área visível. As faixas laterais relatadas não apareceram no ensaio controlado.
- **Correção:** `PhotoReview.tsx` fornece as dimensões do arquivo a `PhotoPreview.tsx`. Em `styles.css`, o painel acompanha a proporção da fotografia em desktop e telas estreitas. Os PNGs, Canvas de composição e câmera permanecem com o mesmo fluxo.
- **Testes:** 90 testes passaram, assim como lint, typecheck, build e formatação. `PhotoCapture.test.tsx` verifica as dimensões e a proporção entregues à revisão. Em Chrome headless, o ensaio com uma foto pública e um padrão sintético em 4:3 e 16:9 verificou a proporção da prévia e os pixels do JPEG na abertura dos PNGs oficiais. Nenhuma dependência adicionada.
- **Status:** atualização no [PR #14](https://github.com/Samuelnata2109/foto-autom-tica/pull/14), em `feature/06-adaptive-photo-frames`. A validação com o quadro específico do DroidCam relatado pelo usuário continua pendente.
