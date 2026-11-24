# Matriz de testes — Etapa 12

Use o equipamento e o navegador previstos para a feira. Amplie a cobertura de câmeras e dispositivos se o evento for usar outra configuração ou se houver suspeita de regressão.

| Subetapa | Tipo | Verificação pendente | Evidência esperada |
| --- | --- | --- | --- |
| 12.1 | Configuração local | Conferir o destino efetivo do Supabase, a URL de compartilhamento em homologação e o host do túnel quando usado. Usar os testes de isolamento existentes como referência. | Modo e destino confirmados antes de gravar. Se a configuração mudar, verificar os modos afetados. |
| 12.1 | Manual em homologação | Armazenar uma foto sintética com consentimento. | Armazenamento confirmado no projeto de homologação. |
| 12.1 | Operacional em ambiente autorizado | Acompanhar a execução agendada e verificar a remoção física do objeto sintético expirado. | Execução do Cron registrada e ausência do objeto no bucket confirmada separadamente. |
| 12.2 | Manual no equipamento do evento | Simular 30 a 60 minutos de atendimento consecutivo. Usar captura manual, gestos, temporizador, molduras e cenários virtuais. | Duração, equipamento, navegador, resultado e ocorrências de travamento, lentidão, falha de câmera ou acionamento indevido. |
| 12.2 | Manual em ambiente autorizado | Conferir armazenamento, QR em outro dispositivo e chegada à fila de Stories em uma passagem do ensaio. Reutilizar a foto sintética da simulação para os fluxos relacionados. | Resultado de cada fluxo e registro de eventual falha. |
| 12.3 | Automatizado | Rodar lint, typecheck, testes e build do GitHub Pages no candidato à entrega. | Comandos, SHA, total de testes e resultado do build. |
| 12.3 | Manual após publicação autorizada | Conferir o commit publicado e fazer uma passagem breve por captura com moldura, armazenamento, QR e download em outro dispositivo, e acesso à fila de Stories. | SHA publicado e resultado por fluxo, com dados sintéticos e acesso autorizado. |

O PR #27 fornece a evidência funcional prévia de produção para armazenamento, QR, download e Stories. O commit `bd2c8bb` fornece a evidência de isolamento e a suíte de 205 testes em 17 arquivos. As verificações anteriores de RLS, autorização e bucket privado continuam válidas para a configuração verificada. Repita casos específicos quando houver mudança relevante ou indício de regressão.

Registre data, ambiente, versão, equipamento quando aplicável, resultado e ação tomada. Preserve a privacidade na evidência. Em caso de instabilidade perceptível, documente como reproduzi-la antes de medir desempenho ou propor ajustes.
