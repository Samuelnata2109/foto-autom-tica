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
Com a câmera pronta, selecione a duração e pressione **Tirar foto**. A contagem pode
ser cancelada. Na revisão, **Tirar novamente** descarta a foto e volta à transmissão.
**Confirmar foto** mantém o JPEG em memória até você sair da cabine ou tirar outra foto.
O espelhamento da prévia não altera a fotografia.

Em `npm run dev`, **Prévias de desenvolvimento** abre os exemplos de contagem, revisão e
compartilhamento. O reconhecimento local de gestos da Etapa 05 pode ser ativado na cabine; os comandos manuais continuam disponíveis.

Para testar gestos, execute `npm run setup:gesture-model` uma vez, abra a cabine, autorize a câmera e ative o reconhecimento no guia lateral. Mantenha palma aberta por 2 s para contagem de 5 s, sinal de paz para 10 s, punho fechado para cancelar ou polegar para cima na revisão para confirmar. Consulte [RECONHECIMENTO_GESTOS.md](docs/RECONHECIMENTO_GESTOS.md) para limites e validação física.
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
