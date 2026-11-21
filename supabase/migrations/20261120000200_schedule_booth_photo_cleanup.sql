create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;

create function public.booth_queue_cleanup()
returns bigint language plpgsql set search_path = '' as $$
declare
  project_url text;
  token text;
begin
  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'booth_project_url';
  select decrypted_secret into token from vault.decrypted_secrets where name = 'booth_cleanup_token';
  if project_url is null or token is null then
    raise exception 'Configure booth_project_url e booth_cleanup_token no Vault.';
  end if;
  return net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/booth-cleanup',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Booth-Cleanup', token),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end;
$$;

revoke execute on function public.booth_queue_cleanup() from public, anon, authenticated, service_role;

select cron.schedule('booth-photo-cleanup', '*/5 * * * *', 'select public.booth_queue_cleanup()');
