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

### 21/11/2026 — Tolerância e tempo de confirmação dos gestos

- **Status** em revisão, com homologação física pendente. Branch `fix/gesture-recognition-tolerance` baseada em `develop`.
- **Mudanças** nos limiares geométricos e de confiança de cada gesto, com histerese, liberação observada antes de um novo comando e feedback de detecção, confirmação e execução no guia da cabine.
- **Arquivos** de calibração, geometria, votação, validação, reconhecedor e hook de gestos, guia e revisão da foto, testes e [roteiro de reconhecimento](RECONHECIMENTO_GESTOS.md). Nenhuma dependência nova.
- **Verificações** de lint, tipagem, build e formatação nos arquivos alterados. Os 106 testes passaram com `npm run test -- --pool=forks --maxWorkers=1`, incluindo landmarks sintéticos, liberação do gesto, feedback e regressões da cabine.
- **Próxima validação** mede precisão e latência na webcam e no DroidCam, com o roteiro do guia de reconhecimento. O commit e o PR constam no relatório de entrega.

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

## 20/11/2026 — Etapa 07/12 — Cenários virtuais com IA

- **Base:** `feature/07-virtual-backgrounds`, criada a partir de `develop` em `8a0bde1`, que contém os PRs #11, #12 e #14.
- **Entrega:** escolha entre fundo original e quatro ilustrações, segmentação local após a captura, progresso e cancelamento, JPEG 0,95 com moldura adaptativa por cima. Falhas permitem confirmar ou repetir a foto com fundo original.
- **Arquivos:** cabine, hooks de captura e gestos, serviço de molduras, serviço, worker e máscara de cenários, coordenação de visão, modelo e ilustrações locais, testes de captura e cenários. Usa o MediaPipe já instalado. O [guia da etapa](CENARIOS_VIRTUAIS.md) registra origem, licença e memória do modelo.
- **Validação:** 98 testes passaram, além de lint, tipagem e build. No Chrome headless, o worker de produção segmentou um retrato público em 640 × 480 e 1920 × 1080, manteve as dimensões e sobrepôs a moldura. O ensaio completo levou 10,6 s e 8,2 s, respectivamente. As ilustrações foram exportadas como WebP após o Chrome rejeitar a decodificação do SVG no worker.
- **Pendências:** validação física de bordas e fluidez, com webcam e DroidCam. A Etapa 08 depende de autorização.

## 21/11/2026 — Etapa 08/12 — Armazenamento privado e retenção

- **Base:** `feature/08-backend-storage`, criada a partir de `develop` em `9581d0b`, após o merge do PR #15.
- **Entrega:** consentimento de armazenamento separado da confirmação, Auth de operador com prova por sessão, migrations para o bucket privado, fotos, limites e leases, Edge Functions de foto e limpeza, revogação de leitura após 24 horas e remoção manual ou por Cron. O fluxo local permanece disponível.
- **Arquivos:** `supabase/migrations/`, `supabase/functions/`, `supabase/tests/`, serviço e componente de armazenamento, integração na cabine, variáveis públicas de exemplo, testes Vitest, roteiro de integração e [documentação operacional](ARMAZENAMENTO_PRIVADO.md). Nenhuma dependência de produção adicionada.
- **Verificado no banco:** asserções em PostgreSQL/WASM com metadados de Storage simulados. Cobrem prazo do servidor, autorização, isolamento, claims concorrentes, repetição e órfãos.
- **Verificações:** 108 testes passaram, junto de lint, tipagem, build e formatação. O intervalo do Cron e a chamada montada para pg_net foram conferidos com extensões simuladas no PostgreSQL. O processo real do Cron e a remoção física não foram executados nessa verificação.
- **Pendências de homologação:** as migrations e funções ainda precisam ser aplicadas ao projeto Supabase. O teste integrado não pôde iniciar porque a CLI do Supabase não está instalada neste ambiente. Ativar os segredos de Cron e confirmar a exclusão de arquivo e metadados no Storage real antes do evento. PR e commit no relatório de entrega. A Etapa 09 depende de autorização.

