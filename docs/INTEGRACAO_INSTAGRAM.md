# Compartilhamento para Instagram Stories — Etapa 10

## Foto vertical e fluxo do visitante

O visitante abre a foto autorizada pelo QR e escolhe **Compartilhar nos meus Stories** ou **Enviar para os Stories oficiais**. O navegador consulta novamente a foto autorizada e cria o JPEG vertical sob demanda. O download do JPEG original continua disponível.

`src/services/storyImage.ts` decodifica o JPEG já composto, incluindo sua moldura e o cenário. O Canvas de 1080 × 1920 recebe uma cópia ampliada e suavizada em uma superfície intermediária de 36 × 64, com uma camada escura de 35%. No centro, a imagem completa é redimensionada proporcionalmente com margem mínima de 48 px. A exportação usa JPEG 0,94. A foto de origem fica preservada. O serviço libera o bitmap e os buffers temporários e as telas revogam as URLs locais ao encerrar a prévia.

### Meus Stories

1. Prepare a prévia e escolha **Abrir compartilhamento** se o navegador aceitar arquivos. O segundo toque é necessário porque a Web Share API exige ativação do usuário. A página envia somente o JPEG ao seletor de destinos do dispositivo. [Especificação Web Share](https://www.w3.org/TR/web-share/)
2. Se o Instagram estiver disponível, escolha-o e conclua o Story no aplicativo. O seletor é do sistema e pode oferecer outros destinos. A disponibilidade do Instagram, a abertura do editor de Stories e a publicação dependem do dispositivo e da ação do participante.
3. Use **Baixar Story em JPEG** se preferir, se o compartilhamento for cancelado ou se falhar. Abra o Instagram, crie um Story e escolha o JPEG na galeria.

A preparação e o download consultam a autorização no servidor. O compartilhamento nativo usa o arquivo já entregue à página e verifica o prazo local antes de abrir o seletor. Um arquivo que já chegou ao aparelho, inclusive um download, fica sob controle do destinatário. A operação funciona com o navegador e o aplicativo instalado pelo participante, sem credenciais ou API da Meta.

### Stories oficiais

Depois de conferir a prévia, o visitante precisa assinalar a autorização específica para envio, análise e possível publicação pública. A autorização fica desmarcada ao abrir o formulário e é independente do armazenamento e do QR. A resposta informa recebimento ou existência de solicitação anterior. Qualquer publicação fica a cargo do operador.

Antes do evento, a organização deve definir o procedimento de autorização e conferência para menores e fotos em grupo. A equipe deve confirmar as autorizações aplicáveis antes de aprovar ou publicar. O checkbox registra a declaração do visitante e a aplicação evita coletar nomes, idade ou documentos dos participantes. Considere o melhor interesse da criança ou adolescente. [LGPD, art. 14](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) · [Enunciado CD/ANPD nº 1](https://www.in.gov.br/web/dou/-/enunciado-cd/anpd-n-1-de-22-de-maio-de-2023-485306934)

## Fila privada e publicação manual

1. Abra **Painel da equipe** na página inicial, entre com uma conta da equipe já autorizada no Supabase e selecione **Stories oficiais**. O link direto `#/equipe/stories` também abre a fila após o login.
2. Visualize a solicitação pendente com o JPEG original e aprove ou rejeite. A fila é paginada e carrega a imagem somente quando o operador abre uma solicitação.
3. Na solicitação aprovada, baixe o JPEG 9:16. No aparelho da equipe, selecione manualmente o perfil oficial e publique um Story com esse arquivo.
4. Na fila, escolha **Marcar como publicada** e confirme **Sim, já foi publicada** após concluir a publicação no Instagram. O servidor exige aprovação prévia. A marcação registra a ação declarada pelo operador.

Rejeitada e publicada são decisões terminais. Fotos expiradas, excluídas ou com o QR revogado ficam indisponíveis para leitura e transições. O registro de uma publicação anterior continua visível enquanto seu metadado estiver presente. A aplicação não consegue retirar um JPEG já baixado ou um Story publicado. A equipe deve cuidar do arquivo local e, se necessário, remover o Story no aplicativo oficial.

## Backend e retenção

- A migration `20261122000100_booth_official_stories.sql` cria a fila `booth_story_requests`, o contador `booth_story_operator_limits`, uma view de disponibilidade e RPCs de serviço. A fila guarda ID, referência à foto e ao hash já existente, data, versão do consentimento, estado e identificadores e datas das decisões da equipe. O servidor registra a autorização no momento da criação.
- A Edge Function `booth-photos` recebe o token do QR no corpo POST. Envia somente o hash ao banco, que exige consentimento vigente, status ativo e prazo da foto. A operação é atômica com a emissão e a revogação do QR. Uma solicitação por foto torna cliques repetidos idempotentes. Revogar ou substituir o QR desvincula a solicitação anterior. Uma nova submissão para a mesma foto retorna que já existe uma solicitação.
- As operações de operador validam JWT e allowlist `BOOTH_OPERATOR_IDS` no backend, inclusive listagem, prévia, decisão e download. RLS e grants restringem as tabelas e RPCs ao serviço. O Storage continua privado. A entrega do JPEG consulta disponibilidade antes e depois do Storage e usa `private, no-store` e `no-referrer`. Não emite URLs assinadas.
- O envio do visitante compartilha a cota do QR de 12 acessos por minuto por token válido. A equipe tem limite separado de 30 operações por minuto por operador. Tokens desconhecidos não criam registros. A resposta pública agrupa indisponibilidade de credencial, expiração e revogação.
- A versão 9:16 é gerada em memória e nunca é armazenada em uma segunda cópia no servidor. O prazo do JPEG original segue o servidor e a rotina de limpeza existente. A exclusão original anula as referências da fila. O job horário `booth-story-metadata-cleanup` remove os registros restantes a partir de 24 horas depois da expiração original, até a próxima execução do job. Ele também remove contadores inativos há um dia.

## Implantação em homologação

1. Use um projeto Supabase de homologação com as migrations anteriores, o bucket privado e a limpeza da Etapa 08. Confirme que o JWT do operador está na lista permitida e que `BOOTH_ALLOWED_ORIGINS` contém o localhost e a origem HTTPS da homologação, sem subpasta. Reutilize as configurações de servidor existentes. [Configuração das Edge Functions](https://supabase.com/docs/guides/functions/function-configuration)
2. Execute `supabase db push --dry-run` no projeto descartável e confira a migration nova. Depois execute `supabase db push` e `supabase functions deploy booth-photos --no-verify-jwt` em homologação. O gateway permite a rota pública e a função faz suas próprias verificações. Confirme o job horário na lista de Cron do Supabase e confira os resultados sem dados de participantes. O job de limpeza de fotos da Etapa 08 permanece separado.
3. Configure o frontend com as variáveis públicas existentes e publique em HTTPS. O Pages usa o mesmo HashRouter e a mesma base. Em produção, a migration e a atualização de `booth-photos` precisam estar disponíveis antes da entrega do frontend. [GitHub Pages](GITHUB_PAGES.md) · [Compartilhamento por QR](COMPARTILHAMENTO_QR.md)

## Testes

Na revisão do PR #25, a consulta original de `booth_list_stories` executou com sucesso. A view fornece `available` à subconsulta, que o inclui em `row_data`. A consulta externa usa `row_data`, `created_at` e `id` da página. Os aliases `entry` e `page` tornam esses escopos explícitos e preservam o JSON, a política de acesso e a ordenação.

A migration original e a revisada passaram nas três suítes SQL em PostgreSQL 17.5 via PGlite, a mesma versão principal configurada em `supabase/config.toml`. As extensões de infraestrutura foram simuladas, e o comando SQL de limpeza foi executado no banco descartável. A verificação incluiu a view com `security_invoker`, os grants e a agregação JSON ordenada. [PostgreSQL 17 — CREATE VIEW](https://www.postgresql.org/docs/17/sql-createview.html) · [PostgreSQL 17 — agregados](https://www.postgresql.org/docs/17/functions-aggregate.html)

- `npm test` cobre tamanho, proporção, moldura, falhas e liberação do Canvas, Web Share, download alternativo, consentimento independente, repetição, acesso da equipe e confirmação humana. As fotografias dos testes são sintéticas.
- Execute `psql -v ON_ERROR_STOP=1 -f supabase/tests/booth_official_stories.sql` em um banco descartável com as migrations aplicadas. O script usa uma transação com rollback e verifica grants, deduplicação, limites, decisões, expiração, revogação, rotação de token e exclusão. A listagem real roda como `service_role` e compara o JSON com solicitações pendentes, aprovadas, rejeitadas, publicadas e indisponíveis na mesma página. O teste também confere a paginação, o retorno `[]` e a disponibilidade de uma foto já publicada após revogação.
- Em Android com Chrome e iPhone com Safari, escaneie o QR de uma foto sintética em homologação HTTPS. Confira o enquadramento e a moldura em 4:3 e 16:9, o JPEG baixado, o seletor nativo e seu cancelamento. Verifique a alternativa por download no desktop. Em uma conta de teste, abra a prévia do Story sem publicar fotos reais.
- Entre com um operador autorizado, valide aprovação e rejeição, reserve o registro manual para uma confirmação humana em ambiente de teste e confira recusa de uma conta fora da allowlist. Abra solicitações antes e depois de revogar o QR, trocar o token, expirar ou excluir a foto. Confira a rotina horária de metadados e a limpeza original. Registre os resultados de campo no PR.
