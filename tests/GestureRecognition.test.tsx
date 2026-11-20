// @vitest-environment jsdom
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGestureRecognition } from '../src/hooks/useGestureRecognition';
import type { GestureWorkerRequest, GestureWorkerResponse } from '../src/types/gesture';

vi.mock('../src/services/gestureRecognizer', () => ({
  createGestureRecognizer: vi.fn().mockRejectedValue(new Error('modelo indisponível')),
}));

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<GestureWorkerResponse>) => void) | null = null;
  onerror: (() => void) | null = null;
  messages: GestureWorkerRequest[] = [];
  terminate = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(message: GestureWorkerRequest) {
    this.messages.push(message);
  }
  reply(message: GestureWorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<GestureWorkerResponse>);
  }
}

const stream = {} as MediaStream;
const onCommand = vi.fn();
let host: HTMLDivElement;
let root: Root;
const frame = { close: vi.fn() } as unknown as ImageBitmap;

function Harness({
  cameraReady = true,
  source = stream,
}: {
  cameraReady?: boolean;
  source?: MediaStream | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognition = useGestureRecognition(videoRef, source, cameraReady, 'idle', onCommand);
  return (
    <>
      <video ref={videoRef} />
      <button onClick={() => recognition.setEnabled(!recognition.enabled)}>Alternar IA</button>
      <span>{recognition.status}</span>
    </>
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(frame));
  FakeWorker.instances = [];
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('ciclo de reconhecimento', () => {
  it('inicializa uma vez, limita a um quadro pendente e encerra ao desativar', async () => {
    await act(async () => root.render(<Harness />));
    const video = host.querySelector('video')!;
    Object.defineProperties(video, {
      readyState: { configurable: true, value: 2 },
      videoWidth: { configurable: true, value: 1920 },
      videoHeight: { configurable: true, value: 1080 },
      currentTime: { configurable: true, value: 1 },
    });
    await act(async () => host.querySelector('button')!.click());
    const worker = FakeWorker.instances[0]!;
    expect(worker.messages[0]).toMatchObject({ type: 'init' });
    await act(async () => worker.reply({ type: 'ready' }));
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(worker.messages.filter((message) => message.type === 'frame')).toHaveLength(1);
    expect(createImageBitmap).toHaveBeenCalledWith(
      video,
      expect.objectContaining({ resizeWidth: 320, resizeHeight: 180 }),
    );
    await act(async () => host.querySelector('button')!.click());
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(host.textContent).toContain('off');
    expect(onCommand).not.toHaveBeenCalled();
  });

  it('não processa o mesmo quadro novamente após o resultado', async () => {
    await act(async () => root.render(<Harness />));
    const video = host.querySelector('video')!;
    Object.defineProperties(video, {
      readyState: { configurable: true, value: 2 },
      videoWidth: { configurable: true, value: 640 },
      videoHeight: { configurable: true, value: 360 },
      currentTime: { configurable: true, value: 1 },
    });
    await act(async () => host.querySelector('button')!.click());
    const worker = FakeWorker.instances[0]!;
    await act(async () => worker.reply({ type: 'ready' }));
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    await act(async () => worker.reply({ type: 'result', id: 1, detection: null }));
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(worker.messages.filter((message) => message.type === 'frame')).toHaveLength(1);
  });

  it('informa falha de inicialização e encerra o worker', async () => {
    await act(async () => root.render(<Harness />));
    await act(async () => host.querySelector('button')!.click());
    const worker = FakeWorker.instances[0]!;
    await act(async () => {
      worker.reply({ type: 'error', message: 'Falha no WASM' });
      await Promise.resolve();
    });
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(host.textContent).toContain('unavailable');
    expect(onCommand).not.toHaveBeenCalled();
  });

  it('libera o worker e zera o reconhecimento ao desconectar a câmera', async () => {
    await act(async () => root.render(<Harness />));
    await act(async () => host.querySelector('button')!.click());
    const worker = FakeWorker.instances[0]!;
    await act(async () => worker.reply({ type: 'ready' }));
    await act(async () => root.render(<Harness cameraReady={false} source={null} />));
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(host.textContent).toContain('unavailable');
  });
});
