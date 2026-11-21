begin;

do $$
declare
  photo uuid := gen_random_uuid();
  session_id_value uuid := gen_random_uuid();
  operator_id_value uuid := gen_random_uuid();
  proof text := repeat('a', 64);
  first_hash text := repeat('b', 64);
  second_hash text := repeat('c', 64);
  uploaded timestamptz := clock_timestamp();
  deadline timestamptz := uploaded + interval '24 hours';
  expired_time timestamptz := uploaded - interval '25 hours';
begin
  if has_table_privilege('anon', 'public.booth_photo_shares', 'SELECT') or
    has_function_privilege('authenticated', 'public.booth_shared_photo(text,boolean)', 'EXECUTE') then
    raise exception 'Direct access to shares must be denied';
  end if;

  insert into public.booth_photos (id, session_id, operator_id, proof_hash, uploaded_at, expires_at,
    status, scenario_id, width, height, consent_version)
  values (photo, session_id_value, operator_id_value, proof, uploaded, deadline,
    'ready', 'original', 640, 480, '24h-v1');

  assert public.booth_create_share(photo, gen_random_uuid(), operator_id_value, proof, first_hash) is null;
  assert public.booth_create_share(photo, session_id_value, gen_random_uuid(), proof, first_hash) is null;
  assert public.booth_create_share(photo, session_id_value, operator_id_value, second_hash, first_hash) is null;
  assert public.booth_revoke_share(photo, gen_random_uuid(), operator_id_value, proof) is false;
  assert public.booth_create_share(photo, session_id_value, operator_id_value, proof, first_hash) = deadline;
  assert public.booth_shared_photo(second_hash, true) is null;
  for i in 1..12 loop
    assert public.booth_shared_photo(first_hash, true)->>'state' = 'ready';
  end loop;
  assert public.booth_create_share(photo, session_id_value, operator_id_value, proof, first_hash) = deadline;
  assert public.booth_shared_photo(first_hash, true)->>'state' = 'limited';
  assert public.booth_shared_photo(first_hash, false)->>'state' = 'ready';
  update public.booth_photo_shares set window_start = clock_timestamp() - interval '1 minute';
  assert public.booth_shared_photo(first_hash, true)->>'state' = 'ready';
  assert public.booth_revoke_share(photo, session_id_value, operator_id_value, proof);
  assert public.booth_revoke_share(photo, session_id_value, operator_id_value, proof);
  assert public.booth_shared_photo(first_hash, true) is null;

  assert public.booth_create_share(photo, session_id_value, operator_id_value, proof, second_hash) = deadline;
  update public.booth_photos set uploaded_at = expired_time, expires_at = expired_time + interval '24 hours'
    where id = photo;
  assert public.booth_create_share(photo, session_id_value, operator_id_value, proof, first_hash) is null;
  assert public.booth_shared_photo(second_hash, true) is null;
  assert public.booth_shared_photo(second_hash, false) is null;

  update public.booth_photos set uploaded_at = uploaded, expires_at = deadline where id = photo;
  assert public.booth_shared_photo(second_hash, true)->>'state' = 'ready';
  assert public.booth_request_delete(photo, session_id_value, operator_id_value, proof) = 'requested';
  assert public.booth_shared_photo(second_hash, true) is null;
  delete from public.booth_photos where id = photo;
  assert not exists (select 1 from public.booth_photo_shares where photo_id = photo);
end;
$$;

rollback;
