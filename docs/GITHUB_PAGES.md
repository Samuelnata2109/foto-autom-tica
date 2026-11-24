# Publicação no GitHub Pages

O endereço público é [samuelnata2109.github.io/foto-autom-tica/](https://samuelnata2109.github.io/foto-autom-tica/). O único workflow de publicação é `.github/workflows/deploy-pages.yml` (**Publicar AI Photo Booth no GitHub Pages**). Ele publica `dist` no push para `develop` e também pode ser acionado em **Actions → Run workflow**. O modo `github-pages` do Vite usa `/foto-autom-tica/`. O desenvolvimento local usa `/`.

## Configuração no GitHub antes do merge

1. Em **Settings → Pages → Build and deployment**, confirme **Source → GitHub Actions**.
2. Em **Settings → Environments → github-pages → Deployment branches and tags**, mantenha **Selected branches and tags**, adicione `develop` como branch permitida e remova a regra `main`. Enquanto `.github/workflows/static.yml` e `.github/workflows/jekyll-gh-pages.yml` existirem na `main`, desative os dois em **Actions** para impedir que concorram com a publicação de `develop`. O botão **Run workflow** aparece quando o arquivo com `workflow_dispatch` está na branch padrão. Para migrar a publicação para `main`, altere o gatilho e a regra do ambiente juntos.
3. Em **Settings → Secrets and variables → Actions → Variables**, cadastre as duas variáveis do repositório indicadas abaixo. O workflow as lê como `vars.VITE_SUPABASE_URL` e `vars.VITE_SUPABASE_PUBLISHABLE_KEY`. Os valores entram no bundle público. Use a chave _Publishable_ do projeto Supabase ou a chave legada `anon`, obtida no painel do mesmo projeto. Mantenha `service_role`, `sb_secret_`, senhas e tokens administrativos fora dessas variáveis e do frontend.

| Variável                        | Configuração                                                                                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Repository variable com a origem HTTPS do projeto hospedado.                                                                                                                                         |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Repository variable com a chave pública do mesmo projeto.                                                                                                                                            |
| `VITE_PHOTO_SHARE_BASE_URL`     | Definida pelo workflow como `https://samuelnata2109.github.io/foto-autom-tica/`. Use o mesmo endereço no `.env.local` da cabine quando ela rodar localmente e os celulares abrirem o site publicado. |

O build do Pages exige as variáveis e valida a chave pública antes de gerar o bundle. A preparação baixa o modelo oficial de gestos e verifica o SHA-256 com `npm run setup:gesture-model`. Os modelos, os carregadores e binários WASM, os cenários, as fontes e as molduras entram no artefato e são servidos sob `/foto-autom-tica/`. [Documentação do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Validação após o deploy

1. Após o merge, em **Actions**, confirme o sucesso dos jobs `build` e `deploy` no commit de `develop`. Abra o endereço exibido no deploy. Um erro de branch no job `deploy` indica que `develop` ainda precisa ser autorizada no ambiente `github-pages`.
2. No HTTPS publicado, entre na cabine e teste a webcam ou DroidCam, uma captura com moldura, o reconhecimento de gestos e um cenário virtual. No painel **Network** do navegador, confira que o site carrega scripts, modelos e WASM em `/foto-autom-tica/`.
3. Use uma foto sintética. Entre como operador, confirme a foto e autorize o armazenamento e depois o compartilhamento. Verifique que o link começa com `https://samuelnata2109.github.io/foto-autom-tica/#/foto/`. Abra e recarregue o link no celular em outra rede, confira o JPEG e tente reabri-lo após revogar na cabine. A rota por fragmento é tratada pelo `HashRouter` e carrega o `index.html` da subpasta. [Roteiro de homologação do QR](COMPARTILHAMENTO_QR.md)

Na publicação do [PR #27](https://github.com/Samuelnata2109/foto-autom-tica/pull/27), o [workflow 45305396812](https://github.com/Samuelnata2109/foto-autom-tica/actions/runs/45305396812) concluiu o build e o deploy do commit `a5b9f138e8f115aedb25b1000951cda1a577eb7b`. O preflight de produção retornou HTTP 204 para `https://samuelnata2109.github.io`, e o desenvolvedor confirmou a recuperação e o download de uma fotografia por QR no celular. O Pages e o Supabase de produção atendem esse fluxo independentemente do Cloudflare Tunnel.

Se uma configuração futura causar HTTP 403 no preflight, confira `BOOTH_ALLOWED_ORIGINS` em **Edge Function Secrets**. A origem do Pages deve ser `https://samuelnata2109.github.io`, sem o caminho do repositório. Preserve as demais origens necessárias e separe as entradas por vírgulas. [Variáveis de ambiente da Edge Function](https://supabase.com/docs/guides/functions/secrets)

Para testar a estrutura do build localmente, configure as três variáveis no `.env.local`, execute `npm run setup:gesture-model`, `npm run build -- --mode github-pages` e `npm run preview -- --mode github-pages`. Abra `http://localhost:4173/foto-autom-tica/` para conferir a subpasta. O QR gerado com essa configuração continua apontando para o endereço público HTTPS.
