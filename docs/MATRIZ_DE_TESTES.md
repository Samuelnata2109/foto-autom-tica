# Matriz de testes — Etapa 12

Todos os perfis e casos abaixo começam **pendentes** nesta etapa. O teste manual em produção do PR #27 é uma referência histórica, sem inferência sobre equipamento ou navegador que não tenha sido registrado. Execute casos de escrita, falha induzida e retenção com dados sintéticos em local descartável ou homologação isolada e autorizada.

## Perfis mínimos

| Perfil | Fonte e cliente | Resoluções e telas | Casos |
| --- | --- | --- | --- |
| E1 | Webcam integrada no computador do evento com Chrome e Edge | Registrar a resolução real. Exercitar 16:9 e 4:3 quando suportados, monitor do evento e janela reduzida. | C01–C05, S01–S03, A01, P01 |
| E2 | Webcam externa em Chrome e Edge, conforme disponibilidade | 16:9 e 4:3 quando suportados, incluindo reconexão e troca com a integrada. | C01–C05, S01, P01 |
| E3 | DroidCam no Windows em Chrome e Edge | Wi‑Fi e USB conforme a configuração disponível. Registrar resolução, FPS negociado e recuperação da fonte. | C01–C05, S01, P01 |
| E4 | Android com Chrome, como visitante | Tela estreita em retrato e paisagem, rede diferente da cabine quando possível. | Q01, Q02, T01, A01 |
| E5 | iPhone com Safari, como visitante | Tela estreita em retrato e paisagem, rede diferente da cabine quando possível. | Q01, Q02, T01, A01 |
| E6 | Chrome e Edge como operador da equipe | Desktop, janela estreita, teclado e movimento reduzido. | T02, S02, S03, A01 |
| L1 | Vitest com mocks, banco local descartável e build | Fixtures 16:9, 4:3 e proporções sem moldura. Simulações jsdom, SQL, Storage local e compilação Pages. | Casos automatizados indicados abaixo |
| H1 | Projeto isolado com Cron e Storage | Fixtures sintéticas e observação de execução real. | R01, S02, Q02, T02 |

Confirme qual é a combinação principal e qual é a suplente. Use, como referências de viewport, 390 × 844, 1280 × 720 e 1920 × 1080, além da tela real. Registre `não disponível` para equipamento inacessível, com o motivo, a alternativa e o impacto. Simulação de viewport não substitui navegador ou câmera físicos.

## Casos e evidências

| ID | Caso e resultado esperado | Automatizado existente ou previsto | Manual e evidência |
| --- | --- | --- | --- |
| C01 | Abrir câmera, selecionar e trocar a fonte, obter transmissão na resolução negociada. | `BoothFlow`, mocks de MediaDevices. | Registrar dispositivo, resolução, FPS e retomada. |
| C02 | Disparar manualmente em 5 e 10 s, cancelar pela interface, repetir e confirmar só uma foto. | `PhotoCapture`, relógio e Canvas simulados. | Registrar o tempo e o estado da revisão. |
| C03 | Palma aberta aciona 5 s, paz aciona 10 s, punho cancela, polegar confirma. Gesto mantido não repete. | `GestureValidation`, `GestureRecognition`, `GesturePrecision`, `PhotoCapture`. | Registrar acertos, latência e falsos acionamentos com luz e distâncias representativas. |
| C04 | Conferir moldura no visor e JPEG. Conferir espelho ligado/desligado, proporção, centro transparente e aplicação única. Em proporção sem arte, conferir fallback. | `PhotoComposition` e `PhotoCapture`. | Comparar enquadramento com objeto assimétrico e registrar dimensões e saída sintética. |
| C05 | Revisar composição e cenários existentes, repetir ou confirmar. Cenário cancelado ou com erro volta ao fundo original. | `VirtualBackground` e `PhotoCapture`. | Conferir contornos, fluidez, tempo e JPEG final. Ajustes de edição não implementados ficam fora da regressão. |
| Q01 | Consentir armazenamento, emitir QR só após consentimento separado, abrir em outro dispositivo e baixar JPEG correto. | `PhotoStorageConsent`, `SharedPhotoPage` e testes de backend. | Registrar status e base da URL sem token, rede e dimensões do JPEG. |
| Q02 | URL inválida desabilita emissão. QR revogado, expirado, substituído ou excluído deixa de entregar foto. Limites e mensagens funcionam. | `PhotoShareBackend`, `SharedPhotoPage`, SQL de compartilhamento. | Verificar recusas e mensagens com fixtures. Nunca conservar o link completo nas evidências. |
| T01 | Enviar uma solicitação oficial somente com consentimento separado. Web Share usa seletor nativo quando disponível ou oferece JPEG. | `StoryImage`, `StoryBackend`, `SharedPhotoPage`. | Confirmar fila, cancelamento do seletor e fallback em Android/iOS. |
| T02 | Operador autorizado lista, aprova/rejeita, baixa após aprovação e registra publicação manual. Conta fora da lista não acessa. Rota legada mantém proteção. | `AdminPage`, `StoryBackend`, SQL de Stories. | Registrar transições e recusa sem publicar dados reais. Testar logout e expiração com prévia aberta. |
| S01 | Recuperar de permissão negada, desconexão física, perda do DroidCam e falha dos modelos sem disparo tardio. | `BoothFlow`, `PhotoCapture` e testes de gestos. | Interromper e retomar em homologação, verificar que a alternativa manual permanece disponível quando aplicável. |
| S02 | Queda de internet, indisponibilidade do Supabase, recarga e expiração de sessão. Sem falso sucesso nem reenvio duplicado. | Erros simulados em testes de captura, armazenamento e painel. | Simular falhas em ambiente isolado. Registrar recuperação e ações ainda disponíveis. |
| S03 | Cliques repetidos, atendimento consecutivo e encerramento. Sem sessão cruzada, crescimento contínuo de memória retida ou recursos ativos indevidamente. | Asserções de concorrência, timers, aborto e revogação de URLs. | Medir antes, durante e depois da sessão de 12.4 e observar câmera e workers. |
| A01 | Fluxo por teclado, foco, contraste, alvos, legibilidade, erros e movimento reduzido. | Testes DOM existentes e inspeção de acessibilidade planejada. | Observar uma pessoa iniciante e registrar percurso com e sem mouse. |
| P01 | Linha de base de desempenho no conjunto de referência e operação por tempo prolongado. | Artefato, traces e diagnósticos. | Registrar cache, hardware, rede, IA ativa/inativa, latência, FPS, memória, CPU/GPU e falsos gestos. |
| R01 | TTL bloqueia leituras e Cron conclui remoção física, reconciliação e descarte dos metadados conforme seus prazos. | Quatro testes SQL e roteiro local de integração do Storage. | Registrar horários, resultados e backlog agregado em ambiente autorizado, sem imagens ou segredos. |

## Registro de execução

Use uma linha por combinação efetivamente testada. Categorias de resultado: pendente, aprovado, reprovado, bloqueado ou não aplicável com justificativa. Vincule evidências redigidas e abra um achado com severidade quando houver reprovação.

| Caso / perfil | Commit, ambiente e versão do navegador | Equipamento, resolução, rede e data | Resultado | Evidência ou bloqueio |
| --- | --- | --- | --- | --- |
| Exemplo de preenchimento | SHA e ambiente | Versões e condições observadas | Pendente | Referência ao registro de execução |