### 21/11/2026 — Convite e recuperação de senha da equipe

- **Causa:** a cabine só implementava login por senha. O roteador por fragmento tratava o retorno do e-mail como navegação e levava à tela inicial.
- **Correção:** interpretar e limpar o retorno antes do roteador. O SDK oficial `@supabase/auth-js` valida a sessão de convite ou recuperação e atualiza a senha. O login da equipe usa a mesma integração, com a verificação de operador já existente.
- **Validação:** lint, tipagem e build passaram. A suíte passou com 116 testes em 11 arquivos usando `--pool=forks --maxWorkers=1`, incluindo oito testes novos de links, sessão e formulário. A execução anterior com threads teve dois timeouts de inicialização de workers do Vitest.
- **Pendência de homologação:** validar no navegador um novo convite e uma nova recuperação com e-mails reais. O [guia de armazenamento](ARMAZENAMENTO_PRIVADO.md) registra Site URL, Redirect URLs e o roteiro de validação. Correção na branch `feature/08-backend-storage`, no PR #16.

### 21/11/2026 — Continuidade da confirmação dos gestos

- **Base** `develop` com os PRs #16 e #17 integrados. Branch `fix/gesture-confirmation-stability` para a correção.
- **Causa** na frequência reduzida, uma única amostra incerta pode separar dois resultados válidos por mais de 750 ms mesmo com a mão à vista. A geometria inconclusiva em 3D também deixava de aproveitar os pontos normalizados disponíveis no quadro.
- **Mudanças** recuperação de uma amostra incerta sem contabilizar a pausa, verificação complementar com a geometria do quadro e indicação de bloqueios no guia. Configuração, serviços, hook, componentes, testes e [roteiro de reconhecimento](RECONHECIMENTO_GESTOS.md) atualizados. Nenhuma dependência nova.
- **Verificações** lint, tipagem, build e formatação aprovados. Os 130 testes passaram com `npm run test -- --pool=forks --maxWorkers=1`. Os seis novos casos cobrem projeções em 4:3 e 16:9 e amostras intermitentes. O commit e o PR constam no relatório de entrega.
- **Pendência** medição de precisão, latência e fluidez com webcam e DroidCam. O reconhecimento processa uma mão por vez.

## 21/11/2026 — Etapa 09/12 — Compartilhamento seguro por QR Code

- **Base** `develop` com os PRs #16, #17 e #18 integrados. O desenvolvedor confirmou que o armazenamento privado da Etapa 08 foi validado em ambiente real. Implementação na branch `feature/09-qr-sharing`.
- **Entrega** consentimento específico para compartilhar, QR e link copiável na cabine, validade e revogação, página pública responsiva com visualização e download em JPEG.
- **Segurança** token aleatório de 256 bits com SHA-256 no banco, RLS, limite de 12 leituras por minuto por token e dupla validação no servidor. A validade acompanha a foto original e a exclusão bloqueia novas leituras e remove o registro associado.
- **Arquivos** migration e testes SQL, handler `booth-photos`, serviço de armazenamento, configuração de URL pública, interface da cabine, rota do visitante, testes Vitest e [guia de implantação e validação](COMPARTILHAMENTO_QR.md). Dependência `qrcode.react` 4.2.0.
- **Verificações** 139 testes em 13 arquivos com `npm run test -- --pool=forks --maxWorkers=1`. Lint, tipagem, build e formatação aprovados. A migration e as asserções de acesso, limite, expiração, revogação e exclusão passaram em PostgreSQL/WASM com metadados de Storage sintéticos. Commit e PR no relatório de entrega.
- **Pendências** aplicar a migration e publicar a função e o frontend em homologação. Validar leitura do QR e download em celular real em HTTPS. Nenhuma alteração foi aplicada ao Supabase hospedado.

### 21/11/2026 — Preparação do GitHub Pages

