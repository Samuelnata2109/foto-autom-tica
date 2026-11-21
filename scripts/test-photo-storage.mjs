import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

const local = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }));
assert.equal(local.API_URL, 'http://127.0.0.1:54321', 'Use a fresh local Supabase instance.');
const service = local.SERVICE_ROLE_KEY;
const key = local.ANON_KEY;
assert(service && key);
const root = local.API_URL;
const staffHeaders = { apikey: service, Authorization: `Bearer ${service}` };
const api = (path, options = {}) =>
  globalThis.fetch(root + path, { ...options, signal: globalThis.AbortSignal.timeout(12000) });
const sql = (query) =>
  execFileSync(
    'docker',
    [
      'exec',
      'supabase_db_ai-photo-booth',
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      query,
    ],
    { encoding: 'utf8' },
  ).trim();
const json = { 'Content-Type': 'application/json' };
const password = randomBytes(24).toString('hex');
const email = `booth-${randomUUID()}@example.invalid`;
const created = await api('/auth/v1/admin/users', {
  method: 'POST',
  headers: { ...staffHeaders, ...json },
  body: JSON.stringify({ email, password, email_confirm: true }),
});
assert.equal(created.status, 200);
const { id: operator } = await created.json();
assert.match(operator, /^[\da-f-]{36}$/);
const login = await api('/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: { apikey: key, ...json },
  body: JSON.stringify({ email, password }),
});
assert.equal(login.status, 200);
const { access_token: jwt } = await login.json();
const cronToken = randomBytes(32).toString('hex');
const temporary = mkdtempSync(join(tmpdir(), 'booth-storage-test-'));
const envFile = join(temporary, 'edge.env');
writeFileSync(
  envFile,
  `BOOTH_OPERATOR_IDS=${operator}\nBOOTH_CLEANUP_TOKEN=${cronToken}\nBOOTH_ALLOWED_ORIGINS=http://localhost:5173\n`,
);
const functions = spawn('supabase', ['functions', 'serve', '--env-file', envFile], {
  stdio: 'ignore',
});
let spawnError;
functions.on('error', (error) => {
  spawnError = error;
});
const jpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD8q3dpGLMSzE5JJySaKKK68X/vFT/E/wAyY7I//9k=',
  'base64',
);
function scope() {
  return {
    'X-Booth-Photo': randomUUID(),
    'X-Booth-Session': randomUUID(),
    'X-Booth-Proof': randomBytes(32).toString('hex'),
  };
}
const send = (action, session, override = {}) =>
  api('/functions/v1/booth-photos', {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${jwt}`,
      'X-Booth-Action': action,
      ...session,
      'X-Booth-Consent': '24h-v1',
      'X-Booth-Scenario': 'original',
      'Content-Type': 'image/jpeg',
      ...override,
    },
    body: action === 'upload' ? jpeg : undefined,
  });
async function waitFor(predicate, failure, seconds = 120) {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    if (spawnError) throw Error('Could not start local Edge Runtime');
    if (await predicate()) return;
    await setTimeout(2000);
  }
  throw Error(failure);
}
const job = "(select jobid from cron.job where jobname = 'booth-photo-cleanup')";
const object = '/storage/v1/object/booth-photos/';
const storedPath = (session) =>
  sql(`select storage_path from public.booth_photos where id = '${session['X-Booth-Photo']}'`);
try {
  await waitFor(
    async () => (await send('operator', {})).status === 204,
    'Edge Functions unavailable',
  );
  assert.equal((await api('/functions/v1/booth-cleanup', { method: 'POST' })).status, 401);
  assert.equal(
    sql("select schedule from cron.job where jobname = 'booth-photo-cleanup' and active"),
    '*/5 * * * *',
  );
  sql(`select vault.create_secret('http://supabase_kong_ai-photo-booth:8000', 'booth_project_url');
    select vault.create_secret('${cronToken}', 'booth_cleanup_token');
    select cron.alter_job(${job}, schedule := '* * * * *');`);
  await waitFor(
    () =>
      sql(
        'select (last_finished_at is not null and last_failed_count = 0)::int from public.booth_cleanup_state',
      ) === '1',
    'Scheduled cron did not reach a successful Edge cleanup',
  );
  sql(`select cron.alter_job(${job}, active := false)`);
  const a = scope();
  assert.equal((await send('upload', a, { 'X-Booth-Consent': '' })).status, 400);
  assert.equal((await send('upload', a, { Authorization: '' })).status, 401);
  assert.equal((await send('upload', a)).status, 201);
  const duplicate = await send('upload', a);
  assert.equal(duplicate.status, 200);
  const id = a['X-Booth-Photo'];
  const path = storedPath(a);
  assert(path);
  assert.equal(
    sql(
      `select (expires_at = uploaded_at + interval '24 hours')::int from public.booth_photos where id = '${id}'`,
    ),
    '1',
  );
  const allowed = await send('read', a);
  assert.equal(allowed.status, 200);
  assert.match(allowed.headers.get('cache-control'), /no-store/);
  assert.equal((await send('read', { ...a, 'X-Booth-Proof': 'a'.repeat(64) })).status, 404);
  assert.equal(
    (
      await api('/storage/v1/object/authenticated/booth-photos/' + path, {
        headers: { apikey: key, Authorization: `Bearer ${jwt}` },
      })
    ).ok,
    false,
  );
  assert.equal((await api('/storage/v1/object/public/booth-photos/' + path)).ok, false);
  assert.equal((await send('delete', { ...a, 'X-Booth-Session': randomUUID() })).status, 404);
  assert.equal((await send('read', a)).status, 200);

  const b = scope();
  assert.equal((await send('upload', b)).status, 201);
  const bPath = storedPath(b);
  assert.equal((await send('delete', b)).status, 204);
  assert.equal((await send('delete', b)).status, 204);
  assert.equal(storedPath(b), '');
  assert.equal((await api(object + bPath, { headers: staffHeaders })).ok, false);

  const orphan = randomUUID() + '.jpg';
  assert.equal(
    (
      await api(object + orphan, {
        method: 'POST',
        headers: { ...staffHeaders, 'Content-Type': 'image/jpeg' },
        body: jpeg,
      })
    ).ok,
    true,
  );
  sql(`with stamp as (select clock_timestamp() - interval '24 hours' as value)
    update public.booth_photos set uploaded_at = stamp.value, expires_at = stamp.value + interval '24 hours'
      from stamp where id = '${id}';
    update storage.objects set created_at = clock_timestamp() - interval '6 minutes'
      where bucket_id = 'booth-photos' and name = '${orphan}';`);
  assert.equal((await send('read', a)).status, 404);
  assert.equal((await api(object + path, { headers: staffHeaders })).ok, true);
  const lease = sql('select public.booth_claim_sweep()');
  assert(lease);
  const concurrent = await api('/functions/v1/booth-cleanup', {
    method: 'POST',
    headers: { 'X-Booth-Cleanup': cronToken },
  });
  assert.equal((await concurrent.json()).busy, true);
  sql(
    `select public.booth_finish_sweep('${lease}', 0); select cron.alter_job(${job}, active := true)`,
  );
  await waitFor(
    () =>
      !storedPath(a) &&
      sql(
        `select count(*) from storage.objects where bucket_id = 'booth-photos' and name in ('${path}', '${orphan}')`,
      ) === '0',
    'Scheduled job did not remove metadata and objects',
  );
  for (const removed of [path, orphan]) {
    assert.equal((await api(object + removed, { headers: staffHeaders })).ok, false);
  }
  globalThis.console.log(
    'Local Supabase: consent, authentication, expiry, manual deletion, scheduled deletion and orphan reconciliation passed.',
  );
} finally {
  try {
    sql(`select cron.alter_job(${job}, schedule := '*/5 * * * *', active := true);
      delete from vault.secrets where name in ('booth_project_url', 'booth_cleanup_token');`);
  } finally {
    functions.kill();
    unlinkSync(envFile);
    rmdirSync(temporary);
  }
}
