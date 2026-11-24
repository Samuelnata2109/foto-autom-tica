# Checklist operacional — Feira das Profissões 2026

Preencher no ensaio e no dia do evento. Registrar data, local, commit, navegador, câmera e responsável. Utilizar uma foto sintética e a conta aprovada para verificações. Evitar evidências com fotografias de visitantes, senhas, JWTs ou QR completos.

## Antes de abrir a cabine

- [ ] Confirmar o ambiente, a versão publicada e o projeto Supabase esperado. Separar ensaio de produção para impedir armazenamento de teste no projeto errado.
- [ ] Ligar e posicionar computador, monitor, câmera e alimentação. Conferir enquadramento, iluminação, fundo e área de circulação. Manter webcam suplente acessível.
- [ ] Configurar fonte no navegador e verificar resolução efetiva. Se usar DroidCam, testar alimentação, conexão e vídeo no cliente antes de selecionar a webcam virtual. [Guia da câmera](CONFIGURACAO_CAMERA.md)
- [ ] Abrir perfil de navegador aprovado, conferir permissão de câmera, tela cheia, zoom e conexão. Confirmar feedback e controles manuais antes de ativar gestos.
- [ ] Autenticar a equipe no ambiente correto e conferir acesso à fila. Confirmar responsáveis por avisos de privacidade, consentimento, tratamento de menores e escalonamento.
- [ ] Fazer a captura de verificação no ambiente autorizado. Conferir moldura no visor e JPEG, consentimentos, leitura do QR em um segundo dispositivo e download. Conferir fila de Stories conforme autorização de teste. [Guia de QR](COMPARTILHAMENTO_QR.md)
- [ ] Confirmar estado da limpeza ou solicitar a verificação agregada ao responsável técnico. Definir horário e canal para rechecagem. [Armazenamento privado](ARMAZENAMENTO_PRIVADO.md)

## Durante o atendimento

- [ ] Explicar o processo, obter as autorizações correspondentes e conferir a foto com o participante antes de armazenar ou compartilhar.
- [ ] Iniciar nova sessão a cada visitante. Não reutilizar QR, prévia ou consentimento de outra pessoa. Usar a alternativa manual quando os gestos estiverem instáveis.
- [ ] Monitorar imagem, responsividade e conexão. Registrar horário, tipo de falha, ação tomada e resultado sem dados pessoais.
- [ ] Em Stories, conferir solicitação e consentimento, usar a fila protegida e registrar publicação somente após a ação manual prevista. [Guia de Stories](INTEGRACAO_INSTAGRAM.md)

| Falha | Contingência e critério de retorno |
| --- | --- |
| Webcam ou DroidCam sem vídeo | Pausar capturas. Conferir cabo, cliente e permissão, selecionar novamente ou conectar a câmera suplente. Retomar após testar prévia e um disparo sintético. |
| Gestos ou modelos sem resposta | Usar disparo e confirmação manuais. Usar fundo original se a segmentação falhar. Reativar a IA somente após verificar o reconhecimento. |
| Internet ou Supabase indisponível | Se a página e a câmera ainda estiverem carregadas, manter apenas captura e revisão locais disponíveis. Informar a indisponibilidade de armazenamento, QR e Stories. Não prometer envio posterior. Retomar após conferir rede, destino, estado da operação anterior e um teste autorizado. |
| Sessão expirada ou aba recarregada | Encerrar a sessão anterior, entrar novamente e conferir a fila antes de repetir operações. Se a foto local se perdeu na recarga, solicitar nova captura com autorização. |
| Falha de autorização, exposição ou retenção | Pausar o fluxo afetado e acionar suporte. Registrar evidência redigida e evitar tentativas que alterem segredos, políticas ou registros. |

## Encerramento

- [ ] Encerrar a sessão do visitante e sair da conta da equipe. Fechar a cabine, confirmar que a câmera parou e desligar os equipamentos conforme orientação local.
- [ ] Destinar JPEGs baixados segundo a política do evento. Conferir o responsável pela fila e pela verificação de descarte e backlog.
- [ ] Registrar ocorrências, pendências, horário de parada e responsável pela próxima ação.

## Publicação e reversão

- [ ] Antes de uma publicação autorizada, guardar SHA e execução conhecida como estável e conferir a matriz e os critérios de liberação. [Publicação no GitHub Pages](GITHUB_PAGES.md)
- [ ] Após o workflow, confirmar SHA, jobs, ambiente, assets e os fluxos principais publicados. Registrar a decisão de seguir ou reverter.
- [ ] Se necessário, pausar a operação afetada e propor um PR de reversão para `develop` a partir da versão estável, com revisão e novo workflow autorizado. Conferir compatibilidade com o backend antes de reverter frontend. Tratar eventual reversão no banco em procedimento e autorização separados.
