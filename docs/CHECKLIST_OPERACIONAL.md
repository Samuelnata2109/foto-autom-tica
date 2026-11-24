# Checklist operacional — Feira das Profissões 2026

Use no ensaio e no dia do evento. Registre data, versão, navegador, câmera, responsável e ocorrências. Use fotos sintéticas nas verificações e preserve a privacidade dos registros.

## Antes de abrir a cabine

- [ ] Confirmar a versão e o projeto Supabase esperado. Fazer o ensaio em ambiente autorizado.
- [ ] Ligar computador, monitor e câmera. Ajustar enquadramento, iluminação e tela cheia. Conferir permissão de câmera e conexão. Se usar DroidCam, confirmar vídeo no cliente e no navegador. [Guia da câmera](CONFIGURACAO_CAMERA.md)
- [ ] Confirmar que a equipe autorizada consegue acessar a fila de Stories e sabe como obter consentimento e acionar suporte.
- [ ] Conferir captura, moldura e QR em um segundo dispositivo quando o teste estiver autorizado. Antes da liberação, consultar a evidência da limpeza automática registrada na 12.1. [Guia de QR](COMPARTILHAMENTO_QR.md) · [Armazenamento privado](ARMAZENAMENTO_PRIVADO.md)

## Ensaio de 30 a 60 minutos

- [ ] Simular atendimentos consecutivos no equipamento da feira com captura manual, gestos, temporizador, molduras e cenários virtuais.
- [ ] Conferir armazenamento, QR e Stories em uma passagem. Registrar travamentos, lentidão, perda de câmera ou gestos indevidos e retestar os fluxos afetados por correções.

## Durante o atendimento

- [ ] Explicar o fluxo e obter os consentimentos correspondentes antes de armazenar ou compartilhar. Reiniciar a sessão a cada visitante.
- [ ] Usar a fila protegida e marcar publicação somente após a ação manual. [Guia de Stories](INTEGRACAO_INSTAGRAM.md)

| Falha | Contingência |
| --- | --- |
| Câmera ou DroidCam sem vídeo | Pausar a captura, conferir conexão e permissão, selecionar novamente ou usar câmera suplente. Testar a prévia e um disparo sintético antes de retomar. |
| Gestos ou cenários indisponíveis | Usar disparo manual e fundo original, conforme o recurso afetado. |
| Internet ou Supabase indisponível | Manter captura e revisão locais se ainda estiverem disponíveis. Informar a indisponibilidade dos serviços externos. Conferir a última operação antes de tentar novamente. |
| Sessão expirada ou aba recarregada | Entrar novamente e conferir a fila antes de repetir ações. Se a foto local tiver sido perdida, pedir autorização para uma nova captura. |
| Falha de privacidade, autorização ou retenção | Pausar o fluxo afetado e acionar o responsável técnico. |

## Encerramento

- [ ] Encerrar a sessão do visitante, sair da conta da equipe e conferir se a câmera foi liberada.
- [ ] Tratar JPEGs baixados conforme a política do evento e registrar ocorrências e responsáveis pelas pendências.

## Publicação e reversão

- [ ] Antes de uma publicação autorizada, registrar o SHA estável e conferir os [critérios de aceitação](CRITERIOS_DE_ACEITACAO.md).
- [ ] Após o workflow, conferir SHA, resultado, assets e os fluxos essenciais publicados. Se houver regressão relevante, pausar o fluxo afetado e propor reversão por PR para `develop`, verificando compatibilidade com o backend. [Guia de publicação](GITHUB_PAGES.md)
