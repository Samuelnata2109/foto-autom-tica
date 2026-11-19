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

**Status:** proposta a validar nas Etapas 03 a 07.

Usar MediaDevices para a câmera, WebRTC para o vídeo remoto, Canvas para captura e
composição e MediaPipe para inferência local. Essa divisão mantém os frames no fluxo de
vídeo e reduz a dependência de serviços externos. O protótipo de câmera deve avaliar
sinalização, relay e recuperação antes de definir a topologia final. A necessidade de
Worker será medida em hardware de referência.

## DT-04 — Persistência e integrações com acesso restrito

**Status:** proposta a validar nas Etapas 08 a 11.

Usar Supabase com bucket privado e RLS. Autorizar acesso por evento e foto. Compartilhar
com token temporário revogável e isolar credenciais de publicação e administração no
servidor. A escolha de backend para essas operações e os prazos de retenção e expiração
serão refinados conforme os requisitos de operação e privacidade.
