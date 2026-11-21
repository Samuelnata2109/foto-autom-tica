insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('booth-photos', 'booth-photos', false, 8388608, array['image/jpeg'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy booth_photos_server_only on storage.objects as restrictive
  for all to anon, authenticated
  using (bucket_id <> 'booth-photos')
  with check (bucket_id <> 'booth-photos');

create table public.booth_photos (
  id uuid primary key,
  session_id uuid not null,
  operator_id uuid not null,
  proof_hash text not null check (proof_hash ~ '^[a-f0-9]{64}$'),
  storage_path text not null unique default (gen_random_uuid()::text || '.jpg'),
  created_at timestamptz not null default clock_timestamp(),
  uploaded_at timestamptz,
  expires_at timestamptz,
  status text not null default 'uploading' check (status in ('uploading', 'ready', 'deleting')),
  scenario_id text not null check (scenario_id in ('original', 'ai-lab', 'data-center', 'neural-networks', 'robotics')),
  width integer not null check (width between 1 and 8192),
  height integer not null check (height between 1 and 8192),
  consent_version text not null check (consent_version = '24h-v1'),
  lease_until timestamptz,
  lease_token uuid,
  retry_at timestamptz not null default '-infinity',
  check (width::bigint * height <= 16777216),
  check ((uploaded_at is null and expires_at is null) or
    (uploaded_at is not null and expires_at is not null and expires_at = uploaded_at + interval '24 hours')),
  check (status <> 'ready' or uploaded_at is not null)
);
create index booth_photos_cleanup_idx on public.booth_photos (status, expires_at, lease_until, retry_at);

create table public.booth_upload_limits (
  operator_id uuid primary key,
  since timestamptz not null,
  attempts integer not null check (attempts between 1 and 30)
);
create table public.booth_cleanup_state (
  singleton boolean primary key default true check (singleton),
  lease_token uuid,
  lease_until timestamptz,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_failed_count integer
);
insert into public.booth_cleanup_state (singleton) values (true);

alter table public.booth_photos enable row level security;
alter table public.booth_upload_limits enable row level security;
alter table public.booth_cleanup_state enable row level security;
revoke all on public.booth_photos, public.booth_upload_limits, public.booth_cleanup_state
  from public, anon, authenticated;
grant select, insert, update, delete on public.booth_photos, public.booth_upload_limits, public.booth_cleanup_state
  to service_role;

create function public.booth_reserve_photo(
  p_id uuid, p_session uuid, p_operator uuid, p_proof text, p_scenario text,
  p_width integer, p_height integer, p_consent text
) returns jsonb language plpgsql set search_path = '' as $$
declare
  photo public.booth_photos%rowtype;
  stamp timestamptz := clock_timestamp();
  nonce uuid := gen_random_uuid();
begin
  perform pg_advisory_xact_lock(hashtextextended(p_operator::text, 0));
  select * into photo from public.booth_photos where id = p_id;
  if found then
    if photo.operator_id <> p_operator or photo.session_id <> p_session or photo.proof_hash <> p_proof then
      return jsonb_build_object('state', 'unavailable');
    end if;
    if photo.status = 'ready' and photo.expires_at > clock_timestamp() then
      return jsonb_build_object('state', 'ready', 'expires_at', photo.expires_at);
    end if;
    return jsonb_build_object('state', 'unavailable');
  end if;
  if not exists (select 1 from public.booth_cleanup_state
      where singleton and last_finished_at > stamp - interval '15 minutes'
        and last_failed_count = 0) then
    return jsonb_build_object('state', 'paused');
  end if;
  insert into public.booth_upload_limits as limits (operator_id, since, attempts)
    values (p_operator, stamp, 1)
  on conflict (operator_id) do update
    set since = case when limits.since <= stamp - interval '1 minute' then stamp else limits.since end,
        attempts = case when limits.since <= stamp - interval '1 minute' then 1 else limits.attempts + 1 end
    where limits.since <= stamp - interval '1 minute' or limits.attempts < 30;
  if not found then return jsonb_build_object('state', 'limited'); end if;
  insert into public.booth_photos
    (id, session_id, operator_id, proof_hash, scenario_id, width, height, consent_version, lease_until, lease_token)
    values (p_id, p_session, p_operator, p_proof, p_scenario, p_width, p_height, p_consent,
      stamp + interval '2 minutes', nonce)
    on conflict (id) do nothing returning * into photo;
  if not found then return jsonb_build_object('state', 'unavailable'); end if;
  return jsonb_build_object('state', 'reserved', 'path', photo.storage_path, 'token', nonce);
end;
$$;

create function public.booth_finish_photo(p_id uuid, p_token uuid)
returns timestamptz language sql set search_path = '' as $$
  update public.booth_photos p
  set uploaded_at = o.created_at, expires_at = o.created_at + interval '24 hours',
    status = 'ready', lease_until = null, lease_token = null
  from storage.objects o
  where p.id = p_id and p.lease_token = p_token and p.status = 'uploading'
    and p.lease_until > clock_timestamp() and o.bucket_id = 'booth-photos' and o.name = p.storage_path
  returning p.expires_at
$$;

create function public.booth_read_path(p_id uuid, p_session uuid, p_operator uuid, p_proof text)
returns text language sql set search_path = '' as $$
  select storage_path from public.booth_photos where id = p_id and session_id = p_session
    and operator_id = p_operator and proof_hash = p_proof and status = 'ready'
    and expires_at > clock_timestamp()
$$;

create function public.booth_request_delete(p_id uuid, p_session uuid, p_operator uuid, p_proof text)
returns text language plpgsql set search_path = '' as $$
begin
  update public.booth_photos
    set status = 'deleting', retry_at = '-infinity'
    where id = p_id and session_id = p_session and operator_id = p_operator and proof_hash = p_proof;
  if found then return 'requested'; end if;
  if exists (select 1 from public.booth_photos where id = p_id) then return 'unavailable'; end if;
  return 'gone';
end;
$$;

create function public.booth_claim_deletions(p_id uuid default null)
returns table (id uuid, path text, token uuid) language sql set search_path = '' as $$
  with candidates as (
    select p.id from public.booth_photos p
    where (p_id is null or p.id = p_id)
      and (p.lease_until is null or p.lease_until <= clock_timestamp())
      and p.retry_at <= clock_timestamp()
      and (p.status in ('uploading', 'deleting') or p.expires_at <= clock_timestamp()
        or (p.status = 'ready' and p.uploaded_at <= clock_timestamp() - interval '5 minutes'
          and not exists (select 1 from storage.objects o
            where o.bucket_id = 'booth-photos' and o.name = p.storage_path)))
    order by p.expires_at asc nulls last, p.created_at, p.id
    limit 40 for update of p skip locked
  )
  update public.booth_photos p
  set status = 'deleting', lease_until = clock_timestamp() + interval '2 minutes', lease_token = gen_random_uuid()
  from candidates c where p.id = c.id
  returning p.id, p.storage_path, p.lease_token
$$;

create function public.booth_ack_delete(p_id uuid, p_token uuid, p_removed boolean)
returns boolean language plpgsql set search_path = '' as $$
begin
  if p_removed then
    delete from public.booth_photos
      where id = p_id and status = 'deleting' and lease_token = p_token;
  else
    update public.booth_photos
      set lease_until = null, lease_token = null, retry_at = clock_timestamp() + interval '1 minute'
      where id = p_id and status = 'deleting' and lease_token = p_token;
  end if;
  return found;
end;
$$;

create function public.booth_claim_sweep()
returns uuid language sql set search_path = '' as $$
  update public.booth_cleanup_state
  set lease_until = clock_timestamp() + interval '4 minutes', lease_token = gen_random_uuid(),
    last_started_at = clock_timestamp()
  where singleton and (lease_until is null or lease_until <= clock_timestamp())
  returning lease_token
$$;

create function public.booth_finish_sweep(p_token uuid, p_failures integer)
returns void language sql set search_path = '' as $$
  update public.booth_cleanup_state
  set lease_until = null, lease_token = null, last_finished_at = clock_timestamp(), last_failed_count = p_failures
  where singleton and lease_token = p_token;
  delete from public.booth_upload_limits where since <= clock_timestamp() - interval '10 minutes';
$$;

create function public.booth_orphan_paths()
returns table (path text) language sql set search_path = '' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'booth-photos' and o.created_at <= clock_timestamp() - interval '5 minutes'
    and not exists (select 1 from public.booth_photos p where p.storage_path = o.name)
  order by o.created_at, o.name limit 40
$$;

do $$
declare routine regprocedure;
begin
  for routine in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'booth_reserve_photo', 'booth_finish_photo', 'booth_read_path', 'booth_request_delete',
      'booth_claim_deletions', 'booth_ack_delete', 'booth_claim_sweep', 'booth_finish_sweep',
      'booth_orphan_paths'
    )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', routine);
    execute format('grant execute on function %s to service_role', routine);
  end loop;
end;
$$;
