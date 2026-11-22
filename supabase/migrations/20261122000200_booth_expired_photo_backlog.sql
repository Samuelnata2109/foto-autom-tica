create index booth_photos_expires_at_idx on public.booth_photos (expires_at)
  where expires_at is not null;

create function public.booth_expired_photo_backlog()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'count', count(*),
    'oldestOverdueSeconds',
      floor(extract(epoch from statement_timestamp() - min(expires_at)))
  )
  from public.booth_photos
  where expires_at <= statement_timestamp();
$$;

revoke execute on function public.booth_expired_photo_backlog()
  from public, anon, authenticated;
grant execute on function public.booth_expired_photo_backlog() to service_role;
