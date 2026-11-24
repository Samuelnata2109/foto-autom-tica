# Armazenamento privado — Etapa 08

O QR Code da Etapa 09 usa o mesmo bucket privado e preserva a validade original da fotografia. Consulte o [guia de compartilhamento](COMPARTILHAMENTO_QR.md).

A confirmação da revisão mantém a foto local. O envio só acontece com **Autorizar e armazenar**. A cabine usa o JPEG final revisado, com cenário e moldura se aplicados. Recusar, perder a conexão ou ficar sem Supabase mantém o fluxo local.

## Configuração no Supabase

1. No projeto Supabase, crie uma conta de Auth dedicada à equipe da cabine. Use conta separada para cada operação que precise de isolamento, mantenha a senha fora da interface pública e restrinja inscrição pública quando o projeto for dedicado ao evento.
2. Em desenvolvimento, preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.development.local` com o projeto de homologação ou o Supabase local na porta 54321. Para o modo `homologacao`, use `.env.homologacao.local` com o projeto dedicado. Esses arquivos são ignorados pelo Git. O Vite rejeita chaves secretas e `service_role`, e o projeto de produção só é aceito no build `github-pages`. Na cabine, a equipe entra em **Acesso da equipe**. O JWT é mantido só em memória e pode exigir nova autenticação.
3. Aplique as duas migrations com `supabase link --project-ref <referência>` e `supabase db push`. Revise a lista de migrations antes de aplicá-las. Verifique a tabela `booth_photos` e o bucket privado `booth-photos`. A primeira migration cria a tabela, os controles de concorrência, os limites e a política restritiva do Storage. A segunda cria o job de cinco em cinco minutos.
4. Nas variáveis das Edge Functions, configure `BOOTH_OPERATOR_IDS` com os UUIDs do Auth separados por vírgulas e `BOOTH_ALLOWED_ORIGINS` com as origens exatas do site, por exemplo `https://cabine.exemplo.br`. Inclua `http://localhost:5173` se usar a interface local com o projeto. Configure `BOOTH_CLEANUP_TOKEN` como 32 bytes aleatórios em hexadecimal. Quando definida, `BOOTH_SERVER_SECRET` tem prioridade. Na ausência dela, o runtime usa `SUPABASE_SERVICE_ROLE_KEY`. Se for usar o fallback, deixe `BOOTH_SERVER_SECRET` ausente, pois um valor vazio também tem prioridade. Esses valores ficam no servidor.
5. Publique `booth-photos` e `booth-cleanup` com `supabase functions deploy booth-photos --no-verify-jwt` e `supabase functions deploy booth-cleanup --no-verify-jwt`. A primeira função verifica o JWT real com o Supabase Auth e a lista da equipe. A segunda autentica o token de limpeza. A chave pública sozinha não dá acesso.
6. No Vault do projeto, crie `booth_project_url` com a URL HTTPS do Supabase e `booth_cleanup_token` com o mesmo valor do segredo da função. Verifique a execução agendada antes de coletar fotos. Novas reservas exigem limpeza bem-sucedida nos últimos 15 minutos.

## Convite e recuperação de senha da equipe

Em **Authentication → URL Configuration**, configure a **Site URL** com o endereço real da cabine, incluindo a subpasta se houver. Exemplos: `https://cabine.exemplo.br/` ou `https://conta.github.io/foto-autom-tica/`. Em **Redirect URLs**, adicione os destinos permitidos, mantendo a subpasta e a barra final. Para desenvolvimento, inclua `http://localhost:5173/`. Se especificar um destino explícito para o fluxo de senha, adicione também o URL exato com `?auth=password`, por exemplo `http://localhost:5173/?auth=password`.

Os templates padrão **Invite user** e **Reset password** podem usar `{{ .ConfirmationURL }}`. Envie um novo convite ou uma nova recuperação pelo painel, abra o e-mail em outro navegador ou janela privada e confira a tela de senha. Cadastre a senha e entre em **Acesso da equipe** na cabine. Apenas usuários cujos UUIDs estão em `BOOTH_OPERATOR_IDS` podem operar o armazenamento. Atualizar a senha não altera essa lista.

