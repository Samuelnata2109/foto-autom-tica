# AI Photo Booth

Projeto de cabine fotográfica interativa. A jornada prevista inclui prévia ao vivo, captura
manual ou por gesto, edição e compartilhamento com autorização do participante.

A cabine exibe vídeo ao vivo de uma webcam ou da webcam virtual DroidCam.
O celular pode se conectar ao cliente DroidCam no Windows por USB ou Wi-Fi.

## Executar localmente

Use Node.js 24.15 ou superior na série 24 LTS (recomendado), 22.22.2 ou superior na
série 22, ou Node.js 26, com npm.
A integração usa a câmera do navegador ao entrar na cabine. O modo local funciona sem configuração do Supabase.

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
O espelhamento escolhido no visor também se aplica à fotografia. A moldura oficial mantém a orientação da arte.

Para habilitar o armazenamento temporário da Etapa 08, configure as variáveis públicas do
Supabase em `.env.local`, prepare as migrations e o Cron e entre em **Acesso da equipe**.
O participante decide se deseja armazenar a foto por até 24 horas depois de confirmá-la.
Consulte o [guia de configuração e validação](docs/ARMAZENAMENTO_PRIVADO.md).

Em `npm run dev`, **Prévias de desenvolvimento** abre os exemplos de contagem, revisão e
compartilhamento. O reconhecimento local de gestos da Etapa 05 pode ser ativado na cabine; os comandos manuais continuam disponíveis.

Para testar gestos, execute `npm run setup:gesture-model` após instalar as dependências. O comando baixa o arquivo `public/models/gesture_recognizer.task`, que é ignorado pelo Git. Abra a cabine, autorize a câmera e ative o reconhecimento. A palma aberta inicia uma contagem de 5 s, o sinal de paz inicia 10 s, o punho fechado cancela a contagem e o polegar para cima confirma a foto em revisão. Consulte [RECONHECIMENTO_GESTOS.md](docs/RECONHECIMENTO_GESTOS.md) para parâmetros e validação física.
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
- [Armazenamento privado e retenção](docs/ARMAZENAMENTO_PRIVADO.md)
- [Compartilhamento seguro por QR Code](docs/COMPARTILHAMENTO_QR.md)
- [Publicação no GitHub Pages](docs/GITHUB_PAGES.md)
- [Decisões técnicas](docs/DECISOES_TECNICAS.md)
- [Diretrizes permanentes](AGENTS.md)
