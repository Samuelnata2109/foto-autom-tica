# Etapa 12 — Testes, otimização e implantação

## Escopo e estado inicial

Base de trabalho `develop` no merge `24c95ba4bdeb7a4904022b777909b477e995820b` do [PR #28](https://github.com/Samuelnata2109/foto-autom-tica/pull/28). O [Pages](https://samuelnata2109.github.io/foto-autom-tica/) já está publicado. O fluxo principal de captura, QR, download e Stories foi validado em produção no PR #27. A referência automatizada é de 191 testes em 16 arquivos. A preparação e o diagnóstico inicial desta etapa estão registrados aqui. A execução da matriz e as intervenções ainda aguardam autorização.

A finalidade é demonstrar que o conjunto de equipamentos, software e procedimentos suporta a Feira das Profissões 2026. Use a [matriz de testes](MATRIZ_DE_TESTES.md), os [critérios de aceitação](CRITERIOS_DE_ACEITACAO.md) e o [checklist operacional](CHECKLIST_OPERACIONAL.md). Preserve a identidade visual e os fluxos aprovados.

## Inventário e cobertura

| Área | Implementação e integrações críticas | Cobertura já identificada e lacunas |
| --- | --- | --- |
| Cabine e vídeo | `BoothPage`, `CameraViewport`, `CameraControls`, `useCamera`, `camera.ts`, MediaDevices e DroidCam do sistema | `BoothFlow` e `PhotoCapture` usam mídia simulada. Driver, resolução negociada, reconexão física e tela cheia exigem equipamento. |
| Captura, gestos e composição | `CaptureControls`, `useCountdown`, `usePhotoCapture`, `useGestureRecognition`, `gestureRecognition.worker.ts`, `photoCapture.ts`, `photoComposition.ts`, `PhotoReview` e `PhotoPreview` | Testes de comando, tempo, cancelamento, geometria, espelho e sobreposição. Precisão real, latência, fluidez e uso prolongado ainda exigem medição. A revisão e os ajustes de composição existentes são o escopo do editor neste plano. |
| Cenários | `virtualBackground.ts`, `virtualBackground.worker.ts`, `subjectMask.ts`, `visionActivity.ts` e MediaPipe | `VirtualBackground` e `PhotoCapture` cobrem coordenação e falhas. Qualidade da máscara, aquecimento e desempenho com cenas reais precisam de ensaio. |
| Auth, armazenamento e QR | `OperatorLogin`, `PhotoStorageConsent`, `PhotoShareControls`, `SharedPhotoPage`, `supabaseAuth.ts`, `privatePhotoStorage.ts`, `photoShareLink.ts`, `booth-photos`, RPCs e bucket privado | Vitest cobre interface e handlers, além de convite e recuperação com dados simulados. O fluxo publicado já teve prova manual. Ainda faltam regressão real com dispositivos diferentes e testes negativos de ambiente. |
| Stories e retenção | `StoryOptions`, `storyImage.ts`, `storyStorage.ts`, `AdminPage`, `OfficialStoryQueue`, `booth-cleanup` e jobs Cron de fotos e metadados | `AdminPage`, `StoryImage`, `StoryBackend` e quatro suítes SQL no repositório. Há um roteiro de integração com Storage local. A cobertura simulada não demonstra Web Share no sistema, execução hospedada do Cron ou remoção física. |
| Build e publicação | `package.json`, lockfile, `vite.config.ts`, `scripts/setup-gesture-model.mjs` e `.github/workflows/deploy-pages.yml` | Workflow versionado publica de `develop` com Node 24, `npm ci`, modelo, build e checagem de recursos. A suíte Vitest e as SQL não fazem parte desse workflow. A auditoria é de cobertura por cenários. Percentuais de linhas não foram medidos. |

React, React Router, Motion, MediaPipe, Supabase Auth e qrcode.react são dependências centrais em execução. Vite, Vitest, jsdom e CLI Supabase participam da preparação e dos testes. `npm audit --json --no-fund` reportou zero avisos nesta consulta. Esse resultado se limita ao catálogo npm consultado e às versões do lockfile. Nenhum pacote foi instalado ou corrigido.

## Diagnóstico inicial e prioridades

P0 bloqueia liberação por risco de segurança, integridade ou indisponibilidade grave. P1 exige tratamento antes do ensaio afetado ou da liberação. P2 é melhoria programável. A prioridade indicada não confirma que o problema foi reproduzido em produção.

| ID | Gravidade / prioridade | Evidência e consequência | Próximo passo proposto |
| --- | --- | --- | --- |
| D01 | Alta / P1 antes de testes com escrita | `loadEnv('development')` no workspace resolve para o projeto Supabase de produção e não tem base de QR. O cliente normaliza a URL pela origem. Uma cabine local com operador autorizado pode escrever em produção mesmo sem QR disponível. | Conferir destino antes de abrir a cabine para testes. Aprovar separação explícita de variáveis e uma barreira contra escrita de teste em produção. |
| D02 | Média / P1 para homologação externa | O modo `homologacao` resolve outro projeto, mas o QR usa Quick Tunnel e a alteração local de `vite.config.ts` tem aspas literais no valor de `allowedHosts`. Um hostname recebido sem essas aspas não corresponde à entrada. A disponibilidade do túnel não foi testada nesta auditoria. | Validar host, HTTPS, CORS e projeto antes da rodada externa. Tratar a configuração local em tarefa separada após autorização. |
| D03 | Alta se a limpeza falhar / P1 | As migrations e testes definem retenção e reconciliação. Falta evidência operacional desta etapa do Cron, do backlog e da remoção física com armazenamento real. O fluxo principal validado não prova descarte. | Ensaiar com objeto sintético em ambiente descartável e observar o ambiente autorizado segundo o roteiro de retenção. |
| D04 | Média / P1 | Matriz física, medições no equipamento do evento, uso prolongado e contingência não têm evidência consolidada. Os 191 testes de referência e a validação manual anterior cobrem outra parte do risco. | Executar a matriz e estabelecer a linha de base antes de alterar desempenho. |
| D05 | Média / P2 | O workflow de deploy confere build e artefato, mas não roda lint, typecheck ou Vitest. Arquitetura e requisitos ainda misturam intenções do editor e do painel com o comportamento entregue, inclusive anotação antiga sobre espelhamento. | Propor checagens no PR e reconciliar documentos com a implementação em revisão separada. |

Produção usa a base pública do Pages, o projeto de produção e chave publicável no build do Actions. O túnel é uma dependência da homologação externa configurada neste workspace. O modo `github-pages` executado localmente sem as variáveis do workflow não equivale ao build publicado. Para qualquer caso com escrita, confirme previamente o ambiente de teste e evite registrar chaves, senhas, links completos, tokens ou imagens de visitantes.

## Plano das oito subetapas

### 12.1 — Auditoria técnica e diagnóstico inicial

- **Objetivo e tarefas.** Validar inventário, classificar lacunas e riscos, conferir lockfile, ambientes e configuração local. **Dependências e prioridade.** Acesso de leitura ao GitHub e npm, branch atualizada. P1. **Risco.** Teste local apontar para produção.
- **Automatizado.** Inventário de arquivos, inspeção redigida do modo Vite, auditoria npm e mapeamento de suites. **Manual.** Confirmar projeto efetivo e operador de teste com o responsável e conferir as evidências anteriores. **Aceite e evidência.** Inventário, tabela de riscos, revisão das dependências e destino de escrita auditável. **Status.** Diagnóstico inicial registrado. Isolamento e linha de base física pendentes.

### 12.2 — Regressão funcional e compatibilidade

- **Objetivo e tarefas.** Executar os casos da matriz no conjunto de equipamentos e navegadores disponível. **Dependências e prioridade.** 12.1, câmera principal e suplente, navegadores e homologação isolada. P1. **Risco.** Assumir equivalência entre mídia simulada, drivers e dispositivos móveis.
- **Automatizado.** Vitest, SQL descartável e regressões da cabine com mocks. **Manual.** Câmeras reais, tela cheia, celular em rede separada, Stories e alternativas de download. **Aceite e evidência.** Casos obrigatórios aprovados por perfil, lacunas justificadas, dimensões do JPEG, estados e resultados registrados. **Status.** Planejada.

### 12.3 — Desempenho e otimização

- **Objetivo e tarefas.** Medir carregamento inicial, câmera, modelos, FPS, latência de gesto e captura, composição e upload, memória, CPU/GPU, falsos acionamentos e tamanho dos bundles. **Dependências e prioridade.** Equipamento e rede representativos, cenário fixo e 12.1. P1. **Risco.** Comparar amostras com cache, iluminação ou hardware diferentes.
- **Automatizado.** Inventariar tamanho bruto e comprimido de JS/CSS, modelos, WASM e imagens. Usar diagnósticos de gestos e traços de desempenho do navegador. **Manual.** Medir frio/quente, IA ligada/desligada e fonte física/virtual. Sugestão inicial de 5 inicializações de cada tipo e 20 capturas por condição crítica. Registrar mediana, p95 quando houver amostras suficientes, faixa e contexto. Medir CPU/GPU e memória com ferramentas do navegador e do sistema, anotando quando uma métrica não estiver disponível.
- **Aceite e evidência.** Linha de base com horários e pontos de medição, falsos acionamentos por tempo de exposição, metas acordadas com a operação e comparação antes/depois sob as mesmas condições. Medir gesto observado até ação e disparo até JPEG separadamente da contagem. Qualquer otimização deve partir de um desvio medido e passar pela matriz de regressão. **Status.** Planejada. Sem metas numéricas de desempenho até a medição inicial.

### 12.4 — Estabilidade e recuperação de falhas

- **Objetivo e tarefas.** Ensaiar desconexão, DroidCam, permissão negada, rede/Supabase, modelos, expiração do operador, cliques repetidos, capturas consecutivas e recarga. **Dependências e prioridade.** Ambiente isolado e perfis de 12.2. P1. **Risco.** Recursos acumulados ou reenvios após recuperação.
- **Automatizado.** Simular erros, concorrência e eventos de ciclo de vida nos testes existentes. **Manual.** Rodada de atendimento contínuo de referência de 60 min e 30 sessões, ajustada ao ritmo estimado. Repetir conexão, recarga, cancelamento e saída. **Aceite e evidência.** Uma foto por disparo autorizado, sem registros ou solicitações duplicadas. Recursos liberados ao encerrar e sem tendência crescente de memória retida em condições equivalentes. Anexar logs redigidos, amostras de memória e registro de retomada. **Status.** Planejada.

### 12.5 — Acessibilidade e usabilidade

- **Objetivo e tarefas.** Avaliar teclado, foco, contraste, legibilidade, alvos, responsividade, erros, feedback e movimento reduzido com visitantes iniciantes. **Dependências e prioridade.** Layout atual, monitor do evento e perfis móveis. P1 para fluxos principais. **Risco.** Ações importantes indisponíveis sem mouse ou ilegíveis a distância.
- **Automatizado.** Revisar testes existentes de foco, navegação e estados. Inspecionar contraste e nomes acessíveis com ferramentas do navegador. **Manual.** Percorrer cabine e fila por teclado, testar preferência de movimento reduzido e observar uma primeira utilização assistida. **Aceite e evidência.** Nenhuma barreira crítica no percurso principal, foco visível, erros compreensíveis e ação seguinte identificável. Registrar roteiro, perfis e achados sem dados pessoais. **Status.** Planejada.

### 12.6 — Segurança, privacidade e retenção

- **Objetivo e tarefas.** Rever operadores, Edge Functions, RLS, grants, bucket, consentimentos separados, TTL, revogação, exclusão, limites, logs e ambientes. **Dependências e prioridade.** 12.1, homologação descartável, conta autorizada e conta de teste fora da lista. P1. **Risco.** Exposição, ação sem consentimento ou descarte incompleto.
- **Automatizado.** Vitest de handlers, SQL descartável e integração local de Storage. **Manual.** Conferir metadados e papel efetivo por leitura autorizada. Em ambiente isolado, observar `booth-cleanup`, Cron, bloqueio de leitura e remoção do objeto e dos registros pertinentes ao fim dos respectivos prazos. **Aceite e evidência.** Privilégio mínimo, recusas e limites demonstrados, ausência de dados privados em artefato/logs, evidência agregada de execução e descarte. Mudanças de segurança ou dados de produção exigem autorização específica. **Status.** Planejada.

### 12.7 — Preparação operacional para o evento

- **Objetivo e tarefas.** Ensaiar montagem, luz, posição, câmera, rede, navegador, tela cheia, login, QR inicial, atendimento, recuperação e encerramento. **Dependências e prioridade.** Equipamento, local, operadores e vagas na matriz. P1. **Risco.** Suplência inexistente ou perda silenciosa de fotos.
- **Automatizado.** Abrir o frontend publicado e verificar status dos recursos e rota de entrada sem escrita. **Manual.** Executar [checklist operacional](CHECKLIST_OPERACIONAL.md) com substituto de câmera e modos de contingência. **Aceite e evidência.** Operador conclui o ensaio, conhece limites do modo local e sabe quando pausar ou chamar suporte. Registrar responsáveis e duração da recuperação. **Status.** Planejada.

### 12.8 — Homologação final e implantação

- **Objetivo e tarefas.** Reproduzir instalação, qualidade e artefato, homologar e documentar reversão. **Dependências e prioridade.** Aceites 12.1–12.7, revisão e autorização de publicação. P1. **Risco.** Versão errada, variáveis divergentes ou reversão impraticável.
- **Automatizado.** `npm ci` em checkout limpo, lint, typecheck, Vitest, build padrão e Pages. Conferir rotas, assets, modelos e endpoints no artefato. **Manual.** Conferir SHA servido, validar a versão aprovada e ensaiar o procedimento de rollback em ambiente seguro. **Aceite e evidência.** Workflow e commit conferidos, checklist assinado e regressões críticas aprovadas. **Status.** Planejada. A publicação atual continua sendo a referência até liberação autorizada.

## Primeira tarefa após autorização

Confirmar a separação efetiva de ambientes antes de qualquer teste com upload. Registrar, sem valores sensíveis, destino do Supabase, origem do frontend, tipo de chave e validade da base do QR por modo. Confirmar uma conta e uma foto sintéticas em ambiente isolado, registrar resultados esperados e revisar a proteção proposta para impedir que `development` aponte acidentalmente para produção.
