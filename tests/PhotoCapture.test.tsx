// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { captureFrame } from '../src/services/photoCapture';
import * as composition from '../src/services/photoComposition';
import * as backgrounds from '../src/services/virtualBackground';
import * as recognition from '../src/hooks/useGestureRecognition';
import type { GestureCommand } from '../src/types/gesture';

const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' });
const createUrl = vi.fn(() => 'blob:foto-da-cabine');
const revokeUrl = vi.fn();
const drawImage = vi.fn();
const setTransform = vi.fn();
const encode = vi.fn<(callback: BlobCallback, type?: string, quality?: number) => void>();
let root: Root;
let host: HTMLDivElement;
let track: EventTarget & { readyState: string; stop: () => void };
let stream: MediaStream;
let connect: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.spyOn(composition, 'composePhoto').mockResolvedValue({ frame: 'missing' });
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createUrl;
      static revokeObjectURL = revokeUrl;
    },
  );
  track = Object.assign(new EventTarget(), {
    readyState: 'live',
    stop: vi.fn(),
    getSettings: () => ({ deviceId: 'cam' }),
  });
  stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  connect = vi.fn().mockResolvedValue(stream);
  const api = Object.assign(new EventTarget(), {
    enumerateDevices: vi.fn().mockResolvedValue([{ kind: 'videoinput', deviceId: 'cam' }]),
    getUserMedia: connect,
  });
  vi.stubGlobal('navigator', { mediaDevices: api });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
    setTransform,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(encode);
  encode.mockImplementation((callback) => callback(jpeg));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function get<T extends HTMLElement>(selector: string) {
  const element = host.querySelector<T>(selector);
  if (!element) throw new Error('Elemento ausente: ' + selector);
  return element;
}

async function open(dimensions = { width: 1280, height: 720 }, readyState = 4) {
  await act(async () =>
    root.render(
      <StrictMode>
        <MemoryRouter initialEntries={['/cabine']}>
          <App />
        </MemoryRouter>
      </StrictMode>,
    ),
  );
  const video = get<HTMLVideoElement>('video');
  Object.defineProperties(video, {
    videoWidth: { value: dimensions.width, configurable: true },
    videoHeight: { value: dimensions.height, configurable: true },
    readyState: { value: readyState, configurable: true },
  });
  await act(async () => video.dispatchEvent(new Event('playing')));
  return video;
}

async function press(selector: string) {
  await act(async () => get(selector).click());
}

