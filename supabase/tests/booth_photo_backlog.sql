-- Run only against a disposable database with the migrations applied.
begin;
do $$
declare
  fixture_count integer;
  remaining integer;
  batch_size integer;
  removed integer;
  job uuid;
  candidate record;
  pending public.booth_photos%rowtype;
  snapshot jsonb;
  stamp timestamptz := statement_timestamp();
  fixture_session uuid := gen_random_uuid();
  fixture_operator uuid := gen_random_uuid();
  proof text := repeat('b', 64);
begin
  assert not has_function_privilege('anon', 'public.booth_expired_photo_backlog()', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'public.booth_expired_photo_backlog()', 'EXECUTE');
  assert has_function_privilege('service_role', 'public.booth_expired_photo_backlog()', 'EXECUTE');

  with fresh_photo as (
    insert into public.booth_photos
      (id, session_id, operator_id, proof_hash, uploaded_at, expires_at, status, scenario_id, width, height, consent_version)
    values
      (gen_random_uuid(), fixture_session, fixture_operator, proof, stamp - interval '1 hour',
        stamp + interval '23 hours', 'ready', 'original', 640, 480, '24h-v1')
    returning storage_path, uploaded_at
  )
  insert into storage.objects (bucket_id, name, created_at)
  select 'booth-photos', storage_path, uploaded_at from fresh_photo;

  foreach fixture_count in array array[41, 80, 100] loop
    with fixtures as (
      insert into public.booth_photos
        (id, session_id, operator_id, proof_hash, uploaded_at, expires_at, status, scenario_id, width, height, consent_version)
      select gen_random_uuid(), fixture_session, fixture_operator, proof,
        stamp - interval '24 hours' - n * interval '1 second',
        stamp - n * interval '1 second', 'ready', 'original', 640, 480, '24h-v1'
      from generate_series(1, fixture_count) as series(n)
      returning storage_path, uploaded_at
    )
    insert into storage.objects (bucket_id, name, created_at)
    select 'booth-photos', storage_path, uploaded_at from fixtures;

    remaining := fixture_count;
    snapshot := public.booth_expired_photo_backlog();
    assert snapshot = jsonb_build_object('count', fixture_count, 'oldestOverdueSeconds', fixture_count);

    for cycle in 1..((fixture_count + 39) / 40) loop
      job := public.booth_claim_sweep();
      assert job is not null and public.booth_claim_sweep() is null, 'Sweep lease must be exclusive';
      removed := 0;
      batch_size := least(40, remaining);
      for candidate in select * from public.booth_claim_deletions() loop
        -- Simulate a successful Storage API removal before acknowledging the claim.
        delete from storage.objects where bucket_id = 'booth-photos' and name = candidate.path;
        assert found, 'Claim must reference a fixture object';
        assert public.booth_ack_delete(candidate.id, candidate.token, true), 'Deletion must be acknowledged';
        removed := removed + 1;
      end loop;
      assert removed = batch_size, format('Unexpected batch size for %s photos, cycle %s', fixture_count, cycle);
      perform public.booth_finish_sweep(job, 0);
      assert (select last_failed_count = 0 from public.booth_cleanup_state where singleton);

      remaining := remaining - removed;
      assert (select count(*) from storage.objects where bucket_id = 'booth-photos') = remaining + 1;
      snapshot := public.booth_expired_photo_backlog();
      assert (snapshot->>'count')::integer = remaining;

      if remaining > 0 then
        assert (snapshot->>'oldestOverdueSeconds')::integer = remaining;
        select * into strict pending
        from public.booth_photos
        where session_id = fixture_session and expires_at <= stamp
        limit 1;
        assert exists (select 1 from storage.objects where bucket_id = 'booth-photos' and name = pending.storage_path);
        assert public.booth_read_path(pending.id, fixture_session, fixture_operator, proof) is null,
          'Expired photo with an object still pending deletion must be inaccessible';
      else
        assert snapshot = '{"count": 0, "oldestOverdueSeconds": null}'::jsonb;
      end if;
    end loop;
    assert remaining = 0;
  end loop;
end;
$$;
set local role service_role;
do $$
begin
  assert public.booth_expired_photo_backlog() = '{"count": 0, "oldestOverdueSeconds": null}'::jsonb;
end;
$$;
rollback;
