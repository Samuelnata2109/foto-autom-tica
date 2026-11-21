# Arquitetura do AI Photo Booth

A aplicação React e TypeScript é compilada pelo Vite. `src/main.tsx` monta o roteador e
carrega os estilos do Tailwind. `src/App.tsx` define rotas, transições e foco ao navegar.
As telas em `src/pages/` compõem `src/components/` e usam a API de tela cheia via
`src/hooks/`. Consulte o [fluxo e o design system](IDENTIDADE_VISUAL.md).

## Estrutura

| Caminho                                                   | Responsabilidade                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `public/models/`                                          | Artefatos públicos de modelos locais, com versão, origem e licença documentadas.     |
| `public/frames/`, `public/backgrounds/`, `public/sounds/` | Molduras, cenários e sons distribuídos com a aplicação.                              |
| `src/assets/`                                             | Recursos importados pelo código e processados pelo Vite.                             |
| `src/components/`                                         | Elementos reutilizáveis da interface.                                                |
| `src/pages/`, `src/layouts/`                              | Composição de telas e estruturas compartilhadas entre telas.                         |
| `src/hooks/`                                              | Ciclo de vida de fluxos, temporizadores, inscrições e liberação de recursos.         |
| `src/services/`                                           | Integração com vídeo, processamento de imagens, inferência, API e serviços externos. |
| `src/stores/`                                             | Estado compartilhado da sessão, quando múltiplas telas precisarem dele.              |
| `src/types/`, `src/utils/`                                | Contratos compartilhados e funções puras reutilizáveis.                              |
| `tests/`, `docs/`                                         | Verificações automatizadas e documentação do projeto.                                |

Os diretórios planejados entram com seu primeiro arquivo útil. `public/licenses/`
contém as licenças das fontes. Fotos, dados privados e credenciais ficam fora de `public/`.

Páginas compõem componentes e acionam fluxos por hooks. Hooks coordenam o estado e chamam
serviços. Serviços encapsulam navegador e integrações e não dependem das telas. Frames de vídeo
e buffers ficam no fluxo de processamento, fora do estado global do React.

## Fluxo previsto da cabine

1. **Vídeo ao vivo.** Na Etapa 03, o cliente DroidCam recebe o vídeo do celular via USB
   ou Wi-Fi e o expõe ao Windows como webcam virtual. A cabine enumera as câmeras
   com `enumerateDevices` e abre a escolhida com `getUserMedia`, somente vídeo.
   `useCamera` mantém as referências tipadas de vídeo e stream, controla o ciclo de
   vida das faixas e acompanha mudanças na lista de dispositivos. O visor mostra o vídeo
   com espelhamento opcional em CSS. As configurações pedidas são ideais, e a interface
   mostra apenas as dimensões e FPS fornecidos pelo navegador. A aplicação não usa
   WebRTC nem comunica diretamente com o celular.
2. **Temporizador e captura.** `useCountdown` usa um prazo monotônico para as contagens
   de 5 ou 10 segundos. `usePhotoCapture` coordena disparo, cancelamento, revisão,
   confirmação e repetição. Apenas uma operação pode usar a fonte por vez. Mudança
   ou perda da fonte cancela a operação pendente. `photoCapture.ts` valida a faixa e
   copia somente o quadro do vídeo para o Canvas em `videoWidth × videoHeight`.
   O JPEG usa qualidade 0,95. A revisão usa uma Object URL para o Blob em memória.
   Ao repetir ou sair, a URL é revogada. O espelhamento visual do vídeo não faz parte
   dos pixels do JPEG. A confirmação mantém a foto na sessão sem enviar ou gravar arquivos.
3. **Gestos.** Na Etapa 05, o Gesture Recognizer do MediaPipe analisa quadros reduzidos do
   vídeo existente. `useGestureRecognition` limita frequência, descarta quadros antigos e envia
   um quadro por vez ao worker. O processamento usa modelo e WASM locais. Se o worker falhar,
   suspende o reconhecimento até nova tentativa manual. `GestureValidation` confirma o mesmo gesto
   por tempo monotônico, aplica confiança, tolerância e intervalo entre comandos. A página
   encaminha os quatro comandos às ações existentes de `usePhotoCapture`. O vídeo permanece
   montado em miniatura durante a revisão. Veja [RECONHECIMENTO_GESTOS.md](RECONHECIMENTO_GESTOS.md).
4. **Edição.** Na Etapa 06, manter a foto original em memória e representar filtros e molduras
   como parâmetros reversíveis. Compor a prévia em resolução reduzida e exportar o resultado
   em resolução adequada usando Canvas.
5. **Cenários virtuais.** Na Etapa 07, a cabine segmenta o JPEG capturado em worker local com
   MediaPipe, mantendo a prévia livre de segmentação. Um controle de execução aguarda o trabalho
   em andamento de gestos, e o Canvas coloca o cenário atrás da pessoa e a moldura acima.
   Cancelamento ou falha mantém a captura com fundo original. Veja
   [Cenários virtuais](CENARIOS_VIRTUAIS.md).
6. **Armazenamento.** Na Etapa 08, o consentimento explícito libera o upload do JPEG revisado.
   Edge Functions verificam Auth da equipe e prova efêmera de sessão. O bucket privado e as
   tabelas com RLS ficam restritos ao backend. O PostgreSQL calcula a expiração de 24 horas
   pelo horário do objeto no Storage. A leitura consulta o prazo a cada requisição. Cron e
   Edge Function removem arquivos e metadados, com controle de concorrência e reconciliação.
   Consulte [Armazenamento privado](ARMAZENAMENTO_PRIVADO.md).
7. **QR Code.** Após consentimento separado, a cabine emite um token aleatório e gera o QR localmente.
   O visitante usa a rota pública por fragmento. A mesma Edge Function da Etapa 08 valida o hash
   do token e o prazo original da foto antes e após a leitura do bucket privado. Revogação,
   exclusão antecipada e expiração bloqueiam novas entregas. [Compartilhamento por QR Code](COMPARTILHAMENTO_QR.md).
8. **Instagram.** Na Etapa 10, confirmar elegibilidade, permissões, revisão e limites na
   documentação oficial da Meta. Planejar publicação via backend com confirmação explícita por
   foto, credenciais fora do navegador e registro do resultado. Manter download como alternativa.
9. **Administração.** Na Etapa 11, planejar autenticação e permissões por função e evento, com
   validação no servidor. O painel terá configuração de eventos e retenção, gerenciamento de
   recursos e exclusão de fotos, com trilha de auditoria que omita imagens e credenciais.

## Privacidade e operação

- Explicar quando o vídeo ficará visível na cabine e separar autorização de captura,
  armazenamento, compartilhamento e publicação. Oferecer cancelamento e descarte na revisão.
- Processar conteúdo localmente quando possível. Encerrar faixas, workers, temporizadores e
  referências a blobs ao terminar a sessão. Manter fotos fora de logs e caches compartilhados.
- Definir aviso de privacidade, retenção, acesso, exclusão e tratamento de imagens de menores
  antes de eventos reais. Gestos e segmentação são tarefas de visão computacional sem uso
  de identidade facial.
- Em falhas de rede, manter prévia da câmera local e permitir revisão da foto em memória quando
  disponíveis. Informar falha de envio e solicitar nova tentativa antes de transferir dados.
