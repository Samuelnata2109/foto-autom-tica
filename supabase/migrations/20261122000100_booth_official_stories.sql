create table public.booth_story_requests (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid unique references public.booth_photos(id) on delete set null,
  share_hash text references public.booth_photo_shares(token_hash) on update set null on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  consent_version text not null check (consent_version = 'official-stories-v1'),
  forget_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'published')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  published_by uuid,
  published_at timestamptz
);
create index booth_story_share_idx on public.booth_story_requests (share_hash);
create index booth_story_order_idx on public.booth_story_requests (created_at desc, id desc);
create index booth_story_forget_idx on public.booth_story_requests (forget_at);

create table public.booth_story_operator_limits (
  operator_id uuid primary key,
  window_start timestamptz not null,
  requests integer not null
);

alter table public.booth_story_requests enable row level security;
alter table public.booth_story_operator_limits enable row level security;
revoke all on public.booth_story_requests, public.booth_story_operator_limits
  from public, anon, authenticated;
grant select, insert, update, delete on public.booth_story_requests, public.booth_story_operator_limits
  to service_role;

create view public.booth_story_availability with (security_invoker = true) as
select r.id, r.created_at, r.status,
  s.photo_id is not null as available,
  case when s.photo_id is not null then p.storage_path end as storage_path,
  p.expires_at
from public.booth_story_requests r
left join public.booth_photos p on p.id = r.photo_id
  and p.status = 'ready' and p.expires_at > clock_timestamp()
left join public.booth_photo_shares s on s.photo_id = p.id and s.token_hash = r.share_hash;

revoke all on public.booth_story_availability from public, anon, authenticated;
grant select on public.booth_story_availability to service_role;

create function public.booth_create_story(p_hash text, p_consent text)
returns text language plpgsql set search_path = '' as $$
declare
  target record;
  access jsonb;
begin
  if p_consent is distinct from 'official-stories-v1' then return 'consent'; end if;
  -- Use the same photo-first lock order as QR issuance, revocation and photo deletion.
  select p.id, p.expires_at into target
  from public.booth_photo_shares s join public.booth_photos p on p.id = s.photo_id
  where s.token_hash = p_hash and p.status = 'ready' and p.expires_at > clock_timestamp()
  for update of p;
  if not found then return 'unavailable'; end if;
  access := public.booth_shared_photo(p_hash, true);
  if access->>'state' = 'limited' then return 'limited'; end if;
  if access->>'state' is distinct from 'ready' or target.expires_at <= clock_timestamp() then
    return 'unavailable';
  end if;

  insert into public.booth_story_requests (photo_id, share_hash, consent_version, forget_at)
    values (target.id, p_hash, p_consent, target.expires_at + interval '24 hours')
    on conflict (photo_id) do nothing;
  if found then return 'created'; end if;
  return 'exists';
end;
$$;

create function public.booth_story_operator_limit(p_operator uuid)
returns boolean language plpgsql set search_path = '' as $$
declare
  now_value timestamptz := clock_timestamp();
begin
  insert into public.booth_story_operator_limits as limits (operator_id, window_start, requests)
    values (p_operator, now_value, 1)
    on conflict (operator_id) do update set
      requests = case when limits.window_start <= now_value - interval '1 minute'
        then 1 else limits.requests + 1 end,
      window_start = case when limits.window_start <= now_value - interval '1 minute'
        then now_value else limits.window_start end
    where limits.requests < 30 or limits.window_start <= now_value - interval '1 minute';
  return found;
end;
$$;

create function public.booth_list_stories(p_offset integer)
returns jsonb language sql set search_path = '' as $$
  select coalesce(jsonb_agg(page.row_data order by page.created_at desc, page.id desc), '[]'::jsonb)
  from (
    select entry.id, entry.created_at, jsonb_build_object(
      'id', entry.id, 'createdAt', entry.created_at, 'available', entry.available,
      'status', case when entry.available or entry.status = 'published'
        then entry.status else 'unavailable' end
    ) as row_data
    from public.booth_story_availability as entry
    order by entry.created_at desc, entry.id desc
    limit 26 offset greatest(p_offset, 0)
  ) as page;
$$;

create function public.booth_story_photo(p_id uuid, p_download boolean)
returns jsonb language sql set search_path = '' as $$
  select jsonb_build_object('state', 'ready', 'path', storage_path, 'expires_at', expires_at,
    'remaining_ms', greatest(0, floor(extract(epoch from expires_at - clock_timestamp()) * 1000)))
  from public.booth_story_availability
  where id = p_id and available and (not p_download or status = 'approved');
$$;

create function public.booth_update_story(p_id uuid, p_operator uuid, p_decision text)
returns text language plpgsql set search_path = '' as $$
declare
  photo uuid;
begin
  if p_operator is null or p_decision is null or p_decision not in ('approve', 'reject', 'publish') then
    return 'conflict';
  end if;
  select p.id into photo
  from public.booth_story_requests r join public.booth_photos p on r.photo_id = p.id
  where r.id = p_id for update of p;
  if not found or not exists (
    select 1 from public.booth_story_availability where id = p_id and available
  ) then return 'unavailable'; end if;

  if p_decision = 'publish' then
    update public.booth_story_requests set
      status = 'published', published_by = p_operator, published_at = clock_timestamp()
    where id = p_id and status = 'approved';
  else
    update public.booth_story_requests set
      status = case when p_decision = 'approve' then 'approved' else 'rejected' end,
      reviewed_by = p_operator, reviewed_at = clock_timestamp()
    where id = p_id and status = 'pending';
  end if;
  if found then return 'updated'; end if;
  return 'conflict';
end;
$$;

revoke execute on function public.booth_create_story(text, text), public.booth_story_operator_limit(uuid),
  public.booth_list_stories(integer), public.booth_story_photo(uuid, boolean),
  public.booth_update_story(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.booth_create_story(text, text), public.booth_story_operator_limit(uuid),
  public.booth_list_stories(integer), public.booth_story_photo(uuid, boolean),
  public.booth_update_story(uuid, uuid, text) to service_role;

-- Keep a short-lived status after expiry without retaining the photograph.
select cron.schedule('booth-story-metadata-cleanup', '17 * * * *', $job$
  delete from public.booth_story_requests where forget_at <= clock_timestamp();
  delete from public.booth_story_operator_limits
    where window_start <= clock_timestamp() - interval '1 day';
$job$);
