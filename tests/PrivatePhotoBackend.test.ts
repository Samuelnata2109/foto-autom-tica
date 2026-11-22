import { afterEach, expect, it, vi } from 'vitest';
import { maximumPhotoBytes, jpegDimensions } from '../supabase/functions/_shared/jpeg';
import { photoHandler } from '../supabase/functions/_shared/photoHandler';
import { sweepPhotos } from '../supabase/functions/_shared/cleanup';
import type { Admin } from '../supabase/functions/_shared/storage';

const jpeg = new Uint8Array([
  255, 216, 255, 192, 0, 11, 8, 1, 224, 2, 128, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 18,
  255, 217,
]);
const id = 'a126d048-53fa-41a7-a9f4-05ca6fd80d08';
const session = '333fe26a-51a3-424f-963a-95891e0f3d50';
const secret = 'd'.repeat(64);
const token = 'Bearer operator';

function backend() {
  const admin = {
    rpc: vi.fn(),
    upload: vi.fn().mockResolvedValue(true),
    download: vi.fn().mockResolvedValue(new Blob([jpeg], { type: 'image/jpeg' })),
    remove: vi.fn().mockResolvedValue(true),
  };
  const typed = admin as unknown as Admin;
  const handle = photoHandler(
    typed,
    async (authorization) => (authorization === token ? 'operator-id' : null),
    new Set(['https://booth.test']),
  );
  return { admin, typed, handle };
}

function request(action: string, overrides: Record<string, string> = {}) {
  return new Request('https://example.test', {
    method: 'POST',
    headers: {
      origin: 'https://booth.test',
      authorization: token,
      'x-booth-action': action,
      'x-booth-photo': id,
      'x-booth-session': session,
      'x-booth-proof': secret,
      'x-booth-consent': '24h-v1',
      'x-booth-scenario': 'robotics',
      'content-type': 'image/jpeg',
      ...overrides,
    },
    body: action === 'upload' ? jpeg : undefined,
  });
}

afterEach(() => vi.useRealTimers());

it('rejeita chamada sem equipe, sem consentimento ou de origem não habilitada', async () => {
  const { handle, admin } = backend();
  expect((await handle(request('upload', { authorization: 'Bearer public' }))).status).toBe(401);
  expect((await handle(request('upload', { 'x-booth-consent': '' }))).status).toBe(400);
  expect((await handle(request('upload', { origin: 'https://other.test' }))).status).toBe(403);
  expect(admin.rpc).not.toHaveBeenCalled();
  expect(admin.upload).not.toHaveBeenCalled();
});

it('valida MIME, tamanho e cabeçalhos JPEG no servidor', async () => {
  const { handle, admin } = backend();
  expect((await handle(request('upload', { 'content-type': 'image/png' }))).status).toBe(415);
  expect(
    (await handle(request('upload', { 'content-length': String(maximumPhotoBytes + 1) }))).status,
  ).toBe(413);
  expect(jpegDimensions(jpeg)).toEqual({ width: 640, height: 480 });
  expect(jpegDimensions(jpeg.subarray(0, -2))).toBeNull();
  expect(admin.rpc).not.toHaveBeenCalled();
});

it('envia o JPEG uma vez, usa o prazo devolvido pelo banco e repete com o mesmo recibo', async () => {
  const { handle, admin } = backend();
  const expiresAt = '2026-11-21T15:00:00Z';
  admin.rpc
    .mockResolvedValueOnce({ state: 'reserved', path: 'random.jpg', token: 'lease' })
    .mockResolvedValueOnce(expiresAt)
    .mockResolvedValueOnce({ state: 'ready', expires_at: expiresAt });
  const first = await handle(request('upload', { 'x-expires-at': '2099-01-01' }));
  const duplicate = await handle(request('upload'));
  expect([first.status, duplicate.status]).toEqual([201, 200]);
  expect(await first.json()).toEqual({ expiresAt });
  expect(await duplicate.json()).toEqual({ expiresAt });
  expect(admin.upload).toHaveBeenCalledExactlyOnceWith('random.jpg', jpeg);
  expect(admin.rpc).toHaveBeenNthCalledWith(1, 'booth_reserve_photo', {
    p_id: id,
    p_session: session,
    p_operator: 'operator-id',
    p_proof: expect.stringMatching(/^[a-f0-9]{64}$/),
    p_scenario: 'robotics',
    p_width: 640,
    p_height: 480,
    p_consent: '24h-v1',
  });
  expect(admin.rpc).toHaveBeenNthCalledWith(2, 'booth_finish_photo', {
    p_id: id,
    p_token: 'lease',
  });
});

it('preserva a reserva para recuperação quando o upload falha ou a limpeza está inativa', async () => {
  const { handle, admin } = backend();
  admin.rpc
    .mockResolvedValueOnce({ state: 'paused' })
    .mockResolvedValueOnce({ state: 'reserved', path: 'random.jpg', token: 'lease' });
  admin.upload.mockRejectedValueOnce(new Error('offline'));
  expect((await handle(request('upload'))).status).toBe(503);
  expect((await handle(request('upload'))).status).toBe(503);
  expect(admin.rpc.mock.calls.map(([name]) => name)).toEqual([
    'booth_reserve_photo',
    'booth_reserve_photo',
  ]);
  expect(admin.upload).toHaveBeenCalledOnce();
});

