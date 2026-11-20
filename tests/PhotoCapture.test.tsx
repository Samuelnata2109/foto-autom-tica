// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { captureFrame } from '../src/services/photoCapture';
import * as composition from '../src/services/photoComposition';
import * as recognition from '../src/hooks/useGestureRecognition';
import type { GestureCommand } from '../src/types/gesture';

const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' });
const createUrl = vi.fn(() => 'blob:foto-da-cabine');
const revokeUrl = vi.fn();
const drawImage = vi.fn();
const encode = vi.fn<(callback: BlobCallback, type?: string, quality?: number) => void>();
let root: Root;
let host: HTMLDivElement;
let track: EventTarget & { readyState: string; stop: () => void };
let stream: MediaStream;
let connect: ReturnType<typeof vi.fn>;

beforeEach(() => {
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

  it('revisa o JPEG composto e confirma pelo comando emitido para Thumb_Up', async () => {
    const composed = new Blob(['composed'], { type: 'image/jpeg' });
    vi.spyOn(composition, 'composePhoto').mockResolvedValue({
      blob: composed,
      width: 1920,
      height: 1080,
    });
    const useRecognition = recognition.useGestureRecognition;
    let confirmByGesture: ((command: GestureCommand) => void) | undefined;
    vi.spyOn(recognition, 'useGestureRecognition').mockImplementation((...args) => {
      if (args[3] === 'review') confirmByGesture = args[4];
      return useRecognition(...args);
    });
    await open();
    await press('.shutter');
    await advance(5000);
    expect(createUrl).toHaveBeenCalledExactlyOnceWith(composed);
    expect(get('.photo-review').textContent).toContain('Moldura oficial aplicada');
    expect(confirmByGesture).toBeDefined();
    await act(async () => confirmByGesture?.('confirm'));
    expect(get('.photo-review [role=status]').textContent).toContain('Foto confirmada');
    await press('.photo-review button:first-child');
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:foto-da-cabine');
    expect(connect).toHaveBeenCalledOnce();
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
