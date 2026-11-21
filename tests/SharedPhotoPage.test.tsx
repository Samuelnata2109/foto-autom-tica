// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SharedPhotoPage } from '../src/pages/SharedPhotoPage';
import * as storage from '../src/services/privatePhotoStorage';

const secret = 'ab'.repeat(32);
const image = new Blob(['fixture'], { type: 'image/jpeg' });
const createUrl = vi.fn().mockReturnValue('blob:fixture');
const revokeUrl = vi.fn();
let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createUrl;
      static revokeObjectURL = revokeUrl;
    },
  );
  host = document.createElement('div');
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function open() {
  return act(async () =>
    root.render(
      <MemoryRouter initialEntries={[`/foto/${secret}`]}>
        <Routes>
          <Route path="/foto/:secret" element={<SharedPhotoPage />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

function photo() {
  return {
    image,
    deadline: performance.now() + 5000,
    expiresAt: new Date(Date.now() + 5000).toISOString(),
  };
}

it('baixa o JPEG com nova consulta autorizada', async () => {
  const read = vi.spyOn(storage, 'readSharedPhoto').mockResolvedValue(photo());
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    expect(this.download).toBe('ai-photo-booth.jpg');
  });
  await open();
  expect(host.querySelector('img.shared-photo-page__image')?.getAttribute('src')).toBe(
    'blob:fixture',
  );
  await act(async () => host.querySelector('button')!.click());
  expect(read).toHaveBeenCalledTimes(2);
  expect(read).toHaveBeenLastCalledWith(secret, expect.any(AbortSignal));
  expect(click).toHaveBeenCalledOnce();
});

it('remove a imagem quando a revalidação do download encontra o link indisponível', async () => {
  vi.spyOn(storage, 'readSharedPhoto')
    .mockResolvedValueOnce(photo())
    .mockRejectedValueOnce(new storage.PhotoStorageError(404));
  await open();
  await act(async () => host.querySelector('button')!.click());
  expect(host.querySelector('[role=alert]')?.textContent).toContain('expirou ou foi revogado');
  expect(host.querySelector('img.shared-photo-page__image')).toBeNull();
  expect(revokeUrl).toHaveBeenCalledWith('blob:fixture');
});

it('mostra erro temporário e permite uma nova tentativa', async () => {
  vi.spyOn(storage, 'readSharedPhoto')
    .mockRejectedValueOnce(new storage.PhotoStorageError(429))
    .mockResolvedValueOnce(photo());
  await open();
  expect(host.querySelector('[role=alert]')?.textContent).toContain('Limite de acessos');
  await act(async () => host.querySelector('button')!.click());
  expect(host.querySelector('[role=alert]')).toBeNull();
  expect(host.querySelector('img.shared-photo-page__image')).not.toBeNull();
});