A aplicação aceita os fragmentos de sessão padrão para `invite` e `recovery`, assim como links personalizados com `token_hash` e o `type` correspondente. Para templates personalizados, prefira o fragmento para manter a prova fora das requisições ao servidor que hospeda o site, por exemplo `{{ .SiteURL }}?auth=password#token_hash={{ .TokenHash }}&type=invite` ou `type=recovery`. A cabine usa o SDK oficial para validar o link e chamar `updateUser` com a sessão validada. Ela remove os campos de autenticação do endereço e mantém a sessão apenas em memória. O fluxo de e-mail configurado aqui não usa callbacks contendo apenas um código PKCE.

Para validar erro, reabra um link já utilizado ou envie uma recuperação com o link vencido. A aplicação deve pedir um novo link, sem abrir o formulário. Confira também a confirmação de senha e o retorno à cabine.

Referências: [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) e [templates de e-mail](https://supabase.com/docs/guides/auth/auth-email-templates).

## Autorização, expiração e revogação

As fotos só são tratadas pelo backend. A política restritiva do bucket veda acesso a `anon` e `authenticated`; as tabelas usam RLS e as RPCs são reservadas ao servidor. Cada operação usa JWT da equipe, identificador aleatório da captura, UUID de sessão e uma prova aleatória de 256 bits. O banco guarda apenas o hash da prova. Caminhos de arquivo são aleatórios e nunca reutilizados. O JPEG é limitado a 8 MiB, dimensões de até 8192 por lado e 16.777.216 pixels. O servidor confere a estrutura e lê as dimensões dos marcadores JPEG. Há limite de 30 novas reservas por operador por minuto.

Uma repetição do pedido com a mesma prova e ID reaproveita o recibo enquanto o registro está pronto. Pedidos simultâneos não enviam um segundo arquivo. Se o upload não terminar, a reserva perde o lease em dois minutos e entra na limpeza. O usuário pode repetir o envio conscientemente, ou pedir exclusão se o resultado do envio ficou incerto. Não há fila de uploads no navegador.

Ao concluir, `uploaded_at` vem do objeto registrado pelo servidor do Storage. O PostgreSQL preenche `expires_at = uploaded_at + interval '24 hours'`. O endpoint autenticado de leitura consulta o banco antes e depois de obter o arquivo. Na igualdade com a expiração ou após revogação, ele recusa novas entregas. As respostas usam `private, no-store`. A exclusão manual muda o estado para `deleting` antes da tentativa física. Se ela falhar, o job repete com a foto já inacessível. A interface oferece exclusão durante a revisão; ao encerrar a sessão local, a prova efêmera sai da memória. O operador não pode acessar outra foto só com o JWT da equipe.

A Etapa 09 entrega o JPEG pela Edge Function, que valida o compartilhamento a cada requisição e bloqueia novas leituras após revogação. Uma URL pré-assinada usualmente continua válida até o fim do prazo e uma resposta em cache pode sobreviver a mudanças de política. Cópias já recebidas pelo participante ficam fora do controle do endpoint. Consulte [acesso e revogação no Storage](https://supabase.com/docs/guides/storage/serving/downloads) e [chaves de assinatura](https://supabase.com/docs/guides/storage/security/signing-keys).

## Inspeção, monitoramento e recuperação

```sql
select jobname, schedule, active from cron.job where jobname = 'booth-photo-cleanup';
select start_time, end_time, status from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'booth-photo-cleanup')
order by start_time desc limit 10;
select last_started_at, last_finished_at, last_failed_count from public.booth_cleanup_state;
select public.booth_expired_photo_backlog();
```

O resultado do Cron confirma o enfileiramento HTTP. Durante o evento, confira o `last_finished_at` e acompanhe a contagem de vencidas e a idade da mais antiga a cada ciclo. Execute a consulta pelo SQL Editor com acesso administrativo ou consulte os logs de `booth-cleanup`. A RPC é restrita ao servidor e retorna apenas `count` e `oldestOverdueSeconds` (segundos desde a expiração mais antiga, ou `null` se a fila estiver vazia).

- `completedWithoutErrors: true` confirma que a execução terminou sem falhas de limpeza. `last_failed_count = 0` registra esse mesmo resultado no banco.
- `expiredQueueDrained: true` indica que, no momento da consulta, não havia registros de fotos vencidas aguardando exclusão. `false` indica trabalho para ciclos posteriores. A medida inclui registros com lease ou aguardando nova tentativa. Órfãos sem registro são tratados à parte.
- `expiredQueueDrained: null` significa que o ciclo estava ocupado ou que a métrica estava indisponível. Neste último caso, confira os logs e consulte o banco antes de considerar a fila drenada. Os logs contêm somente dados agregados e mensagens genéricas.

Se a contagem ou a idade da mais antiga aumentar em ciclos consecutivos, confira falhas e horários no Cron e na Edge Function. Um job saudável processa até 40 registros a cada cinco minutos, cerca de oito por minuto em média, compartilhados com outras exclusões pendentes. Acompanhe a tendência até a fila zerar e confirme a remoção do objeto e do registro em uma amostra autorizada. Em uma futura implantação autorizada, aplique a migration `20261122000200_booth_expired_photo_backlog.sql` antes de publicar a atualização de `booth-cleanup`.

Em condições normais e para lotes dentro da capacidade, o atraso esperado após o bloqueio é até **cinco minutos mais a duração da execução**. Falhas, indisponibilidade ou acúmulo podem estender a remoção física. O bloqueio de leitura vale na hora exata. A limpeza usa lease global e claims por linha com `SKIP LOCKED`, processa até 40 registros e 40 órfãos por ciclo, espera um minuto no caso de falha e tenta no próximo ciclo elegível. Usa a API do Storage para apagar o arquivo. Só depois remove os metadados. Objetos sem registro entram na busca após cinco minutos. Registros sem objeto são reconciliados. Após indisponibilidade, corrija a falha e execute `select public.booth_queue_cleanup();` como administrador, verifique a resposta e acompanhe os ciclos até zerar o acúmulo. Novos uploads ficam pausados sem sucesso recente.

## Testes de implantação e privacidade

- Em banco descartável, `supabase/tests/booth_photo_backlog.sql` usa fixtures de 41, 80 e 100 fotos vencidas e verifica os limites por ciclo, a métrica e o bloqueio de leitura durante a espera. A remoção via Storage é simulada nesse teste.

- Em uma instância descartável com CLI Supabase e Docker, execute `supabase start` e `npm run test:storage:integration`. O teste usa somente a API local, cria um operador e um JPEG sintéticos e acelera o job para um minuto temporariamente. Verifica execução pelo Cron, bucket privado, consentimento, autorização, expiração, exclusão física e de metadados, lease e órfãos. Restaure ou descarte a instância de testes depois. `supabase/tests/booth_photos.sql` contém asserções de banco com dados sintéticos e rollback.
- Em homologação hospedada, use uma foto sintética autorizada. Verifique uma leitura autenticada antes do vencimento e uma leitura negada após avançar a expiração por SQL apenas na fixture. Mantenha o objeto provisoriamente para confirmar que a negação é independente da limpeza física. Aguarde o job e verifique sumiço de linha e objeto. Repita com exclusão manual e conexão interrompida.
- Antes do evento, o responsável pelo tratamento deve validar o aviso de privacidade, a base aplicável, o melhor interesse de crianças e adolescentes e quando exigir autorização do responsável. Defina como a equipe verificará a autorização, os canais de direitos dos titulares e a retenção aplicável a backups. Use o modo local até essa validação. Consulte o [Enunciado nº 1 da ANPD](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes).
