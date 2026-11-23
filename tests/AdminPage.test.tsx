// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HashRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../src/App';

const { signInWithPassword, composeStory, downloadJpeg } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  composeStory: vi.fn(),
  downloadJpeg: vi.fn(),
}));
vi.mock('../src/services/supabaseAuth', () => ({
  supabaseConfig: { root: 'https://booth.test', publishable: 'public-test-key' },
  createAuthClient: async () => ({ signInWithPassword }),
}));
vi.mock('../src/services/storyImage', () => ({ composeStory, downloadJpeg }));

const jpeg = (remainingMs = 60_000) =>
  new Response('synthetic jpeg', {
    headers: {
      'Content-Type': 'image/jpeg',
      'X-Booth-Remaining-Ms': String(remainingMs),
      'X-Booth-Expires': new Date(Date.now() + remainingMs).toISOString(),
    },
  });
const stories = (status = 'pending') =>
  Response.json([
    {
      id: '00000000-0000-4000-8000-000000000001',
      createdAt: '2026-11-22T12:00:00.000Z',
      status,
      available: true,
    },
  ]);

let container: HTMLElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;
const createObjectURL = vi.fn(() => 'blob:private-preview');
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  signInWithPassword.mockReset().mockImplementation(async () => ({
    data: {
      session: { access_token: 'operator-session', expires_at: Math.floor(Date.now() / 1000) + 60 },
    },
    error: null,
  }));
  fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
    const headers = new Headers(options?.headers);
    switch (headers.get('X-Booth-Action')) {
      case 'operator':
        return new Response(null, { status: 204 });
      case 'story-list':
        return stories();
      case 'story-read':
        return jpeg();
      default:
        return new Response(null, { status: 503 });
    }
  });
  vi.stubGlobal('fetch', fetchMock);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  composeStory.mockReset();
  downloadJpeg.mockReset();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render(path = '/equipe') {
  window.history.replaceState(null, '', '#' + path);
  await act(async () =>
    root.render(
      <HashRouter>
        <App />
      </HashRouter>,
    ),
  );
}

function element<T extends HTMLElement>(selector: string) {
  const match = container.querySelector<T>(selector);
  expect(match, selector).not.toBeNull();
  return match!;
}

async function click(selector: string) {
  await act(async () => element(selector).click());
}

async function login() {
  element<HTMLInputElement>('input[name="email"]').value = 'operador@example.test';
  element<HTMLInputElement>('input[name="password"]').value = 'senha-de-teste';
  await click('button[type="submit"]');
}

it('protege a gestão de Stories até o servidor autorizar o operador', async () => {
  await render();
  expect(element('h1').textContent).toBe('Acesso da equipe');
  expect(container.querySelector('.admin-nav')).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
  await login();
  expect(element('[role="alert"]').textContent).toContain('A equipe não pôde entrar');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(container.querySelector('.story-queue')).toBeNull();
  await login();
  expect(element('h1').textContent).toBe('Stories oficiais');
  expect(element('.story-queue').textContent).toContain('Pendente');
  expect(container.querySelector('.admin-nav')).toBeNull();
  expect(container.textContent).not.toContain('Eventos e recursos');
  expect(container.textContent).not.toContain('Auditoria');
});

it('redireciona a rota antiga de Stories para a gestão protegida', async () => {
  await render('/equipe/stories');
  expect(element('h1').textContent).toBe('Acesso da equipe');
  expect(fetchMock).not.toHaveBeenCalled();
  await login();
  expect(window.location.hash).toBe('#/equipe');
  expect(element('h1').textContent).toBe('Stories oficiais');
  expect(element('.story-queue').textContent).toContain('Pendente');
  expect(signInWithPassword).toHaveBeenCalledTimes(1);
});

it('abre a gestão de Stories diretamente após autenticar sem navegação intermediária', async () => {
  await render('/equipe');
  await login();
  expect(element('h1').textContent).toBe('Stories oficiais');
  expect(element('.story-queue').textContent).toContain('Pendente');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(signInWithPassword).toHaveBeenCalledTimes(1);
  expect(new Headers(fetchMock.mock.lastCall?.[1]?.headers).get('Authorization')).toBe(
    'Bearer operator-session',
  );
});

