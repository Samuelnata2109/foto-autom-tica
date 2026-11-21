-- Run only against a disposable database with the migrations applied.
begin;
do $$
declare
  photo_id uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  operator_id uuid := gen_random_uuid();
  proof text := repeat('a', 64);
  reservation jsonb;
  object_path text;
  stamp timestamptz := clock_timestamp() - interval '23 hours 59 minutes';
  expiration timestamptz;
  job uuid;
  claim record;
begin
  if has_table_privilege('anon', 'public.booth_photos', 'SELECT')
    or has_function_privilege('authenticated', 'public.booth_read_path(uuid,uuid,uuid,text)', 'EXECUTE') then
    raise exception 'Browser roles must not read photos or call the protected RPCs';
  end if;
  if (select public from storage.buckets where id = 'booth-photos') then
    raise exception 'Photo bucket is public';
  end if;
  update public.booth_cleanup_state set last_finished_at = null where singleton;
  if (public.booth_reserve_photo(photo_id, session_id, operator_id, proof, 'original', 640, 480, '24h-v1')->>'state') <> 'paused' then
    raise exception 'Uploading without recent cleanup must be denied';
  end if;

  job := public.booth_claim_sweep();
  if job is null or public.booth_claim_sweep() is not null then
    raise exception 'Cleanup lease not exclusive';
  end if;
  perform public.booth_finish_sweep(job, 0);
  reservation := public.booth_reserve_photo(photo_id, session_id, operator_id, proof, 'original', 640, 480, '24h-v1');
  object_path := reservation->>'path';
  if reservation->>'state' <> 'reserved'
     or (public.booth_reserve_photo(photo_id, session_id, operator_id, proof, 'original', 640, 480, '24h-v1')->>'state') <> 'unavailable'
     or exists (select 1 from public.booth_claim_deletions(photo_id)) then
    raise exception 'Reservation must prevent duplicate uploads and premature cleanup';
  end if;
  if public.booth_finish_photo(photo_id, (reservation->>'token')::uuid) is not null then
    raise exception 'Upload cannot finish without a Storage object';
  end if;
  insert into storage.objects (bucket_id, name, created_at) values ('booth-photos', object_path, stamp);
  expiration := public.booth_finish_photo(photo_id, (reservation->>'token')::uuid);
  if expiration is distinct from stamp + interval '24 hours'
     or public.booth_read_path(photo_id, session_id, operator_id, proof) is distinct from object_path
     or public.booth_read_path(photo_id, gen_random_uuid(), operator_id, proof) is not null
     or public.booth_request_delete(photo_id, session_id, gen_random_uuid(), proof) <> 'unavailable' then
    raise exception 'Clock, scope or delete authorization failed';
  end if;
  if public.booth_request_delete(photo_id, session_id, operator_id, proof) <> 'requested' then
    raise exception 'Manual delete request rejected';
  end if;
  if public.booth_read_path(photo_id, session_id, operator_id, proof) is not null then
    raise exception 'Manual delete must revoke before Storage deletion';
  end if;
  -- Reset the fixture to ready and cross the exact 24-hour boundary without sleeping.
  stamp := clock_timestamp() - interval '24 hours';
  update public.booth_photos set status = 'ready', uploaded_at = stamp, expires_at = stamp + interval '24 hours' where id = photo_id;
  if public.booth_read_path(photo_id, session_id, operator_id, proof) is not null then
    raise exception 'Expired object is still accessible';
  end if;
  select * into claim from public.booth_claim_deletions(photo_id);
  if claim.id is null or exists (select 1 from public.booth_claim_deletions(photo_id)) then
    raise exception 'Cleanup claim must be exclusive';
  end if;
  if not public.booth_ack_delete(photo_id, claim.token, false) then
    raise exception 'Failure could not be acknowledged';
  end if;
  if exists (select 1 from public.booth_claim_deletions(photo_id)) then
    raise exception 'Failed deletion should back off';
  end if;
  update public.booth_photos set retry_at = clock_timestamp() - interval '1 second' where id = photo_id;
  select * into claim from public.booth_claim_deletions(photo_id);
  if claim.id is null or not public.booth_ack_delete(photo_id, claim.token, true) then
    raise exception 'Failed deletion did not retry and acknowledge';
  end if;
  if exists (select 1 from public.booth_photos where id = photo_id) then
    raise exception 'Failed deletion did not retry and remove metadata';
  end if;
  -- The simulated Storage API has left the object behind. It must now be reconciled as an orphan.
  if not exists (select 1 from public.booth_orphan_paths() o where o.path = object_path) then
    raise exception 'Orphan not discoverable';
  end if;
end;
$$;
rollback;
