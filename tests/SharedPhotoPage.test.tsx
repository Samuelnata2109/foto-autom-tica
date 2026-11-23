// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HashRouter, MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { OfficialStoryQueue } from '../src/components/OfficialStoryQueue';
import { SharedPhotoPage } from '../src/pages/SharedPhotoPage';
import { photoShareLink } from '../src/services/photoShareLink';
import * as storage from '../src/services/privatePhotoStorage';
import * as storyImage from '../src/services/storyImage';
import * as storyStorage from '../src/services/storyStorage';

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
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
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
    wallDeadline: Date.now() + 5000,
    expiresAt: new Date(Date.now() + 5000).toISOString(),
  };
}

it('abre o link do QR na rota pública sob a subpasta do GitHub Pages', async () => {
  const shareBase = 'https://samuelnata2109.github.io/foto-autom-tica/';
  const url = new URL(photoShareLink(secret, shareBase)!);
  expect(url.href).toBe(`${shareBase}#/foto/${secret}`);
  const originalUrl = window.location.href;
  const read = vi.spyOn(storage, 'readSharedPhoto').mockResolvedValue(photo());
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  window.history.replaceState(null, '', url.pathname + url.hash);
  try {
    await act(async () =>
      root.render(
        <HashRouter>
          <App />
        </HashRouter>,
      ),
    );
    expect(read).toHaveBeenCalledExactlyOnceWith(secret, expect.any(AbortSignal));
    expect(host.querySelector('h1')?.textContent).toBe('Sua foto está pronta!');
    expect(host.querySelector('img.shared-photo-page__image')).not.toBeNull();
  } finally {
    window.history.replaceState(null, '', originalUrl);
  }
});

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

function button(label: string) {
  const match = Array.from(host.querySelectorAll('button')).find(
    (item) => item.textContent.trim() === label,
  );
  if (!match) throw new Error('Botão ausente: ' + label);
  return match;
}

const story = new File(['story'], 'ai-photo-booth-story.jpg', { type: 'image/jpeg' });

it('gera a prévia sob demanda e disponibiliza download sem Web Share', async () => {
  vi.spyOn(storage, 'readSharedPhoto').mockImplementation(async () => photo());
  const compose = vi.spyOn(storyImage, 'composeStory').mockResolvedValue(story);
  const download = vi.spyOn(storyImage, 'downloadJpeg').mockImplementation(() => {});
  await open();
  expect(compose).not.toHaveBeenCalled();
  await act(async () => button('Compartilhar nos meus Stories').click());
  expect(compose).toHaveBeenCalledExactlyOnceWith(image);
  expect(host.querySelector('.story-preview img')).not.toBeNull();
  expect(host.textContent).not.toContain('Abrir compartilhamento');
  await act(async () => button('Baixar Story em JPEG').click());
  expect(download).toHaveBeenCalledExactlyOnceWith(story, story.name);
});

it.each(['received', 'duplicate'] as const)(
  'exige novo consentimento e mostra o resultado %s',
  async (result) => {
    vi.spyOn(storage, 'readSharedPhoto').mockImplementation(async () => photo());
    vi.spyOn(storyImage, 'composeStory').mockResolvedValue(story);
    const submit = vi.spyOn(storyStorage, 'submitOfficialStory').mockResolvedValue(result);
    await open();
    await act(async () => button('Enviar para os Stories oficiais').click());
    expect(button('Confirmar envio para análise').disabled).toBe(true);
    expect(submit).not.toHaveBeenCalled();
    await act(async () => host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
    await act(async () => button('Confirmar envio para análise').click());
    expect(submit).toHaveBeenCalledExactlyOnceWith(secret, true, expect.any(AbortSignal));
    expect(host.textContent).toContain(
      result === 'received' ? 'Solicitação recebida' : 'Já existe uma solicitação',
    );
  },
);

it('remove a prévia e as opções de Story quando o link perde acesso', async () => {
  vi.spyOn(storage, 'readSharedPhoto')
    .mockResolvedValueOnce(photo())
    .mockRejectedValueOnce(new storage.PhotoStorageError(404));
  await open();
  await act(async () => button('Enviar para os Stories oficiais').click());
  expect(host.querySelector('[role=alert]')?.textContent).toContain('expirou ou foi revogado');
  expect(host.querySelector('.story-section')).toBeNull();
});

it('registra a publicação manual somente após confirmação do operador', async () => {
  const entry: storyStorage.StoryEntry = {
    id: 'story-id',
    createdAt: new Date().toISOString(),
    status: 'approved',
    available: true,
  };
  vi.spyOn(storyStorage, 'listOfficialStories').mockResolvedValue({
    entries: [entry],
    more: false,
  });
  vi.spyOn(storyStorage, 'readOfficialStory').mockImplementation(async () => photo());
  const update = vi.spyOn(storyStorage, 'updateOfficialStory').mockResolvedValue(undefined);
  await act(async () =>
    root.render(
      <OfficialStoryQueue token="operator" onExpired={vi.fn()} isSessionActive={() => true} />,
    ),
  );
  await act(async () => button('Visualizar foto').click());
  await act(async () => button('Marcar como publicada').click());
  expect(update).not.toHaveBeenCalled();
  await act(async () => button('Sim, já foi publicada').click());
  expect(update).toHaveBeenCalledExactlyOnceWith(
    'operator',
    entry.id,
    'publish',
    expect.any(AbortSignal),
  );
  expect(host.textContent).toContain('Publicação manual registrada');
});
