# AI Photo Booth

Projeto de cabine fotográfica interativa. A jornada prevista inclui prévia ao vivo, captura
manual ou por gesto, edição e compartilhamento com autorização do participante.

Na Etapa 01, a aplicação exibe uma página provisória para validar a configuração do projeto.

## Executar localmente

Use Node.js 24 LTS (recomendado), Node.js 22.13 ou superior na série 22, ou Node.js 26, com npm.
Esta etapa não requer configuração de ambiente nem acesso à câmera.

```sh
npm ci
npm run dev
```

Abra o endereço indicado pelo Vite (por padrão, `http://localhost:5173`). A página deve exibir
“AI Photo Booth”, identificar o projeto e informar que a aplicação está em desenvolvimento.

## Verificações

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm run format:check
```

O build é gerado em `dist/`. Use `npm run preview` para inspecioná-lo localmente.
Para aplicar a formatação, execute `npm run format`.

## Documentação

- [Arquitetura e responsabilidades](docs/ARQUITETURA.md)
- [Requisitos funcionais e não funcionais](docs/REQUISITOS.md)
- [Roadmap oficial](docs/ROADMAP.md)
- [Progresso do projeto](docs/PROGRESSO.md)
- [Decisões técnicas](docs/DECISOES_TECNICAS.md)
- [Diretrizes permanentes](AGENTS.md)