it('revoga a prévia e cancela uma atualização pendente ao sair da equipe', async () => {
  await render();
  await login();
  await click('.story-queue__heading button');
  expect(element<HTMLImageElement>('.story-queue img').src).toBe('blob:private-preview');
  let pendingSignal: AbortSignal | null | undefined;
  fetchMock.mockImplementationOnce(async (_url: string, options?: RequestInit) => {
    pendingSignal = options?.signal;
    return new Promise<Response>(() => {});
  });
  await click('.story-queue__entry .preview-actions button');
  expect(pendingSignal?.aborted).toBe(false);
  await click('.admin-header button');
  expect(pendingSignal?.aborted).toBe(true);
  expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:private-preview');
  expect(container.querySelector('.story-queue')).toBeNull();
  expect(element('input[name="email"]')).toBeTruthy();
});

it('cancela a leitura pendente e descarta a resposta tardia ao sair da rota de Stories', async () => {
  await render();
  await login();
  let pendingSignal: AbortSignal | null | undefined;
  let finish!: (response: Response) => void;
  fetchMock.mockImplementationOnce(async (_url: string, options?: RequestInit) => {
    pendingSignal = options?.signal;
    return new Promise<Response>((resolve) => {
      finish = resolve;
    });
  });
  await click('.story-queue__heading button');
  await act(async () => {
    window.location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(pendingSignal?.aborted).toBe(true);
  await act(async () => finish(jpeg()));
  expect(createObjectURL).not.toHaveBeenCalled();
  expect(element('h1').textContent).toBeTruthy();
});

it('encerra toda a sessão quando a fila recebe autorização recusada', async () => {
  await render();
  await login();
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
  await click('.story-queue__heading button');
  expect(element('[role="alert"]').textContent).toContain('Sessão indisponível');
  expect(container.querySelector('.admin-nav')).toBeNull();
  expect(container.querySelector('.story-queue')).toBeNull();
});

it('limpa a prévia e pede autenticação quando o prazo da sessão acaba', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  await render();
  await login();
  await click('.story-queue__heading button');
  expect(element('.story-queue img')).toBeTruthy();
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(element('[role="alert"]').textContent).toContain('Sessão indisponível');
  expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:private-preview');
  expect(container.querySelector('.story-queue')).toBeNull();
});

it('ignora a resposta 401 de uma leitura anterior após logout e novo login', async () => {
  await render();
  await login();
  let finish!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  await click('.story-queue__heading button');
  await click('.admin-header button');
  await login();
  await click('.story-queue__heading button');
  await act(async () => finish(new Response(null, { status: 401 })));
  expect(element('h1').textContent).toBe('Stories oficiais');
  expect(element('.story-queue img')).toBeTruthy();
  expect(createObjectURL).toHaveBeenCalledTimes(1);
  expect(revokeObjectURL).not.toHaveBeenCalled();
});

it('revoga a prévia vencida e cancela um download que ainda estava sendo composto', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
  await render();
  fetchMock
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(stories('approved'));
  await login();
  fetchMock.mockResolvedValueOnce(jpeg(1000));
  await click('.story-queue__heading button');
  const file = new File(['synthetic jpeg'], 'story.jpg', { type: 'image/jpeg' });
  let composeSignal: AbortSignal | undefined;
  let finish!: (value: File) => void;
  composeStory.mockImplementationOnce((_photo: Blob, signal: AbortSignal) => {
    composeSignal = signal;
    return new Promise<File>((resolve) => {
      finish = resolve;
    });
  });

  await click('.story-queue__entry .preview-actions button');
  expect(composeSignal?.aborted).toBe(false);
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(composeSignal?.aborted).toBe(true);
  expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:private-preview');
  expect(container.querySelector('.story-queue img')).toBeNull();
  expect(element('[role="alert"]').textContent).toContain('indisponível');
  await act(async () => finish(file));
  expect(downloadJpeg).not.toHaveBeenCalled();
  expect(element('h1').textContent).toBe('Stories oficiais');
});

it('descarta uma prévia que chega após o prazo da sessão mesmo antes do timer', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  await render();
  await login();
  let finish!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  await click('.story-queue__heading button');
  vi.setSystemTime(Date.now() + 60_000);
  await act(async () => finish(jpeg()));
  expect(createObjectURL).not.toHaveBeenCalled();
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(element('[role="alert"]').textContent).toContain('Sessão indisponível');
});

it('revalida a foto ao restaurar a aba mesmo quando o relógio monotônico ficou suspenso', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
  await render();
  await login();
  fetchMock.mockResolvedValueOnce(jpeg(1000));
  await click('.story-queue__heading button');
  const monotonic = performance.now();
  vi.setSystemTime(Date.now() + 1000);
  expect(performance.now()).toBe(monotonic);
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:private-preview');
  expect(container.querySelector('.story-queue img')).toBeNull();
  expect(element('h1').textContent).toBe('Stories oficiais');
});