async function advance(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

describe('Sistema fotográfico', () => {
  it.each([
    [1280, 720, 'feira-das-profissoes.png'],
    [640, 480, 'feira-das-profissoes-4x3.png'],
  ])('mantém a moldura do visor %i × %i durante a contagem', async (width, height, file) => {
    const video = await open({ width, height });
    const frame = get<HTMLImageElement>('.camera-viewport__frame');
    expect(frame.getAttribute('src')).toMatch(new RegExp('/' + file + '$'));
    expect(frame.parentElement).toBe(video.parentElement);
    await press('.shutter');
    expect(get('.camera-viewport__frame')).toBe(frame);
    expect(get('.countdown')).toBeTruthy();
    expect(drawImage).not.toHaveBeenCalled();
    await advance(5000);
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(video, 0, 0, width, height);
    expect(setTransform).toHaveBeenCalledExactlyOnceWith(-1, 0, 0, 1, width, 0);
    expect(composition.composePhoto).toHaveBeenCalledOnce();
  });

  it('troca a moldura quando o vídeo muda de proporção, sem trocar o vídeo', async () => {
    const video = await open();
    Object.defineProperties(video, {
      videoWidth: { value: 640 },
      videoHeight: { value: 480 },
    });
    await act(async () => video.dispatchEvent(new Event('resize')));
    expect(get('video')).toBe(video);
    expect(get<HTMLImageElement>('.camera-viewport__frame').getAttribute('src')).toContain(
      'feira-das-profissoes-4x3.png',
    );

    Object.defineProperty(video, 'videoWidth', { value: 854 });
    await act(async () => video.dispatchEvent(new Event('resize')));
    expect(host.querySelector('.camera-viewport__frame')).toBeNull();
  });

  it('salva o quadro com a mesma orientação quando o espelho está desligado', async () => {
    const video = await open();
    await press('.camera-controls__mirror input');
    expect(video.dataset.mirrored).toBe('false');
    await press('.shutter');
    await advance(5000);
    expect(setTransform).not.toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(video, 0, 0, 1280, 720);
  });

  it.each([
    ['start5', 5_000],
    ['start10', 10_000],
  ] as const)('encaminha %s para captura com espera de %i ms', async (command, wait) => {
    const useRecognition = recognition.useGestureRecognition;
    let dispatch: ((command: GestureCommand) => void) | undefined;
    vi.spyOn(recognition, 'useGestureRecognition').mockImplementation((...args) => {
      if (args[3] === 'idle') dispatch = args[4];
      return useRecognition(...args);
    });
    const video = await open();
    await act(async () => {
      dispatch!(command);
      dispatch!(command);
    });
    expect(get('.countdown__value').textContent).toContain(String(wait / 1_000));
    await advance(wait - 1);
    expect(drawImage).not.toHaveBeenCalled();
    await advance(1);
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(video, 0, 0, 1280, 720);
    expect(host.textContent).toContain('Revisão da foto');
  });

  it.each([
    [640, 480],
    [1920, 1080],
  ])('aplica o cenário escolhido na captura %i × %i', async (width, height) => {
    const final = new Blob(['composite'], { type: 'image/jpeg' });
    const replace = vi.spyOn(backgrounds, 'replaceBackground').mockResolvedValue({
      photo: { blob: final, width, height },
      frame: 'applied',
    });
    await open({ width, height });
    const picker = get<HTMLSelectElement>('#booth-scenario');
    expect(Array.from(picker.options, (option) => option.value)).toEqual([
      'original',
      'ai-lab',
      'data-center',
      'neural-networks',
      'robotics',
    ]);
    await act(async () => {
      picker.value = 'robotics';
      picker.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await press('.shutter');
    expect(picker.disabled).toBe(true);
    await advance(4999);
    expect(replace).not.toHaveBeenCalled();
    await advance(1);
    expect(replace).toHaveBeenCalledExactlyOnceWith(
      { blob: jpeg, width, height },
      'robotics',
      expect.any(AbortSignal),
      expect.any(Function),
    );
    expect(composition.composePhoto).not.toHaveBeenCalled();
    expect(createUrl).toHaveBeenCalledExactlyOnceWith(final);
    await press('.photo-review button:last-child');
    expect(get('.photo-review [role=status]').textContent).toContain('Foto confirmada');
    await press('.photo-review button:first-child');
    expect(revokeUrl).toHaveBeenCalledOnce();
  });

  it.each(['cancelado', 'falha'])('mantém a captura utilizável com o cenário %s', async (mode) => {
    vi.spyOn(backgrounds, 'replaceBackground').mockImplementation(
      (_photo, _scenario, signal, onProgress) => {
        onProgress('segmenting');
        if (mode === 'falha') return Promise.reject(new Error('Modelo indisponível'));
        return new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
      },
    );
    await open();
    await act(async () => {
      const picker = get<HTMLSelectElement>('#booth-scenario');
      picker.value = 'ai-lab';
      picker.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await press('.shutter');
    await advance(5000);
    if (mode === 'cancelado') {
      expect(host.textContent).toContain('Separando a pessoa');
      await press('.preview-actions button');
    }
    expect(host.textContent).toContain('A foto está com o fundo original');
    expect(composition.composePhoto).toHaveBeenCalledOnce();
    expect(createUrl).toHaveBeenCalledExactlyOnceWith(jpeg);
    await press('.photo-review button:last-child');
    expect(get('.photo-review [role=status]').textContent).toContain('Foto confirmada');
  });
  it.each([5, 10])('captura JPEG uma única vez ao final de %i segundos', async (duration) => {
    const video = await open();
    if (duration === 10) await press('.timer-option:last-child input');
    const shutter = get<HTMLButtonElement>('.shutter');
    expect(shutter.disabled).toBe(false);
    await act(async () => {
      shutter.click();
      shutter.click();
    });
    expect(get('.countdown__value').textContent).toContain(String(duration));
    expect(get<HTMLSelectElement>('.camera-controls select').disabled).toBe(true);
    expect(get<HTMLFieldSetElement>('.timer-selector').disabled).toBe(true);
    await advance(1000);
    expect(get('.countdown__value').textContent).toContain(String(duration - 1));
    expect(get<HTMLProgressElement>('progress').value).toBeCloseTo(1 / duration);
    await advance((duration - 1) * 1000 - 1);
    expect(drawImage).not.toHaveBeenCalled();
    await advance(1);
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(video, 0, 0, 1280, 720);
    expect(video.dataset.mirrored).toBe('true');
    expect(encode).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'image/jpeg', 0.95);
    expect(get<HTMLImageElement>('.photo-review img').src).toBe('blob:foto-da-cabine');
    expect(get('.photo-review__details').textContent).toContain('1280 × 720');
    expect(get('.photo-review button:nth-child(2)').hasAttribute('disabled')).toBe(true);
    expect(connect).toHaveBeenCalledOnce();
  });

  it('cancela, permite recomeçar e descarta a foto ao tirar novamente', async () => {
    await open();
    await press('.shutter');
    await advance(2000);
    await press('.countdown button');
    await advance(8000);
    expect(drawImage).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(get('.shutter'));
    await press('.shutter');
    await advance(5000);
    await press('.photo-review button:first-child');
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:foto-da-cabine');
    expect(host.querySelector('.photo-review')).toBeNull();
    expect(get<HTMLButtonElement>('.shutter').disabled).toBe(false);
    expect(connect).toHaveBeenCalledOnce();
  });

  it('mantém a foto confirmada na sessão e a libera ao voltar ao início', async () => {
    await open();
    await press('.shutter');
    await advance(5000);
    await press('.photo-review button:last-child');
    expect(get('.photo-review [role=status]').textContent).toContain('Foto confirmada');
    expect(revokeUrl).not.toHaveBeenCalled();
    await press('header a[href="/"]');
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:foto-da-cabine');
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it.each([
    [1920, 1080, 'Thumb_Up'],
    [640, 480, 'botão'],
  ])('revisa o JPEG %i × %i, confirma por %s e permite repetir', async (width, height, method) => {
    const composed = new Blob(['composed'], { type: 'image/jpeg' });
    vi.spyOn(composition, 'composePhoto').mockResolvedValue({
      frame: 'applied',
      photo: { blob: composed, width, height },
    });
    const useRecognition = recognition.useGestureRecognition;
    let confirmByGesture: ((command: GestureCommand) => void) | undefined;
    vi.spyOn(recognition, 'useGestureRecognition').mockImplementation((...args) => {
      if (args[3] === 'review') confirmByGesture = args[4];
      return useRecognition(...args);
    });
    await open({ width, height });
    await press('.shutter');
    await advance(5000);
    expect(createUrl).toHaveBeenCalledExactlyOnceWith(composed);
    expect(get('.photo-review').textContent).toContain('Moldura oficial aplicada');
    expect(get('.photo-review__details').textContent).toContain(`${width} × ${height}`);
    const preview = get('.photo-preview--filled');
    const image = get<HTMLImageElement>('.photo-preview--filled img');
    expect(preview.style.getPropertyValue('--photo-ratio')).toBe(String(width / height));
    expect([image.width, image.height]).toEqual([width, height]);
    expect(composition.composePhoto).toHaveBeenCalledExactlyOnceWith(
      { blob: jpeg, width, height },
      expect.any(AbortSignal),
    );
    if (method === 'Thumb_Up') {
      expect(confirmByGesture).toBeDefined();
      await act(async () => confirmByGesture?.('confirm'));
    } else {
      await press('.photo-review button:last-child');
    }
    expect(get('.photo-review [role=status]').textContent).toContain('Foto confirmada');
    await press('.photo-review button:first-child');
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:foto-da-cabine');
    expect(connect).toHaveBeenCalledOnce();
  });

  it('avisa e mantém as dimensões do JPEG original em uma captura vertical', async () => {
    vi.spyOn(composition, 'composePhoto').mockResolvedValue({ frame: 'unsupported' });
    await open({ width: 1080, height: 1920 });
    await press('.shutter');
    await advance(5000);
    expect(createUrl).toHaveBeenCalledExactlyOnceWith(jpeg);
    expect(get('.photo-review__details').textContent).toContain('1080 × 1920');
    expect(get('.photo-review').textContent).toContain('Sem moldura oficial para esta proporção');
  });

  it('mantém a foto original confirmável se a aplicação da moldura falhar', async () => {
    vi.spyOn(composition, 'composePhoto').mockRejectedValue(new Error('PNG inválido'));
    await open();
    await press('.shutter');
    await advance(5000);
    expect(createUrl).toHaveBeenCalledExactlyOnceWith(jpeg);
    expect(get('.photo-review').textContent).toContain('Falha ao aplicar a moldura');
    await press('.photo-review button:last-child');
    expect(get('.photo-review [role=status]').textContent).toContain('Foto confirmada');
  });

  it('cancela se a câmera desconectar durante a contagem', async () => {
    await open();
    await press('.shutter');
    await advance(2000);
    await act(async () => {
      track.readyState = 'ended';
      track.dispatchEvent(new Event('ended'));
    });
    expect(get('.capture-error').textContent).toContain('desconectada');
    await advance(5000);
    expect(drawImage).not.toHaveBeenCalled();
    expect(host.querySelector('.countdown')).toBeNull();
  });

  it('captura e confirma pelo botão mesmo quando o worker não pode ser criado', async () => {
    vi.stubGlobal('Worker', undefined);
    await open();
    await press('.gesture-toggle input');
    expect(get('.gesture-status').textContent).toContain('IA indisponível');
    await press('.shutter');
    await advance(5000);
    await press('.photo-review button:last-child');
    expect(get('.photo-review [role=status]').textContent).toContain('Foto confirmada');
  });

  it('não usa o quadro se o stream trocar antes do disparo', async () => {
    const video = await open();
    await press('.shutter');
    video.srcObject = {} as MediaStream;
    await advance(5000);
    expect(drawImage).not.toHaveBeenCalled();
    expect(get('.capture-error').textContent).toContain('Câmera indisponível');
  });

  it('descarta a codificação pendente ao sair e limpa o temporizador', async () => {
    let finish: BlobCallback = () => {};
    encode.mockImplementation((callback) => {
      finish = callback;
    });
    await open();
    await press('.shutter');
    await advance(5000);
    await press('header a[href="/"]');
    await act(async () => finish(jpeg));
    expect(createUrl).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('limpa a contagem ao sair antes do disparo', async () => {
    await open();
    await press('.shutter');
    await press('header a[href="/"]');
    await advance(5000);
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('trata vídeo sem quadro e dimensões inválidas', async () => {
    const video = await open({ width: 1280, height: 720 }, 1);
    await press('.shutter');
    expect(get('.capture-error').textContent).toContain('vídeo ainda não está pronto');
    Object.defineProperties(video, { readyState: { value: 4 }, videoWidth: { value: 0 } });
    await expect(captureFrame(video, stream)).rejects.toThrow('dimensões válidas');
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('trata falhas do Canvas e do Blob, e libera o buffer', async () => {
    const video = await open();
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(null);
    await press('.shutter');
    await advance(5000);
    expect(get('.capture-error').textContent).toContain('Canvas');
    encode.mockImplementation((callback) => callback(null));
    await expect(captureFrame(video, stream)).rejects.toThrow('JPEG');
    expect(encode.mock.contexts[0]).toMatchObject({ width: 0, height: 0 });
    expect(createUrl).not.toHaveBeenCalled();
  });
});