- **Base** a `develop` contém o PR #20. O desenvolvedor confirmou a aplicação da migration e a publicação de `booth-photos` no Supabase hospedado. A configuração do frontend está na branch `feature/github-pages-deploy`.
- **Entrega** workflow de publicação de `dist` por push em `develop`, Vite com modo `github-pages`, URL pública de QR, preparação do modelo por SHA-256 e guia de operação. O runner usa Node 24 e `npm ci`. Arquivos principais `.github/workflows/deploy-pages.yml`, `vite.config.ts`, `tests/SharedPhotoPage.test.tsx` e [GitHub Pages](GITHUB_PAGES.md).
- **Verificações** lint, tipagem, formatação e builds local e de Pages aprovados. A suíte completa passou em 121 casos e teve um timeout inicial no arquivo de captura. Os 19 casos desse arquivo passaram na repetição isolada com os prazos originais. A verificação HTTP local conferiu 18 recursos na subpasta e o Chrome renderizou a rota de foto com estado de link inválido. O processo headless precisou ser encerrado após emitir o DOM.
- **Pendências** cadastrar as variáveis públicas no GitHub, autorizar `develop` no ambiente `github-pages` e desativar os workflows antigos da `main`. A origem do Pages recebeu 403 de CORS no preflight da função hospedada. Acrescentar a origem à configuração existente e validar o QR em HTTPS com celular real depois do deploy. Commit e PR no relatório de entrega.

### 21/11/2026 — Captura imediata e recuperação do reconhecimento

- **Branch** `fix/gesture-instant-capture`. A palma captura sem contagem ao confirmar o gesto em pelo menos 150 ms e duas amostras. O sinal de paz mantém 10 s, o punho cancela em 800 ms e o polegar confirma na revisão. O cooldown e a liberação obrigatória permanecem.
- **Worker** GPU com fallback para CPU/WASM dentro do worker. Reinício em 500 ms após os dois primeiros timeouts consecutivos, suspensão no terceiro e diagnóstico por estágio. A falha no arquivo do modelo informa como instalá-lo localmente.
- **Arquivos** configuração, geometria, recognizer, worker, hook, painel de diagnóstico e cinco arquivos de testes. O workflow único publica `dist` a partir de `develop` e aceita execução manual. Os dois workflows legados foram removidos da branch. Mantidos o WASM clássico e a dependência de tipos do Supabase. Nenhuma dependência nova.
- **Verificações** tipagem, lint, build e formatação aprovados. Os 149 testes de 13 arquivos passaram com `npm test -- --pool=forks --maxWorkers=1 --testTimeout=45000`. A execução paralela teve timeouts de inicialização no Vitest, por isso a validação completa foi feita com um processo por vez. O `dist` contém o modelo, o Worker e os recursos WASM de módulo.
- **Homologação** validar com webcam e DroidCam os quatro gestos, a ausência de disparos repetidos, os botões manuais, o delegate e a retomada após timeout. Conferir a publicação HTTPS e o carregamento do modelo na subpasta do Pages. Revisão e integração pendentes. Commits e PR no relatório de entrega.

### 21/11/2026 — Contagem de 5 s por palma aberta

