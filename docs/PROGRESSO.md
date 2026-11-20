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

- **Status:** implementação pronta para revisão.
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
- **Commit e PR:** referências no relatório de conclusão. Revisão pendente.
- **Próxima etapa:** 03 — Integração da câmera, após revisão e autorização.