it('nega entrega a outra sessão e na hora exata de expiração, mesmo com o arquivo presente', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const { handle, admin } = backend();
  const startedAt = Date.parse('2026-11-20T15:00:00Z');
  vi.setSystemTime(startedAt);
  const expires = startedAt + 24 * 60 * 60 * 1000;
  admin.rpc.mockImplementation(async (name, scope) =>
    name === 'booth_read_path' && scope.p_session === session && Date.now() < expires
      ? 'image.jpg'
      : null,
  );
  const allowed = await handle(request('read'));
  expect(allowed.status).toBe(200);
  expect(allowed.headers.get('cache-control')).toContain('no-store');
  const wrong = '637d2428-425a-4af0-a331-c7825da763e9';
  expect((await handle(request('read', { 'x-booth-session': wrong }))).status).toBe(404);
  vi.setSystemTime(expires - 1);
  admin.download.mockImplementationOnce(async () => {
    vi.setSystemTime(expires);
    return new Blob([jpeg]);
  });
  expect((await handle(request('read'))).status).toBe(404);
  expect((await handle(request('read'))).status).toBe(404);
  expect(admin.download).toHaveBeenCalledTimes(2);
});

it('revoga antes de remover e repete exclusão sem tocar em outras sessões', async () => {
  const { handle, admin } = backend();
  const row = { id, path: 'photo.jpg', token: 'claim' };
  admin.rpc
    .mockResolvedValueOnce('requested')
    .mockResolvedValueOnce([row])
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce('unavailable')
    .mockResolvedValueOnce('gone');
  expect((await handle(request('delete'))).status).toBe(204);
  expect(admin.rpc.mock.calls.map(([name]) => name)).toEqual([
    'booth_request_delete',
    'booth_claim_deletions',
    'booth_ack_delete',
  ]);
  expect(admin.rpc).toHaveBeenNthCalledWith(3, 'booth_ack_delete', {
    p_id: id,
    p_token: 'claim',
    p_removed: true,
  });
  expect((await handle(request('delete', { 'x-booth-proof': 'a'.repeat(64) }))).status).toBe(404);
  expect((await handle(request('delete'))).status).toBe(204);
  expect(admin.remove).toHaveBeenCalledExactlyOnceWith('photo.jpg');
});

it('limpeza trata órfãos, respeita lease concorrente e deixa falhas para a próxima varredura', async () => {
  const { admin, typed } = backend();
  admin.rpc.mockResolvedValueOnce(null);
  await expect(sweepPhotos(typed)).resolves.toEqual({
    busy: true,
    removed: 0,
    failed: 0,
    completedWithoutErrors: false,
    expiredBacklog: null,
    expiredQueueDrained: null,
  });
  expect(admin.rpc).toHaveBeenCalledTimes(1);
  expect(admin.remove).not.toHaveBeenCalled();
  const row = { id, path: 'photo.jpg', token: 'claim' };
  admin.rpc.mockImplementation(
    async (name) =>
      ({
        booth_claim_sweep: 'sweep',
        booth_claim_deletions: [row],
        booth_ack_delete: true,
        booth_orphan_paths: [{ path: 'orphan.jpg' }],
      })[name as 'booth_claim_sweep'],
  );
  admin.remove.mockRejectedValueOnce(new Error('storage offline'));
  await expect(sweepPhotos(typed)).resolves.toMatchObject({
    busy: false,
    removed: 1,
    failed: 1,
    completedWithoutErrors: false,
  });
  expect(admin.rpc).toHaveBeenCalledWith('booth_ack_delete', {
    p_id: id,
    p_token: 'claim',
    p_removed: false,
  });
  expect(admin.remove).toHaveBeenCalledWith('orphan.jpg');
  await expect(sweepPhotos(typed)).resolves.toMatchObject({
    busy: false,
    removed: 2,
    failed: 0,
    completedWithoutErrors: true,
  });
  expect(admin.rpc).toHaveBeenCalledWith('booth_ack_delete', {
    p_id: id,
    p_token: 'claim',
    p_removed: true,
  });
});

it.each([
  { backlog: { count: 1, oldestOverdueSeconds: 120 }, drained: false },
  { backlog: { count: 0, oldestOverdueSeconds: null }, drained: true },
  { backlog: null, drained: null },
])('distingue limpeza sem erros do estado da fila ($drained)', async ({ backlog, drained }) => {
  const { admin, typed } = backend();
  admin.rpc
    .mockResolvedValueOnce('sweep')
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce(true);
  if (backlog) admin.rpc.mockResolvedValueOnce(backlog);
  else admin.rpc.mockRejectedValueOnce(new Error('metrics offline'));

  await expect(sweepPhotos(typed)).resolves.toEqual({
    busy: false,
    removed: 0,
    failed: 0,
    completedWithoutErrors: true,
    expiredBacklog: backlog,
    expiredQueueDrained: drained,
  });
  expect(admin.rpc).toHaveBeenNthCalledWith(4, 'booth_finish_sweep', {
    p_token: 'sweep',
    p_failures: 0,
  });
  expect(admin.rpc).toHaveBeenNthCalledWith(5, 'booth_expired_photo_backlog');
});
