# Etapa 12 — Testes, otimização e implantação

## Escopo e estado inicial

Base de trabalho `develop` no merge `24c95ba4bdeb7a4904022b777909b477e995820b` do [PR #28](https://github.com/Samuelnata2109/foto-autom-tica/pull/28). O [Pages](https://samuelnata2109.github.io/foto-autom-tica/) já está publicado. O fluxo principal de captura, QR, download e Stories foi validado em produção no PR #27. A referência automatizada é de 191 testes em 16 arquivos. A preparação e o diagnóstico inicial desta etapa estão registrados aqui. A execução da matriz e as intervenções ainda aguardam autorização.

A finalidade é demonstrar que o conjunto de equipamentos, software e procedimentos suporta a Feira das Profissões 2026. Use a [matriz de testes](MATRIZ_DE_TESTES.md), os [critérios de aceitação](CRITERIOS_DE_ACEITACAO.md) e o [checklist operacional](CHECKLIST_OPERACIONAL.md). Preserve a identidade visual e os fluxos aprovados.

## Inventário e cobertura

| Área | Implementação e integrações críticas | Cobertura já identificada e lacunas |
| --- | --- | --- |
| Cabine e vídeo | `BoothPage`, `CameraViewport`, `CameraControls`, `useCamera`, `camera.ts`, MediaDevices e DroidCam do sistema | `BoothFlow` e `PhotoCapture` usam mídia simulada. Driver, resolução negociada, reconexão física e tela cheia exigem equipamento. |
| Captura, gestos e composição | `CaptureControls`, `useCountdown`, `usePhotoCapture`, `useGestureRecognition`, `gestureRecognition.worker.ts`, `photoCapture.ts`, `photoComposition.ts`, `PhotoReview` e `PhotoPreview` | Testes de comando, tempo, cancelamento, geometria, espelho e sobreposição. Precisão e fluidez no equipamento da feira serão observadas no ensaio. A revisão e os ajustes de composição existentes são o escopo do editor neste plano. |
| Cenários | `virtualBackground.ts`, `virtualBackground.worker.ts`, `subjectMask.ts`, `visionActivity.ts` e MediaPipe | `VirtualBackground` e `PhotoCapture` cobrem coordenação e falhas. Qualidade da máscara e fluidez com cenas reais serão observadas no ensaio. |
| Auth, armazenamento e QR | `OperatorLogin`, `PhotoStorageConsent`, `PhotoShareControls`, `SharedPhotoPage`, `supabaseAuth.ts`, `privatePhotoStorage.ts`, `photoShareLink.ts`, `booth-photos`, RPCs e bucket privado | Vitest cobre interface e handlers, além de convite e recuperação com dados simulados. O fluxo publicado já teve prova manual. O isolamento ganhou testes negativos em bd2c8bb. A passagem pelo QR em outro dispositivo integra o ensaio. |
| Stories e retenção | `StoryOptions`, `storyImage.ts`, `storyStorage.ts`, `AdminPage`, `OfficialStoryQueue`, `booth-cleanup` e jobs Cron de fotos e metadados | `AdminPage`, `StoryImage`, `StoryBackend` e quatro suítes SQL no repositório. Há um roteiro de integração com Storage local. A cobertura simulada não demonstra Web Share no sistema, execução hospedada do Cron ou remoção física. |
| Build e publicação | `package.json`, lockfile, `vite.config.ts`, `scripts/setup-gesture-model.mjs` e `.github/workflows/deploy-pages.yml` | Workflow versionado publica de `develop` com Node 24, `npm ci`, modelo, build e checagem de recursos. A suíte Vitest e as SQL não fazem parte desse workflow. A auditoria é de cobertura por cenários. Percentuais de linhas não foram medidos. |

React, React Router, Motion, MediaPipe, Supabase Auth e qrcode.react são dependências centrais em execução. Vite, Vitest, jsdom e CLI Supabase participam da preparação e dos testes. `npm audit --json --no-fund` reportou zero avisos nesta consulta. Esse resultado se limita ao catálogo npm consultado e às versões do lockfile. Nenhum pacote foi instalado ou corrigido.

## Diagnóstico inicial e prioridades

P0 bloqueia liberação por risco de segurança, integridade ou indisponibilidade grave. P1 exige tratamento antes do ensaio afetado ou da liberação. P2 é melhoria programável. A prioridade indicada não confirma que o problema foi reproduzido em produção.

| ID | Gravidade / prioridade | Evidência e consequência | Próximo passo proposto |
| --- | --- | --- | --- |
| D01 | Alta / P1 antes de testes com escrita | `loadEnv('development')` no workspace resolve para o projeto Supabase de produção. Antes da proteção, o cliente normalizava a URL pela origem e permitia operar nesse projeto mesmo sem QR disponível. | O Vite agora bloqueia essa configuração. Preparar a configuração de teste e conferir o destino antes de qualquer operação com escrita. |
| D02 | Média / P1 para homologação externa | O modo `homologacao` resolve outro projeto, mas o QR usa Quick Tunnel e a alteração local de `vite.config.ts` tem aspas literais no valor de `allowedHosts`. Um hostname recebido sem essas aspas não corresponde à entrada. A disponibilidade do túnel não foi testada nesta auditoria. | Validar host, HTTPS, CORS e projeto antes da rodada externa. Tratar a configuração local em tarefa separada após autorização. |
| D03 | Alta se a limpeza falhar / P1 | As migrations e testes definem retenção e reconciliação. Falta evidência operacional desta etapa do Cron, do backlog e da remoção física com armazenamento real. O fluxo principal validado não prova descarte. | Ensaiar com objeto sintético em ambiente descartável e observar o ambiente autorizado segundo o roteiro de retenção. |
| D04 | Média / P1 | O ensaio prolongado no equipamento da feira ainda precisa de evidência. Os 191 testes de referência e a validação manual anterior cobrem outra parte do risco. | Simular atendimento por 30 a 60 minutos e investigar sintomas observados. |
| D05 | Média / P2 | O workflow de deploy confere build e artefato, mas não roda lint, typecheck ou Vitest. Arquitetura e requisitos ainda misturam intenções do editor e do painel com o comportamento entregue, inclusive anotação antiga sobre espelhamento. | Executar as checagens localmente na entrega final. Melhorias no workflow e nos documentos ficam para revisão separada. |

Produção usa a base pública do Pages, o projeto de produção e chave publicável no build do Actions. O túnel é uma dependência da homologação externa configurada neste workspace. O modo `github-pages` executado localmente sem as variáveis do workflow não equivale ao build publicado. Para qualquer caso com escrita, confirme previamente o ambiente de teste e evite registrar chaves, senhas, links completos, tokens ou imagens de visitantes.

## Isolamento dos ambientes

O Vite carrega, em ordem de precedência crescente, `.env`, `.env.local`, `.env.<modo>`, `.env.<modo>.local` e as variáveis já definidas no processo. `.env.example` serve como modelo. No workspace auditado, `.env.local` fornecia o projeto de produção com um caminho na URL. O cliente antigo descartava o caminho ao extrair a origem. O modo padrão conseguia, portanto, acessar Auth e a Edge Function de produção mesmo sem QR configurado. `.env.homologacao.local` sobrepõe esse destino no modo correto e tem duas entradas da base de QR. Mantenha uma única entrada válida ao revisar o túnel.

| Modo | Origem do Supabase aceita | Uso |
| --- | --- | --- |
| `development` | `https://sdcthjviahstkqlhrtrh.supabase.co` ou HTTP em loopback na porta 54321 | `npm run dev` com valores públicos de teste em `.env.development.local`. |
| `homologacao` | Apenas `https://sdcthjviahstkqlhrtrh.supabase.co` | `npm run dev -- --mode homologacao`. Para QR em outro dispositivo, configure uma URL HTTPS pública do mesmo ambiente. |
| `production` do Vite | As mesmas origens de `development` | Build padrão para inspeção local ou teste. Para sobrescrever o arquivo comum, use o processo ou `.env.production.local`. |
| `github-pages` | Apenas `https://zzckkrherwyspqtkhokm.supabase.co` | Build do Actions com a base oficial do QR. O cliente de produção funciona na origem pública do Pages. |
| `test` | Cliente real desativado | Vitest usa os mocks e fixtures de cada suíte. |

O Vite recusa variáveis obrigatórias ausentes, uma URL com caminho ou parâmetros, destinos fora da lista e chaves com formato privilegiado. A URL oficial do Pages é obrigatória no build de publicação. Em modos de teste, uma URL de QR ausente mantém o compartilhamento indisponível. O cliente no navegador também aplica a lista de destinos e deixa o Supabase de produção indisponível numa prévia local. A validação de formato não prova a titularidade de chaves publicáveis opacas. Use a chave do projeto correspondente.

As URLs de Auth e `functions/v1/booth-photos` continuam derivadas da origem validada. As Edge Functions continuam usando `SUPABASE_URL` e credenciais do próprio ambiente hospedado. Nenhum arquivo local com credenciais, workflow, secret do Supabase ou configuração de `server.allowedHosts` foi alterado.

## Plano simplificado

Reaproveite a validação do PR #27 em produção para molduras, captura, armazenamento, recuperação por QR no celular, download e aprovação e publicação manual de Stories. Use também as conferências anteriores de RLS, privilégios, autenticação e autorização de operadores e bucket privado. O isolamento (`bd2c8bb`) passou por lint, typecheck, 205 testes em 17 arquivos e builds padrão e do GitHub Pages. Reabra uma verificação quando uma mudança posterior puder causar regressão ou houver indício concreto de falha.

### 12.1 — Segurança e ajustes finais

Em andamento. Após autorização, finalize a configuração local e confira o destino efetivo do Supabase antes de gravar. Revise as proteções já implementadas e, se necessário, deixe uma única URL de compartilhamento em homologação e ajuste o hostname local do túnel. Valide o armazenamento de uma foto sintética em homologação. Confirme em ambiente autorizado que o Cron executou a limpeza e que o objeto expirado foi removido fisicamente do bucket. Registre a execução e a ausência do objeto sem incluir dados privados. A expiração do link, por si só, não comprova o descarte.

### 12.2 — Simulação do evento

Pendente. Use a câmera, o navegador e o computador previstos para a feira. Simule de 30 a 60 minutos de atendimento consecutivo, cobrindo captura manual, gestos, temporizador, molduras e cenários virtuais. Faça uma passagem objetiva por armazenamento, QR em outro dispositivo e fila de Stories. Registre travamentos, lentidão perceptível, falhas de câmera e acionamentos indevidos. Corrija problemas relevantes e reteste o fluxo afetado. Se a cabine estiver estável e fluida, a observação basta. Use métricas detalhadas de CPU, GPU, memória ou FPS somente para investigar um sintoma.

### 12.3 — Entrega final

Pendente. Execute lint, typecheck, testes e build e revise o diff da etapa. Abra o PR final para `develop` e aguarde autorização para merge e deploy. Após a publicação autorizada, confirme a versão servida e faça uma conferência breve dos fluxos essenciais. Registre a conclusão e deixe o checklist operacional atualizado.

## Próxima ação após autorização

Conferir o destino efetivo do Supabase e a configuração local do QR e do host antes de armazenar a primeira foto sintética em homologação.
