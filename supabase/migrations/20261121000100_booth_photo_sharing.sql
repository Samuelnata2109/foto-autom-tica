create table public.booth_photo_shares (
  photo_id uuid primary key references public.booth_photos(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  consent_at timestamptz not null default clock_timestamp(),
  window_start timestamptz not null default clock_timestamp(),
  reads integer not null default 0
);

alter table public.booth_photo_shares enable row level security;
revoke all on public.booth_photo_shares from public, anon, authenticated;
grant select, insert, update, delete on public.booth_photo_shares to service_role;

create function public.booth_create_share(
  p_id uuid, p_session uuid, p_operator uuid, p_proof text, p_hash text
) returns timestamptz language plpgsql set search_path = '' as $$
declare
  deadline timestamptz;
begin
  select expires_at into deadline from public.booth_photos
    where id = p_id and session_id = p_session and operator_id = p_operator and proof_hash = p_proof
      and status = 'ready' and expires_at > clock_timestamp()
    for update;
  if not found or deadline <= clock_timestamp() then return null; end if;

  insert into public.booth_photo_shares (photo_id, token_hash) values (p_id, p_hash)
    on conflict (photo_id) do update set token_hash = excluded.token_hash,
      consent_at = excluded.consent_at, window_start = excluded.window_start, reads = 0
    where booth_photo_shares.token_hash <> excluded.token_hash;
  return deadline;
end;
$$;

create function public.booth_revoke_share(
  p_id uuid, p_session uuid, p_operator uuid, p_proof text
) returns boolean language plpgsql set search_path = '' as $$
begin
  perform 1 from public.booth_photos
    where id = p_id and session_id = p_session and operator_id = p_operator and proof_hash = p_proof
    for update;
  if not found then return false; end if;
  delete from public.booth_photo_shares where photo_id = p_id;
  return true;
end;
$$;

create function public.booth_shared_photo(p_hash text, p_consume boolean)
returns jsonb language plpgsql set search_path = '' as $$
declare
  current_time_value timestamptz := clock_timestamp();
  target record;
begin
  select s.photo_id, p.storage_path, p.expires_at into target
  from public.booth_photo_shares s join public.booth_photos p on p.id = s.photo_id
  where s.token_hash = p_hash and p.status = 'ready' and p.expires_at > current_time_value;
  if not found then return null; end if;

  if p_consume then
    update public.booth_photo_shares set
      reads = case when window_start <= current_time_value - interval '1 minute' then 1 else reads + 1 end,
      window_start = case when window_start <= current_time_value - interval '1 minute'
        then current_time_value else window_start end
    where token_hash = p_hash and (reads < 12 or window_start <= current_time_value - interval '1 minute');
    if not found then return jsonb_build_object('state', 'limited'); end if;
  end if;

  return jsonb_build_object('state', 'ready', 'path', target.storage_path, 'expires_at', target.expires_at,
    'remaining_ms', greatest(0, floor(extract(epoch from target.expires_at - clock_timestamp()) * 1000)));
end;
$$;

revoke execute on function public.booth_create_share(uuid, uuid, uuid, text, text),
  public.booth_revoke_share(uuid, uuid, uuid, text), public.booth_shared_photo(text, boolean)
  from public, anon, authenticated;
grant execute on function public.booth_create_share(uuid, uuid, uuid, text, text),
  public.booth_revoke_share(uuid, uuid, uuid, text), public.booth_shared_photo(text, boolean)
  to service_role;
