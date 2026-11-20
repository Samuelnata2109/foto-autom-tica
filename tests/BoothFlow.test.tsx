// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Object.defineProperty(Navigator.prototype, 'mediaDevices', {
    configurable: true,
    get: () => undefined,
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render(path = '/') {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    ),
  );
}

function find<T extends HTMLElement>(selector: string) {
  const element = container.querySelector<T>(selector);
  expect(element, selector).not.toBeNull();
  return element!;
}

async function click(selector: string) {
  await act(async () => find(selector).click());
}

describe('Experiência da cabine', () => {
  it('exibe a recepção e navega entre início e cabine', async () => {
    await render();
    expect(find('h1').textContent).toMatch(/Seu momento\.\s*Sua melhor foto\./);
    expect(find('a[href="/cabine"]').textContent).toContain('Iniciar experiência');

    await click('a[href="/cabine"]');
    expect(find('h1').textContent).toBe('Cabine fotográfica');
    expect(document.activeElement).toBe(find('h1'));

    await click('a[href="/"]');
    expect(find('h1').textContent).toContain('Sua melhor foto.');
  });

  it('seleciona 5 ou 10 segundos sem iniciar uma contagem', async () => {
    await render('/cabine');
    const five = find<HTMLInputElement>('label:first-child input[type="radio"]');
    const ten = find<HTMLInputElement>('label:last-child input[type="radio"]');

    expect(five.checked).toBe(true);
    await act(async () => ten.click());
    expect(ten.checked).toBe(true);
    expect(five.checked).toBe(false);
    expect(container.querySelector('progress')).toBeNull();
  });

  it('explica a indisponibilidade da câmera e exibe os quatro gestos previstos', async () => {
    await render('/cabine');
    expect(find('.camera-status').textContent).toBe('Navegador incompatível');
    expect(find('.camera-viewport').textContent).toContain('HTTPS ou localhost');
    expect(find<HTMLButtonElement>('.shutter').disabled).toBe(true);
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelectorAll('.gesture-guide li')).toHaveLength(4);
    expect(find('.gesture-guide').textContent).toContain('IA desativada');
  });
});