- **Ajuste** a palma aberta passa a chamar o temporizador existente de 5 s com o cenário selecionado. A foto é tirada ao terminar a contagem, que pode ser cancelada pelo punho fechado ou pelo botão. Guia de gestos, README e documentação atualizados. Nenhuma dependência nova.
- **Verificações** tipagem, lint, build e formatação aprovados. A execução completa passou em 148 dos 149 casos, incluindo o disparo aos 5.000 ms. O caso restante esperava o aviso antigo. Após atualizar a asserção, os 23 testes de reconhecimento passaram na reexecução.
- **Homologação** conferir a contagem e o cancelamento com webcam e DroidCam. Alteração na branch `fix/gesture-instant-capture`, no [PR #24](https://github.com/Samuelnata2109/foto-autom-tica/pull/24), aguardando revisão.

## 22/11/2026 — Etapa 10/12 — Compartilhamento para Instagram Stories

- **Base e status** `feature/10-instagram-stories` parte de `develop` em `87ab2ff`, que inclui o PR #24. O desenvolvedor confirmou a validação física do QR da Etapa 09. A Etapa 10 está em revisão, com homologação física pendente.
- **Entrega** JPEG 1080 × 1920 sob demanda na página do QR. Web Share e download para o visitante. Consentimento separado, fila autenticada e registro de aprovação, rejeição e publicação manual pela equipe. Canvas centraliza a fotografia inteira e o bucket conserva apenas o arquivo original privado.
- **Arquivos** serviço Canvas, cliente da fila, interfaces de Stories e rota da equipe, ações da Edge Function, migration `20261122000100_booth_official_stories.sql`, testes SQL e Vitest e [guia de Stories](INTEGRACAO_INSTAGRAM.md). Nenhuma dependência nova.
- **Segurança e decisões** revogação, troca de token, expiração e exclusão bloqueiam a foto na fila. A retenção do JPEG continua em 24 horas. O job horário apaga os metadados da fila a partir de 24 horas após o vencimento original. Acompanha a autorização existente dos operadores e registra a publicação apenas após confirmação humana.
- **Validação** 170 testes em 15 arquivos passaram com `npm run test -- --pool=forks --maxWorkers=1 --testTimeout=45000 --reporter=dot`. Lint, tipagem, formatação e build passaram. O build Pages passou com variáveis públicas sintéticas e a base `/foto-autom-tica/` conferida no artefato. As migrations e os três scripts SQL passaram em PostgreSQL/WASM. O comando de limpeza novo foi executado nesse banco com o agendamento simulado.
- **Pendências** aplicar a migration e atualizar `booth-photos` em homologação. Confirmar o Cron real e testar QR, Canvas, download e seletor Web Share em Android, iPhone e desktop com foto sintética. O Chrome headless local não retornou uma validação de Canvas. A configuração do Supabase de produção permanece pendente de autorização. Commits e PR no relatório de entrega. A Etapa 11 depende de autorização.

### 22/11/2026 — Revisão SQL da listagem de Stories

- **Diagnóstico** a versão original de `booth_list_stories` lê `available` da view dentro da subconsulta. A execução original passou no teste ampliado. A migration revisada qualifica os aliases de cada nível e preserva o JSON, a paginação e as permissões.
- **Cobertura** o teste SQL conferiu a listagem real com cinco estados sob `service_role`, o formato e a ordem dos registros, o deslocamento, o retorno vazio e a revogação após publicação. A migration original e a revisada passaram nas três suítes SQL em PostgreSQL 17.5 via PGlite, com o comando de limpeza executado e o agendamento simulado.
- **Validação e status** 170 testes Vitest em 15 arquivos passaram. Lint, tipagem, formatação, build padrão e build Pages com variáveis sintéticas aprovados. Revisão na branch `feature/10-instagram-stories`, no [PR #25](https://github.com/Samuelnata2109/foto-autom-tica/pull/25). Homologação com Supabase e Cron reais segue pendente. Nenhuma operação de implantação foi executada.

### 22/11/2026 — Monitoramento da exclusão de fotos vencidas

- **Entrega** migration incremental `20261122000200_booth_expired_photo_backlog.sql` com contagem e idade da foto vencida mais antiga. `booth-cleanup` informa separadamente se o ciclo terminou sem falhas e se a fila de vencidas zerou. A consulta é restrita ao servidor e os logs contêm dados agregados.
- **Validação local** 173 testes Vitest em 15 arquivos, lint, tipagem, formatação e build passaram. Os quatro scripts SQL passaram em PostgreSQL 17.5 via PGlite. Os lotes de 41, 80 e 100 fotos sintéticas zeraram em dois, dois e três ciclos, com remoção do Storage simulada. O teste confirmou o bloqueio de leitura antes da exclusão física e a execução da métrica sob `service_role`.
- **Operação e pendências** o [guia de armazenamento privado](ARMAZENAMENTO_PRIVADO.md#inspeção-monitoramento-e-recuperação) descreve o acompanhamento durante o evento e a precedência das credenciais. A nova métrica ainda precisa ser verificada com o Cron e o Storage reais após implantação autorizada. Alterações locais na branch `feature/10-instagram-stories`, para revisão no [PR #25](https://github.com/Samuelnata2109/foto-autom-tica/pull/25). Nenhuma dependência adicionada.

## 22/11/2026 — Etapa 11/12 — Fase 1 do Painel Administrativo

- **Base e status** implementação na branch `feature/11-admin-dashboard`, a partir de `develop` em `082a675`, com a Etapa 10 integrada. Fase 1 em revisão.
- **Entrega original da Fase 1** entrada `#/equipe`, navegação responsiva e fila privada de Stories em `#/equipe/stories`, além de seções informativas para escopos futuros.
- **Arquitetura** rotas aninhadas mantêm uma sessão em memória entre seções. O formulário compartilhado confirma o operador na Edge Function antes de mostrar a área protegida. Logout, expiração e autorização recusada desmontam a fila. A fila cancela pedidos pendentes no navegador e libera as URLs temporárias. Nenhuma dependência nova.
- **Arquivos principais** `src/App.tsx`, `src/pages/AdminPage.tsx`, `src/pages/admin.css`, `src/pages/OfficialStoriesPage.tsx`, `src/pages/HomePage.tsx`, `src/components/OperatorLogin.tsx`, `src/components/PhotoStorageConsent.tsx`, `src/components/OfficialStoryQueue.tsx`, `src/services/privatePhotoStorage.ts` e `tests/AdminPage.test.tsx`.
- **Validação local** os 173 testes anteriores passaram em 15 arquivos. O Vitest atingiu o tempo limite ao iniciar o worker da suíte nova nessa execução. Os seis testes do painel passaram em execução dedicada. Lint, tipagem, formatação e build Pages com variáveis sintéticas passaram. A base `/foto-autom-tica/` e os modelos e arquivos WASM foram conferidos no artefato.
- **Validação manual pendente** executar os testes formais em Safari/iPhone e Chrome/Android com uma conta de homologação. Verificar link direto de Stories, navegação, foco, logout com prévia aberta, expiração e retorno à cabine.
- **Continuidade** alterações de eventos, papéis, métricas e exclusões administrativas pertencem às próximas fases. Aguardar revisão antes da integração.

### Revisão da segurança e estabilidade da Fase 1

- **Correção** a fila cancela requisições e revoga a URL da prévia ao desmontar. O vencimento da foto também cancela operações pendentes, inclusive a preparação do download. A restauração da aba revalida o prazo estimado a partir do tempo restante informado pelo servidor.
- **Sessão** o painel ignora respostas antigas, inclusive um HTTP 401 que chegue após novo login. O Canvas libera os recursos ao cancelar e a fila descarta resultados tardios. Operações já recebidas pelo servidor e downloads já entregues ao navegador podem prosseguir.
- **Cobertura** testes de sessão anterior, expiração antes do timer, retorno à aba e cancelamento durante a codificação. Revisão na branch `feature/11-admin-dashboard`, no [PR #26](https://github.com/Samuelnata2109/foto-autom-tica/pull/26). Validação manual em homologação, incluindo Safari/iPhone e Chrome/Android, permanece pendente.
- **Resultado** os 184 testes Vitest passaram em 16 arquivos em uma única execução, com um worker. O build para GitHub Pages passou com variáveis sintéticas.

### Simplificação do painel de equipe — 23/11/2026

- **Escopo** `#/equipe` abre diretamente a gestão de Stories oficiais. Removidas da interface as seções informativas de visão geral, eventos e auditoria e a navegação entre seções. A rota legada `#/equipe/stories` redireciona para `#/equipe` dentro do guardião de autenticação.
- **Segurança preservada** autenticação do operador, validação pela Edge Function, sessão em memória, expiração, cancelamento de requisições e revogação de URLs temporárias permanecem no layout administrativo existente.
- **Arquivos** `src/App.tsx`, `src/pages/AdminPage.tsx`, `src/pages/OfficialStoriesPage.tsx`, `src/pages/admin.css`, `tests/AdminPage.test.tsx`, `docs/ARQUITETURA.md`, `docs/INTEGRACAO_INSTAGRAM.md` e `docs/PROGRESSO.md`.
- **Validação** pendente de lint, typecheck, testes e build nesta implementação.
