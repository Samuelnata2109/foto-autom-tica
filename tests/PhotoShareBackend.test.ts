import { describe, expect, it, vi } from 'vitest';
import { hashProof, photoHandler } from '../supabase/functions/_shared/photoHandler';
import type { Admin } from '../supabase/functions/_shared/storage';
import { createPhotoSecret } from '../src/services/privatePhotoStorage';
import { photoShareLink } from '../src/services/photoShareLink';

const secret = 'ab'.repeat(32);
const origin = 'https://cabine.example.test';
const expiresAt = '2026-11-22T12:00:00Z';
const ready = { state: 'ready', path: 'private.jpg', expires_at: expiresAt, remaining_ms: 2000 };
const scope = {
  'x-booth-photo': '6bc3c6a7-2281-4bb3-a1c0-bad6bd701148',
  'x-booth-session': 'de63e054-00f9-4d3d-bb6f-5552aad86774',
  'x-booth-proof': 'ba'.repeat(32),
};

function harness() {
  const rpc = vi.fn();
  const download = vi.fn().mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' }));
  const admin = { rpc, download, upload: vi.fn(), remove: vi.fn() } as Admin;
  const authorize = vi.fn(async (header: string | null) =>
    header === 'Bearer operator' ? 'operator-id' : null,
  );
  return { rpc, download, authorize, handle: photoHandler(admin, authorize, new Set([origin])) };
}

function request(action: string, body?: string, headers?: HeadersInit) {
  return new Request(`${origin}/photos`, {
    method: 'POST',
    body,
    headers: { origin, 'content-type': 'text/plain', 'x-booth-action': action, ...headers },
  });
}

describe('capacidades temporárias', () => {
  it('gera tokens aleatórios de 256 bits e URL HTTPS com token no fragmento', () => {
    const generated = Array.from({ length: 32 }, createPhotoSecret);
    expect(new Set(generated).size).toBe(32);
    expect(generated.every((value) => /^[a-f0-9]{64}$/.test(value))).toBe(true);
    const link = photoShareLink(secret, origin + '/projeto');
    expect(link).toBe(`${origin}/projeto/#/foto/${secret}`);
    for (const base of [
      'http://cabine.test',
      'https://localhost',
      'https://127.0.0.1',
      'https://10.0.0.1',
      origin + '?extra=1',
    ])
      expect(photoShareLink(secret, base)).toBeNull();
    expect(photoShareLink('short', origin)).toBeNull();
  });

  it('exige consentimento, autorização de operador e prova de sessão para emitir o link', async () => {
    const { handle, rpc } = harness();
    const operator = { ...scope, authorization: 'Bearer operator' };
    expect((await handle(request('share-create', secret, scope))).status).toBe(401);
    expect((await handle(request('share-create', secret, operator))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    const consent = { ...operator, 'x-booth-consent': 'qr-v1' };
    rpc.mockResolvedValueOnce(null).mockResolvedValueOnce(expiresAt);
    expect((await handle(request('share-create', secret, consent))).status).toBe(404);
    const response = await handle(request('share-create', secret, consent));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ expiresAt });
    expect(rpc).toHaveBeenLastCalledWith('booth_create_share', {
      p_id: scope['x-booth-photo'],
      p_session: scope['x-booth-session'],
      p_operator: 'operator-id',
      p_proof: await hashProof(scope['x-booth-proof']),
      p_hash: await hashProof(secret),
    });
  });

  it('entrega JPEG apenas após duas validações e aplica no-store', async () => {
    const { handle, rpc, download, authorize } = harness();
    rpc.mockResolvedValue(ready);
    const response = await handle(request('share-read', secret));
    expect(response.status).toBe(200);
    expect(authorize).not.toHaveBeenCalled();
    expect(download).toHaveBeenCalledExactlyOnceWith('private.jpg');
    expect(rpc.mock.calls.map((call) => call[1].p_consume)).toEqual([true, false]);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-booth-expires')).toBe(expiresAt);
    expect(await response.text()).toBe('jpeg');
  });

  it('recusa origem, corpo inválido, token desconhecido e acesso repetido após expiração', async () => {
    const { handle, rpc, download } = harness();
    expect(
      (await handle(request('share-read', secret, { origin: 'https://other.test' }))).status,
    ).toBe(403);
    for (const token of [undefined, 'x', secret + 'a', 'z'.repeat(64)])
      expect((await handle(request('share-read', token))).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValueOnce(null).mockResolvedValue({ ...ready, remaining_ms: 0 });
    for (let attempt = 0; attempt < 3; attempt++)
      expect((await handle(request('share-read', secret))).status).toBe(404);
    expect(download).not.toHaveBeenCalled();
  });

  it('bloqueia entrega após revogação ou exclusão durante a leitura e limita abuso', async () => {
    const { handle, rpc, download } = harness();
    rpc
      .mockResolvedValueOnce(ready)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ state: 'limited' });
    expect((await handle(request('share-read', secret))).status).toBe(404);
    expect((await handle(request('share-read', secret))).status).toBe(429);
    expect(download).toHaveBeenCalledTimes(1);
    expect((await handle(request('share-revoke', undefined, scope))).status).toBe(401);
    rpc.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const operator = { ...scope, authorization: 'Bearer operator' };
    expect((await handle(request('share-revoke', undefined, operator))).status).toBe(404);
    expect((await handle(request('share-revoke', undefined, operator))).status).toBe(204);
  });
});