describe('Câmera da cabine', () => {
  function source(deviceId: string) {
    const track = Object.assign(new EventTarget(), {
      readyState: 'live',
      stop: vi.fn(),
      getSettings: () => ({ deviceId, width: 1280, height: 720, frameRate: 24 }),
    });
    const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
    return { track, stream };
  }

  function media() {
    const devices = [
      { deviceId: 'webcam', label: 'Webcam', kind: 'videoinput' },
      { deviceId: 'droidcam', label: 'DroidCam Video', kind: 'videoinput' },
      { deviceId: 'mic', label: 'Microfone', kind: 'audioinput' },
    ];
    const api = Object.assign(new EventTarget(), {
      enumerateDevices: vi.fn().mockResolvedValue(devices),
      getUserMedia: vi.fn(),
    });
    vi.spyOn(Navigator.prototype, 'mediaDevices', 'get').mockReturnValue(
      api as unknown as MediaDevices,
    );
    return api;
  }

  function status() {
    return find('.camera-status').textContent;
  }

  it('abre somente vídeo após entrar, exibe a qualidade real e permite desligar e religar', async () => {
    const api = media();
    const first = source('webcam');
    api.getUserMedia
      .mockResolvedValueOnce(first.stream)
      .mockResolvedValueOnce(source('webcam').stream);
    await render();
    expect(api.getUserMedia).not.toHaveBeenCalled();
    await click('a[href="/cabine"]');
    expect(status()).toBe('Conectando câmera');
    expect(api.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        aspectRatio: { ideal: 16 / 9 },
        frameRate: { ideal: 30 },
      },
    });
    const video = find<HTMLVideoElement>('video');
    expect(video.srcObject).toBe(first.stream);
    expect(video.autoplay && video.muted && video.playsInline).toBe(true);
    Object.defineProperties(video, { videoWidth: { value: 1280 }, videoHeight: { value: 720 } });
    await act(async () => video.dispatchEvent(new Event('playing')));
    expect(status()).toBe('Câmera ativa');
    expect(find('.camera-controls__quality').textContent).toBe('1280 × 720 · 24 FPS informados');
    expect(video.dataset.mirrored).toBe('true');
    await click('.camera-controls__mirror input');
    expect(video.dataset.mirrored).toBe('false');
    expect(video.srcObject).toBe(first.stream);
    await click('.camera-controls button:last-of-type');
    expect(first.track.stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
    expect(status()).toBe('Câmera não iniciada');
    await click('.camera-feedback button');
    expect(api.getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('troca para a webcam virtual, libera a anterior e permite reconectar após ended', async () => {
    const api = media();
    const first = source('webcam');
    const second = source('droidcam');
    const third = source('droidcam');
    api.getUserMedia
      .mockResolvedValueOnce(first.stream)
      .mockResolvedValueOnce(second.stream)
      .mockResolvedValueOnce(third.stream);
    await render('/cabine');
    await act(async () => find('video').dispatchEvent(new Event('playing')));
    const select = find<HTMLSelectElement>('select');
    expect([...select.options].map(({ text }) => text)).toContain('DroidCam Video');
    expect([...select.options].map(({ value }) => value)).not.toContain('mic');
    await act(async () => {
      select.value = 'droidcam';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(first.track.stop).toHaveBeenCalledOnce();
    expect(api.getUserMedia.mock.calls[1]?.[0]).toMatchObject({
      video: { deviceId: { exact: 'droidcam' } },
    });
    await act(async () => second.track.dispatchEvent(new Event('ended')));
    expect(status()).toBe('Câmera desconectada');
    expect(second.track.stop).toHaveBeenCalledOnce();
    await click('.camera-feedback button');
    expect(find<HTMLVideoElement>('video').srcObject).toBe(third.stream);
    await click('header a[href="/"]');
    expect(third.track.stop).toHaveBeenCalledOnce();
  });

  it('atualiza a lista em devicechange e solta o dispositivo removido', async () => {
    const api = media();
    const first = source('webcam');
    api.getUserMedia.mockResolvedValue(first.stream);
    await render('/cabine');
    api.enumerateDevices.mockResolvedValue([
      { deviceId: 'droidcam', kind: 'videoinput', label: 'DroidCam Video' },
    ]);
    await act(async () => api.dispatchEvent(new Event('devicechange')));
    expect(status()).toBe('Câmera desconectada');
    expect(find<HTMLSelectElement>('select').value).toBe('');
    expect(first.track.stop).toHaveBeenCalledOnce();
  });

  it.each([
    ['NotAllowedError', 'Permissão negada'],
    ['NotFoundError', 'Câmera não encontrada'],
    ['NotReadableError', 'Câmera ocupada'],
    ['OverconstrainedError', 'Configuração incompatível'],
    ['AbortError', 'Não foi possível iniciar o vídeo'],
  ])('oferece nova tentativa para %s', async (name, message) => {
    const api = media();
    api.getUserMedia.mockRejectedValue(new DOMException('', name));
    await render('/cabine');
    expect(status()).toBe(message);
    expect(find('.camera-feedback button').textContent).toBe('Tentar novamente');
    expect(container.querySelector('video')).toBeNull();
  });

  it('mantém uma solicitação pendente e para o stream concedido após sair', async () => {
    const api = media();
    const first = source('webcam');
    let grant: (stream: typeof first.stream) => void = () => {};
    api.getUserMedia.mockReturnValue(
      new Promise((resolve) => {
        grant = resolve;
      }),
    );
    await render('/cabine');
    expect(status()).toBe('Aguardando permissão');
    expect(find<HTMLSelectElement>('select').disabled).toBe(true);
    await click('header a[href="/"]');
    await act(async () => grant(first.stream));
    expect(api.getUserMedia).toHaveBeenCalledOnce();
    expect(first.track.stop).toHaveBeenCalledOnce();
    expect(container.querySelector('video')).toBeNull();
  });
});

describe('Prévias de desenvolvimento', () => {
  it('exibe um quadro de contagem e permite demonstrar seu cancelamento', async () => {
    await render('/previa/contagem');
    expect(find('.preview-notice').textContent).toContain('Prévia de desenvolvimento');
    expect(find<HTMLProgressElement>('progress').value).toBe(0.4);
    await click('.countdown button');
    expect(find('[role="status"]').textContent).toBe('Cancelado');
    expect(container.querySelector('progress')).toBeNull();
    await click('.preview-actions button');
    expect(find('[role="status"]').textContent).toContain('3 segundos restantes');
  });

  it('exibe a revisão sem foto e desabilita ações indisponíveis', async () => {
    await render('/previa/revisao');
    expect(find('.photo-preview').textContent).toContain('Nenhuma foto disponível');
    expect(container.querySelector('.photo-preview img')).toBeNull();
    expect(container.querySelectorAll('.preview-actions button:disabled')).toHaveLength(2);
    await click('.preview-actions a');
    expect(find('h1').textContent).toBe('Cabine fotográfica');
  });

  it('mostra os espaços reservados e permite finalizar a experiência', async () => {
    await render('/previa/compartilhamento');
    const panel = find('.sharing-panel');
    expect(panel.textContent).toContain('QR Code indisponível');
    expect(panel.textContent).toContain('Download');
    expect(panel.textContent).toContain('Instagram');
    expect(panel.querySelector('a')).toBeNull();
    await click('.preview-actions a');
    expect(find('h1').textContent).toContain('Sua melhor foto.');
  });
});
