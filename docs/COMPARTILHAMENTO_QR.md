# Compartilhamento por QR Code — Etapa 09

Depois de confirmar a foto, faça o armazenamento autorizado da Etapa 08. Escolha **Autorizar compartilhamento e gerar QR Code** para liberar o JPEG ao visitante. Quem tem o link pode acessar o JPEG durante a validade, sem conta. Na cabine é possível copiar o link, revogá-lo, apagar a cópia armazenada ou iniciar uma nova sessão.

## Configuração e implantação

1. Defina `VITE_PHOTO_SHARE_BASE_URL` com a URL pública **HTTPS** do frontend no build da cabine. Use a raiz exata da aplicação publicada, incluindo a subpasta, como `https://conta.github.io/foto-autom-tica/`. O QR vai abrir `#/foto/...` nessa implantação. Configure também `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no build publicado.
2. Confirme que `BOOTH_ALLOWED_ORIGINS` contém a origem do frontend público e da cabine, sem subpasta. A equipe usa as mesmas contas e o mesmo `BOOTH_OPERATOR_IDS` da Etapa 08.
3. Em homologação, confira `supabase db push --dry-run`, aplique a migration `20261121000100_booth_photo_sharing.sql` com `supabase db push` e republique `supabase functions deploy booth-photos --no-verify-jwt`. A função verifica o JWT e a sessão para as ações da equipe e o token de compartilhamento nas leituras do visitante. [Autorização em Edge Functions](https://supabase.com/docs/guides/functions/auth)
4. Publique o frontend e teste em outro dispositivo. A cabine local pode emitir links para o endereço público configurado. A página pública usa `HashRouter` a partir do documento raiz da implantação. [Configuração do armazenamento privado](ARMAZENAMENTO_PRIVADO.md)

## Segurança e operação

- O navegador gera um token de 256 bits com `crypto.getRandomValues`. O token fica no fragmento do QR, que o navegador não inclui na requisição ao servidor do frontend. A página envia o token em um corpo POST de 64 bytes por HTTPS. O banco armazena somente o SHA-256. As respostas usam `private, no-store` e `no-referrer`. Mantenha o fluxo fora de ferramentas de análise e de gravação de sessões.
- A emissão e a revogação usam a prova da sessão e o JWT de operador. A tabela tem RLS e as funções SQL são acessíveis ao serviço. Existe um link por foto. Uma nova emissão com outro token invalida o anterior. Revogar o link preserva a foto privada e permite emitir outro após nova autorização. A cabine oferece revogação durante a sessão atual. Encerrá-la libera a prova local e mantém o link emitido até a expiração da foto.
- A expiração continua sendo a da foto, calculada pelo servidor na Etapa 08. A função verifica hash, estado e expiração antes e depois de obter o JPEG. A exclusão antecipada bloqueia a leitura assim que o estado muda para `deleting`. Quando o registro da foto é removido, o compartilhamento é removido por cascata. O bucket permanece privado.
- Há limite de 12 leituras por minuto por token válido. Tokens não emitidos têm busca indexada e não criam entradas. O servidor responde uniformemente para token inexistente, expirado ou revogado. A visualização e o download consultam o servidor separadamente. A página libera a URL temporária ao expirar. Cópias recebidas enquanto o link era válido podem permanecer sob controle do destinatário.
- O QR é uma credencial temporária da foto. Encerre a sessão local ao sair e valide com a organização como obter consentimento, inclusive para menores, antes do evento. [Orientações de privacidade da Etapa 08](ARMAZENAMENTO_PRIVADO.md)

## Validação

Com uma foto sintética em homologação, entre como operador, capture, confirme e autorize só o armazenamento. Verifique que o QR ainda está ausente. Autorize o compartilhamento e escaneie em Android e iPhone, usando rede móvel ou uma rede separada da cabine. Confira visualização, download em JPEG e cópia do link.

Revogue na cabine, reabra o mesmo link no celular e tente baixar por uma aba já aberta. Repita com exclusão antecipada. Para simular expiração, altere `uploaded_at` e `expires_at` em conjunto apenas na fixture descartável, mantendo o intervalo de 24 horas e o arquivo provisoriamente armazenado. Reabra o link e confirme o bloqueio. Verifique que a limpeza remove a foto e o registro associado.

Execute `psql -v ON_ERROR_STOP=1 -f supabase/tests/booth_photo_shares.sql` em um banco descartável com as migrations aplicadas para testar os controles SQL. Os testes Vitest exercitam o handler e a interface com dados sintéticos. Registre a homologação física com celular e HTTPS no PR.
