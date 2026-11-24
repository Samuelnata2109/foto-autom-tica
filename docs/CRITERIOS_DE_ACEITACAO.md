# Critérios de aceitação — Etapa 12

A liberação para a Feira das Profissões 2026 depende das evidências da [matriz de testes](MATRIZ_DE_TESTES.md) e do [checklist operacional](CHECKLIST_OPERACIONAL.md).

| Subetapa | Aceite | Evidência |
| --- | --- | --- |
| 12.1 — Segurança e ajustes finais | Configuração local isolada de produção, URL de homologação e host coerentes quando usados, foto sintética armazenada no projeto correto e descarte automático comprovado. | Destino conferido antes da escrita, resultado do armazenamento, execução agendada e confirmação separada da remoção física do objeto expirado. |
| 12.2 — Simulação do evento | Atendimento consecutivo de 30 a 60 minutos no equipamento da feira. Captura, gestos, temporizador, molduras, cenários virtuais, armazenamento, QR e Stories funcionam no ensaio. Falhas relevantes foram corrigidas e os casos afetados, retestados. | Registro do ensaio com equipamento, duração, fluxos e ocorrências. Métricas detalhadas ficam reservadas à investigação de sintomas. |
| 12.3 — Entrega final | Lint, typecheck, testes e build aprovados e diff revisado no PR final para `develop`. Após autorização para merge e deploy, versão publicada e fluxos essenciais conferidos. | Resultados automatizados, PR, SHA do candidato e da publicação, conferência em produção e checklist atualizado. |

Use a evidência anterior de RLS, permissões, autenticação, bucket privado e fluxos publicados enquanto a configuração relevante continuar a mesma. Revalide os pontos afetados por mudanças. Falhas de isolamento, privacidade, descarte ou operação que comprometam o evento bloqueiam a liberação. Proteja as evidências, usando fotos sintéticas e registros sem dados pessoais ou credenciais.
