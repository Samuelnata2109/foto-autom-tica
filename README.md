# AI Photo Booth

Projeto de cabine fotográfica interativa. A jornada prevista inclui prévia ao vivo, captura
manual ou por gesto, edição e compartilhamento com autorização do participante.

A cabine exibe vídeo ao vivo de uma webcam ou da webcam virtual DroidCam.
O celular pode se conectar ao cliente DroidCam no Windows por USB ou Wi-Fi.

## Executar localmente

Use Node.js 24.15 ou superior na série 24 LTS (recomendado), 22.22.2 ou superior na
série 22, ou Node.js 26, com npm.
A integração usa a câmera do navegador ao entrar na cabine. Não requer variáveis de ambiente.

```sh
npm ci
npm run dev
```

Abra o endereço indicado pelo Vite (por padrão, `http://localhost:5173`). Selecione
**Iniciar experiência**, autorize a câmera e escolha o dispositivo no seletor.
Use **Desligar câmera** para encerrar a transmissão ou **Início** para sair.
Na cabine, Tab alcança o grupo Temporizador e as setas alternam entre 5 e 10 segundos.

Em `npm run dev`, **Prévias de desenvolvimento** abre os exemplos de contagem, revisão e
compartilhamento. Captura e reconhecimento seguem indisponíveis.
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
- [Configuração do DroidCam e da webcam](docs/CONFIGURACAO_CAMERA.md)
- [Requisitos funcionais e não funcionais](docs/REQUISITOS.md)
- [Roadmap oficial](docs/ROADMAP.md)
- [Progresso do projeto](docs/PROGRESSO.md)
- [Decisões técnicas](docs/DECISOES_TECNICAS.md)
- [Diretrizes permanentes](AGENTS.md)
