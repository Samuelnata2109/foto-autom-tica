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

- **Status:** implementação pronta para revisão.
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
- **Validação física pendente:** conferir contagem, orientação, nitidez, flash,
  revisão e cancelamento por desconexão em webcam integrada e DroidCam via Wi-Fi.
- **Branch:** `feature/04-photo-capture`.
- **Commit e PR:** referências no relatório de conclusão. Revisão pendente.
- **Próxima etapa:** 05 — Reconhecimento de gestos com IA, após revisão e autorização.
