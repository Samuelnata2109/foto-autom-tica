# Roadmap oficial

1. Planejamento e arquitetura.
2. Interface e identidade visual.
3. Integração da câmera.
4. Sistema fotográfico.
5. Reconhecimento de gestos com IA.
6. Editor fotográfico.
7. Cenários virtuais com IA.
8. Backend e armazenamento.
9. Compartilhamento por QR Code.
10. Integração com Instagram.
11. Painel administrativo.
12. Testes, otimização e implantação.

O estado de cada entrega implementada é registrado em [PROGRESSO.md](PROGRESSO.md).

## Etapa 12 — Testes, otimização e implantação

O objetivo é consolidar a qualidade e a operação da cabine para o evento, usando o ambiente já publicado como referência. O diagnóstico inicial e o plano das subetapas 12.1–12.8 estão registrados. A execução dos ensaios e das intervenções aguarda autorização. Os critérios abaixo detalham os [requisitos não funcionais](REQUISITOS.md#não-funcionais) existentes.

[Planejamento e diagnóstico](ETAPA_12_PLANEJAMENTO.md) · [Matriz de testes](MATRIZ_DE_TESTES.md) · [Critérios de aceitação](CRITERIOS_DE_ACEITACAO.md) · [Checklist operacional](CHECKLIST_OPERACIONAL.md)

| Requisito | Critério de aceitação proposto |
| --- | --- |
| Regressão funcional e compatibilidade | Registrar uma matriz representativa de câmeras, navegadores e tamanhos de tela. Validar captura manual e por gestos, temporizador e cancelamento, molduras, cenários, armazenamento, QR e ações da fila de Stories. |
| Acessibilidade e recuperação | Conferir foco, teclado, contraste e movimento reduzido. Demonstrar retomada após recusa de permissão, perda da câmera ou queda de rede, sem captura nem envio duplicado. |
| Desempenho e estabilidade | Medir taxa de quadros, latência, memória e falsos acionamentos no equipamento de referência. Definir metas a partir das primeiras medições e demonstrar que foram atendidas em sessões repetidas e prolongadas. |
| Segurança, privacidade e retenção | Verificar acesso por operador autorizado, consentimentos, revogação, expiração e exclusão com dados sintéticos. Confirmar a execução do Cron e a remoção de objetos vencidos, revisar os avisos de privacidade e conferir que o artefato e os logs não expõem credenciais ou dados privados. |
| Publicação reproduzível | Reproduzir a instalação com `npm ci` e aprovar lint, typecheck, testes e build. Em uma publicação autorizada, conferir o commit e o artefato do Pages, validar os fluxos principais publicados e documentar como recuperar ou reverter uma versão. |
