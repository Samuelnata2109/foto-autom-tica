# AI Photo Booth

Projeto de cabine fotográfica interativa. A jornada prevista inclui prévia ao vivo, captura
manual ou por gesto, edição e compartilhamento com autorização do participante.

A Etapa 02 entrega a recepção e a cabine para eventos escolares, com visor, seleção
visual de temporizador, guia de gestos e controle de tela cheia.

## Executar localmente

Use Node.js 24.15 ou superior na série 24 LTS (recomendado), 22.22.2 ou superior na
série 22, ou Node.js 26, com npm.
Esta etapa não requer configuração de ambiente nem acesso à câmera.

```sh
npm ci
npm run dev
```

Abra o endereço indicado pelo Vite (por padrão, `http://localhost:5173`). Selecione
**Iniciar experiência** e use **Início** para voltar. Na cabine, Tab alcança o grupo
Temporizador e as setas alternam entre 5 e 10 segundos.

Em `npm run dev`, **Prévias de desenvolvimento** abre os exemplos de contagem, revisão e
compartilhamento. Câmera, captura e reconhecimento são identificados como indisponíveis.
As prévias ficam fora do build de produção.

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
- [Identidade visual e componentes](docs/IDENTIDADE_VISUAL.md)
- [Requisitos funcionais e não funcionais](docs/REQUISITOS.md)
- [Roadmap oficial](docs/ROADMAP.md)
- [Progresso do projeto](docs/PROGRESSO.md)
- [Decisões técnicas](docs/DECISOES_TECNICAS.md)
- [Diretrizes permanentes](AGENTS.md)
