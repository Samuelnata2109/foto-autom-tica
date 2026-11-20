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

1. **Vídeo ao vivo.** Na Etapa 03, o navegador do celular poderá solicitar a câmera com
   `getUserMedia` (somente vídeo) e transmitir as faixas para a cabine via WebRTC. Planeja-se
   pareamento de curta duração e sinalização autenticada para SDP e ICE. Validar HTTPS, troca de
   câmera, codecs e desempenho em Wi-Fi local; avaliar STUN/TURN quando a conexão direta falhar.
   Manter uma câmera ligada ao computador como alternativa. Exibir estados claros para
   permissão negada, desconexão e reconexão. Encerrar faixas e conexão ao trocar a fonte ou sair.
2. **Temporizador e captura.** Na Etapa 04, controles manuais iniciarão uma contagem de 5 ou 10
   segundos. O fluxo compartilhado passa por prévia, contagem, captura e revisão, com cancelamento
   ou reinício se a fonte ficar indisponível. Usar um prazo monotônico para a contagem, bloquear
   disparos concorrentes e produzir um único `Blob` com Canvas na resolução do frame recebido
   (`videoWidth` e `videoHeight`), independente do tamanho da prévia.
3. **Gestos.** Na Etapa 05, MediaPipe Tasks Vision analisará amostras do vídeo localmente com
   modelo pré-treinado. Limitar frequência e manter apenas um frame em processamento. Avaliar
   Worker quando a inferência impactar a interface. Confiança configurável, confirmação ao longo
   de múltiplos frames, intervalo entre disparos e bloqueio fora da prévia reduzem falsos
   acionamentos. O gesto usa o mesmo comando de captura da interface manual.
4. **Edição.** Na Etapa 06, manter a foto original em memória e representar filtros e molduras
   como parâmetros reversíveis. Compor a prévia em resolução reduzida e exportar o resultado
   em resolução adequada usando Canvas.
5. **Cenários virtuais.** Na Etapa 07, avaliar segmentação de pessoas no dispositivo, com máscara
   suavizada e composição do primeiro plano sobre o cenário selecionado. Validar bordas e grupos
   em condições variadas. Se o modelo falhar ou demorar, oferecer edição com fundo original.
6. **Armazenamento.** Na Etapa 08, após autorização específica de armazenamento, enviar somente
   o arquivo autorizado a um bucket privado do Supabase. Guardar metadados mínimos (evento,
   foto, consentimento e expiração) em tabelas com RLS e aplicar controles equivalentes ao
   Storage. Usar chaves de operação idempotentes para evitar cargas duplicadas e limpar objetos
   órfãos em falhas parciais. A exclusão remove os arquivos associados e revoga o acesso de
   compartilhamento.
7. **QR Code.** Na Etapa 09, gerar o QR a partir de uma URL com token opaco e expiração. O
   servidor verifica validade e revogação a cada acesso e autoriza apenas a foto solicitada.
   Se usar URL assinada para entrega, manter sua validade curta e documentar a janela residual
   após revogação; quando for necessário revogar imediatamente, entregar a foto pelo servidor.
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
