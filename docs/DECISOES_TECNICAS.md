# Decisões técnicas

## DT-01 — Fundação do frontend

**Status:** adotada na Etapa 01.

React e TypeScript estrito organizam a interface e os contratos. Vite serve e compila o
projeto. Tailwind CSS entra pelo plugin oficial do Vite para manter a base de estilos em
um único arquivo. npm e o lockfile fixam a resolução das dependências. O Prettier formata,
o ESLint verifica regras de código e o Vitest executa testes. O teste da página usa a
renderização estática do React, sem dependência de DOM simulado.

Referências de configuração: [Vite](https://vite.dev/guide/) e
[Tailwind CSS](https://tailwindcss.com/docs/installation/using-vite).

## DT-02 — Módulos e dependências incrementais

**Status:** adotada na Etapa 01.

A estrutura é definida em [ARQUITETURA.md](ARQUITETURA.md). Pastas e bibliotecas entram
quando tiverem uso. Motion e Lucide React serão avaliados na interface. React Router e
Zustand só entram quando a navegação e o estado compartilhado justificarem seu uso.
MediaPipe Tasks Vision, o cliente Supabase e a biblioteca QRCode ficam para suas etapas.

## DT-03 — Vídeo e processamento no dispositivo

**Status:** entrada de vídeo adotada na Etapa 03, Canvas na Etapa 04 e MediaPipe Tasks Vision na Etapa 05.

## Etapa 05 — inferência local de gestos

Modelo oficial Gesture Recognizer float16/1 e `@mediapipe/tasks-vision` 1.2.3 fixado, com WASM da mesma instalação servidos pelo Vite sob `BASE_URL`. CPU é a escolha inicial; GPU não é presumida mais rápida. A inferência síncrona roda prioritariamente em Web Worker. Quando o worker não inicializa, a alternativa reduz a frequência na thread principal e mantém controles manuais. Um único quadro novo de até 320 px de largura é processado por vez, sem afetar a resolução da fotografia. A foto e o vídeo não são enviados a servidores. Os quatro comandos reutilizam `usePhotoCapture`.

Usar MediaDevices para webcams locais, incluindo a webcam virtual do DroidCam.
O transporte USB foi a primeira opção para aproveitar o cabo e dispensar sinalização
WebRTC. Wi-Fi pelo cliente DroidCam usa a mesma interface de câmera no computador.
A escolha do transporte fica no DroidCam. Foi relatado que o USB não funcionou no
equipamento utilizado, enquanto o DroidCam funcionou por Wi-Fi.

Canvas é usado para a captura, e MediaPipe permanece previsto para inferência local.
O stream permanece original para ambos. O espelhamento é aplicado somente ao elemento
de vídeo.

## DT-04 — Persistência e integrações com acesso restrito

**Status:** proposta a validar nas Etapas 08 a 11.

Usar Supabase com bucket privado e RLS. Autorizar acesso por evento e foto. Compartilhar
com token temporário revogável e isolar credenciais de publicação e administração no
servidor. A escolha de backend para essas operações e os prazos de retenção e expiração
serão refinados conforme os requisitos de operação e privacidade.

## DT-05 — Interface da cabine e prévias

**Status:** adotada na Etapa 02.

React Router usa URLs com fragmento para permitir recarregar as telas em hospedagem
estática. O link e as rotas de prévia dependem de `import.meta.env.DEV`. A seleção do
temporizador usa rádios nativos e estado local. Motion respeita a preferência de
movimento reduzido. Os ícones usam Lucide e desenhos vetoriais para sinal de paz e
punho fechado. Fontes WOFF2 são servidas localmente pelo build.

Vitest com jsdom verifica navegação e eventos DOM. O mínimo de Node.js acompanha
as versões suportadas por React Router e jsdom. A API `motion/mini` executa as
animações compartilhadas sem introduzir o conflito de tipos das declarações React
do Motion com a versão instalada de `csstype`.
