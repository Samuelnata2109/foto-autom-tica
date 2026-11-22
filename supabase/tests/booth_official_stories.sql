begin;

do $$
declare
  photos uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  stories uuid[];
  booth_session uuid := gen_random_uuid();
  operator_id_value uuid := gen_random_uuid();
  reviewer uuid := gen_random_uuid();
  publisher uuid := gen_random_uuid();
  proof text := repeat('a', 64);
  hashes text[] := array[repeat('b',64), repeat('c',64), repeat('d',64)];
  uploaded timestamptz := clock_timestamp();
  deadline timestamptz := uploaded + interval '24 hours';
  expired_time timestamptz := uploaded - interval '25 hours';
  consent text := 'official-stories-v1';
begin
  assert not has_table_privilege('anon', 'public.booth_story_requests', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.booth_story_availability', 'SELECT');
  assert not has_function_privilege('anon', 'public.booth_create_story(text,text)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'public.booth_update_story(uuid,uuid,text)', 'EXECUTE');
  assert has_function_privilege('service_role', 'public.booth_list_stories(integer)', 'EXECUTE');

  for i in 1..3 loop
    insert into public.booth_photos (id, session_id, operator_id, proof_hash, uploaded_at, expires_at,
      status, scenario_id, width, height, consent_version)
    values (photos[i], booth_session, operator_id_value, proof, uploaded, deadline,
      'ready', 'original', 640, 480, '24h-v1');
    assert public.booth_create_share(photos[i], booth_session, operator_id_value, proof, hashes[i]) = deadline;
    assert public.booth_create_story(hashes[i], 'qr-v1') = 'consent';
    assert public.booth_create_story(hashes[i], null) = 'consent';
    assert public.booth_create_story(hashes[i], consent) = 'created';
    assert public.booth_create_story(hashes[i], consent) = 'exists';
  end loop;
  select array_agg(r.id order by p.ordinality) into stories
    from unnest(photos) with ordinality p(id, ordinality)
    join public.booth_story_requests r on r.photo_id = p.id;
  assert cardinality(stories) = 3;
  assert public.booth_create_story(repeat('e',64), consent) = 'unavailable';
  assert (select expires_at from public.booth_photos where id = photos[1]) = deadline;
  assert (select consent_version from public.booth_story_requests where id = stories[1]) = consent;
  assert (select forget_at from public.booth_story_requests where id = stories[1]) = deadline + interval '24 hours';
  assert jsonb_array_length(public.booth_list_stories(0)) = 3;
  assert jsonb_array_length(public.booth_list_stories(2)) = 1;

  assert public.booth_story_photo(stories[1], false)->>'state' = 'ready';
  assert public.booth_story_photo(stories[1], true) is null;
  assert public.booth_update_story(stories[1], null, 'approve') = 'conflict';
  assert public.booth_update_story(stories[1], publisher, 'publish') = 'conflict';
  assert public.booth_update_story(stories[1], reviewer, 'approve') = 'updated';
  assert public.booth_story_photo(stories[1], true)->>'state' = 'ready';
  assert public.booth_update_story(stories[1], publisher, 'publish') = 'updated';
  assert public.booth_story_photo(stories[1], true) is null;
  assert public.booth_update_story(stories[1], publisher, 'publish') = 'conflict';
  assert (select reviewed_by = reviewer and published_by = publisher and published_at >= reviewed_at
    from public.booth_story_requests where id = stories[1]);

  assert public.booth_update_story(stories[2], reviewer, 'reject') = 'updated';
  assert public.booth_update_story(stories[2], reviewer, 'approve') = 'conflict';
  assert public.booth_update_story(stories[2], publisher, 'publish') = 'conflict';
  assert (select reviewed_by = reviewer and status = 'rejected'
    from public.booth_story_requests where id = stories[2]);

  assert public.booth_update_story(stories[3], reviewer, 'approve') = 'updated';
  update public.booth_photos set uploaded_at = expired_time, expires_at = expired_time + interval '24 hours'
    where id = photos[3];
  assert public.booth_create_story(hashes[3], consent) = 'unavailable';
  assert public.booth_story_photo(stories[3], true) is null;
  assert public.booth_update_story(stories[3], publisher, 'publish') = 'unavailable';
  assert exists (select 1 from jsonb_array_elements(public.booth_list_stories(0)) item
    where item->>'id' = stories[3]::text and item->>'status' = 'unavailable');

  assert public.booth_create_share(photos[2], booth_session, operator_id_value, proof, repeat('f',64)) = deadline;
  assert public.booth_story_photo(stories[2], false) is null;
  assert public.booth_create_story(hashes[2], consent) = 'unavailable';
  assert public.booth_create_story(repeat('f',64), consent) = 'exists';
  assert public.booth_revoke_share(photos[1], booth_session, operator_id_value, proof);
  assert public.booth_story_photo(stories[1], false) is null;
  assert public.booth_request_delete(photos[2], booth_session, operator_id_value, proof) = 'requested';
  delete from public.booth_photos where id = photos[2];
  assert (select photo_id is null and share_hash is null from public.booth_story_requests where id = stories[2]);

  for i in 1..30 loop
    assert public.booth_story_operator_limit(reviewer);
  end loop;
  assert not public.booth_story_operator_limit(reviewer);
  assert public.booth_story_operator_limit(publisher);
  update public.booth_story_operator_limits set window_start = clock_timestamp() - interval '1 minute'
    where operator_id = reviewer;
  assert public.booth_story_operator_limit(reviewer);
end;
$$;

rollback;
