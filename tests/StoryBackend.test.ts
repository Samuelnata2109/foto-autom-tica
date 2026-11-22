import { expect, it, vi } from 'vitest';
import { hashProof, photoHandler } from '../supabase/functions/_shared/photoHandler';
import type { Admin } from '../supabase/functions/_shared/storage';

const secret = 'ab'.repeat(32);
const id = '26885be0-317a-4cdc-b987-ac402bd88d17';
const origin = 'https://booth.example.test';
const operator = { Authorization: 'Bearer equipe' };
const consent = { 'X-Booth-Consent': 'official-stories-v1' };

function request(action: string, headers: Record<string, string> = {}, body?: string) {
  return new Request(origin, {
    method: 'POST',
    headers: { origin, 'Content-Type': 'text/plain', 'X-Booth-Action': action, ...headers },
    body,
  });
}

function harness() {
  const rpc = vi.fn();
  const download = vi.fn().mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' }));
  const admin = { rpc, download, remove: vi.fn(), upload: vi.fn() } as Admin;
  const authorize = vi.fn(async (header: string | null) =>
    header === 'Bearer equipe' ? id : null,
  );
  return { handle: photoHandler(admin, authorize, new Set([origin])), rpc, download, authorize };
}

it('exige consentimento específico e token válido para enviar, sem receber ID ou bytes da foto', async () => {
  const { handle, rpc, authorize } = harness();
  expect((await handle(request('story-create', {}, secret))).status).toBe(400);
  expect(
    (await handle(request('story-create', { 'X-Booth-Consent': 'qr-v1' }, secret))).status,
  ).toBe(400);
  expect((await handle(request('story-create', consent, id))).status).toBe(404);
  expect(rpc).not.toHaveBeenCalled();
  rpc.mockResolvedValueOnce('created').mockResolvedValueOnce('exists');
  const created = await handle(request('story-create', consent, secret));
  expect(created.status).toBe(201);
  expect(await created.json()).toEqual({ duplicate: false });
  const duplicate = await handle(request('story-create', consent, secret));
  expect(duplicate.status).toBe(200);
  expect(await duplicate.json()).toEqual({ duplicate: true });
  expect(authorize).not.toHaveBeenCalled();
  expect(rpc).toHaveBeenCalledWith('booth_create_story', {
    p_hash: await hashProof(secret),
    p_consent: 'official-stories-v1',
  });
});

it('bloqueia solicitações com link expirado ou revogado e limita tentativas', async () => {
  const { handle, rpc } = harness();
  rpc.mockResolvedValueOnce('unavailable').mockResolvedValueOnce('limited');
  expect((await handle(request('story-create', consent, secret))).status).toBe(404);
  const response = await handle(request('story-create', consent, secret));
  expect(response.status).toBe(429);
  expect(response.headers.get('Retry-After')).toBe('60');
});

it('bloqueia listagem, leitura e alteração sem operador autorizado', async () => {
  const { handle, rpc, download } = harness();
  for (const action of ['story-list', 'story-read', 'story-update']) {
    expect(
      (
        await handle(
          request(
            action,
            {
              ...consent,
              'X-Booth-Story': id,
              Authorization: 'Bearer visitante',
              'X-Booth-Decision': 'approve',
              'X-Booth-Offset': '0',
            },
            secret,
          ),
        )
      ).status,
    ).toBe(401);
  }
  expect(rpc).not.toHaveBeenCalled();
  expect(download).not.toHaveBeenCalled();
});

it.each(['approve', 'reject', 'publish'])(
  'repassa %s com a identidade verificada do operador',
  async (decision) => {
    const { handle, rpc } = harness();
    rpc.mockResolvedValueOnce(true).mockResolvedValueOnce('updated');
    const response = await handle(
      request('story-update', {
        ...operator,
        'X-Booth-Story': id,
        'X-Booth-Decision': decision,
      }),
    );
    expect(response.status).toBe(204);
    expect(rpc).toHaveBeenNthCalledWith(1, 'booth_story_operator_limit', { p_operator: id });
    expect(rpc).toHaveBeenLastCalledWith('booth_update_story', {
      p_id: id,
      p_operator: id,
      p_decision: decision,
    });
  },
);

it('limita operadores, pagina a fila e trata indisponibilidade e conflito de estado', async () => {
  const { handle, rpc } = harness();
  rpc.mockResolvedValueOnce(false).mockResolvedValueOnce(true).mockResolvedValueOnce([]);
  const list = request('story-list', { ...operator, 'X-Booth-Offset': '25' });
  expect((await handle(list)).status).toBe(429);
  expect(await (await handle(list)).json()).toEqual([]);
  expect(rpc).toHaveBeenLastCalledWith('booth_list_stories', { p_offset: 25 });
  rpc
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce('unavailable')
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce('conflict');
  const update = request('story-update', {
    ...operator,
    'X-Booth-Story': id,
    'X-Booth-Decision': 'publish',
  });
  expect((await handle(update)).status).toBe(404);
  expect((await handle(update)).status).toBe(409);
});

it('consulta a autorização de download antes e depois do Storage e entrega sem cache', async () => {
  const { handle, rpc, download } = harness();
  const available = {
    state: 'ready',
    path: 'private.jpg',
    expires_at: '2026-11-23T00:00:00Z',
    remaining_ms: 1000,
  };
  const read = request('story-read', {
    ...operator,
    'X-Booth-Story': id,
    'X-Booth-Purpose': 'download',
  });
  rpc.mockResolvedValueOnce(true).mockResolvedValueOnce(null);
  expect((await handle(read)).status).toBe(404);
  expect(download).not.toHaveBeenCalled();
  rpc.mockResolvedValueOnce(true).mockResolvedValueOnce(available).mockResolvedValueOnce(null);
  expect((await handle(read)).status).toBe(404);
  rpc.mockResolvedValueOnce(true).mockResolvedValueOnce(available).mockResolvedValueOnce(available);
  const response = await handle(read);
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  expect(await response.text()).toBe('jpeg');
  expect(rpc).toHaveBeenLastCalledWith('booth_story_photo', { p_id: id, p_download: true });
});
