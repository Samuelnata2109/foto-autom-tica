// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PhotoStorageConsent } from '../src/components/PhotoStorageConsent';
import * as storage from '../src/services/privatePhotoStorage';

const original = { blob: new Blob(['photo'], { type: 'image/jpeg' }), width: 640, height: 480 };
const photo = { ...original, original, url: 'blob:approved', frame: 'applied' } as const;
let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubEnv('VITE_PHOTO_SHARE_BASE_URL', 'https://cabine.example.test/foto-autom-tica/');
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  root = createRoot(host);
  vi.spyOn(storage, 'storeConfirmedPhoto').mockResolvedValue('2026-11-21T15:00:00Z');
  vi.spyOn(storage, 'deleteStoredPhoto').mockResolvedValue(true);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const open = (token: string | null = 'operator') =>
  act(async () =>
    root.render(<PhotoStorageConsent photo={photo} token={token} onNewSession={vi.fn()} />),
  );
const click = (text: string) =>
  act(async () => {
    const button = [...host.querySelectorAll('button')].find((item) => item.textContent === text);
    if (!button) throw new Error('Button missing');
    button.click();
  });

it('confirmar visualmente e recusar o armazenamento jamais enviam a foto', async () => {
  await open();
  expect(storage.storeConfirmedPhoto).not.toHaveBeenCalled();
  await click('Continuar sem armazenar');
  expect(host.textContent).toContain('sessão local');
  expect(storage.storeConfirmedPhoto).not.toHaveBeenCalled();
});

it('gera QR apenas após consentimento separado e permite revogação', async () => {
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  const create = vi.spyOn(storage, 'shareStoredPhoto').mockResolvedValue(expiresAt);
  const revoke = vi.spyOn(storage, 'revokePhotoShare').mockResolvedValue(undefined);
  await open();
  expect(host.textContent).not.toContain('Autorizar compartilhamento');
  await click('Autorizar e armazenar');
  expect(host.textContent).toContain('Foto armazenada');
  expect(host.querySelector<HTMLButtonElement>('.photo-share button')?.disabled).toBe(false);
  expect(create).not.toHaveBeenCalled();
  expect(host.querySelector('svg title')).toBeNull();
  await click('Autorizar compartilhamento e gerar QR Code');
  expect(create).toHaveBeenCalledExactlyOnceWith(
    'operator',
    expect.objectContaining({ proof: expect.any(String) }),
    expect.stringMatching(/^[a-f0-9]{64}$/),
    expect.any(AbortSignal),
  );
  expect(host.querySelector('svg title')?.textContent).toBe('QR Code da fotografia');
  await click('Copiar link');
  expect(host.querySelector<HTMLInputElement>('.photo-share input')?.value).toBe(
    `https://cabine.example.test/foto-autom-tica/#/foto/${create.mock.calls[0]?.[2]}`,
  );
  await click('Revogar link');
  expect(revoke).toHaveBeenCalledOnce();
  expect(host.textContent).toContain('Compartilhamento revogado');
  expect(host.querySelector('svg title')).toBeNull();
});

it.each(['', 'http://localhost:5173/'])(
  'explica por que o QR está indisponível após armazenar com URL %j',
  async (base) => {
    vi.stubEnv('VITE_PHOTO_SHARE_BASE_URL', base);
    const create = vi
      .spyOn(storage, 'shareStoredPhoto')
      .mockResolvedValue(new Date(Date.now() + 60_000).toISOString());
    await open();
    expect(host.querySelector('.photo-share')).toBeNull();
    await click('Autorizar e armazenar');
    expect(host.textContent).toContain('Foto armazenada');
    expect(host.querySelector('.photo-share [role="status"]')?.textContent).toContain(
      'falta configurar um endereço público',
    );
    expect(host.querySelector<HTMLButtonElement>('.photo-share button')?.disabled).toBe(true);
    await click('Autorizar compartilhamento e gerar QR Code');
    expect(create).not.toHaveBeenCalled();
  },
);

it('exige login da equipe e decisão explícita para enviar e excluir', async () => {
  await open(null);
  await click('Autorizar e armazenar');
  expect(storage.storeConfirmedPhoto).not.toHaveBeenCalled();
  await open();
  await click('Autorizar e armazenar');
  expect(host.textContent).toContain('Foto armazenada');
  const scope = vi.mocked(storage.storeConfirmedPhoto).mock.calls[0]?.[1];
  expect(scope?.proof).toHaveLength(64);
  await click('Excluir cópia armazenada');
  expect(storage.deleteStoredPhoto).toHaveBeenCalledExactlyOnceWith(
    'operator',
    scope,
    expect.any(AbortSignal),
  );
  expect(host.textContent).toContain('foi excluída');
});

it('permite continuar após falha de rede e reaproveita a prova na nova tentativa', async () => {
  vi.mocked(storage.storeConfirmedPhoto).mockRejectedValueOnce(new Error('offline'));
  await open();
  await click('Autorizar e armazenar');
  expect(host.textContent).toContain('continua disponível');
  await click('Tentar envio novamente');
  const calls = vi.mocked(storage.storeConfirmedPhoto).mock.calls;
  expect(calls[0]?.[1]).toBe(calls[1]?.[1]);
});
