// @vitest-environment jsdom
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGestureRecognition } from '../src/hooks/useGestureRecognition';
import { createGestureRecognizer, detectGesture } from '../src/services/gestureRecognizer';
import { gestureConfig } from '../src/config/gestureConfig';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';
import type { GesturePhase } from '../src/types/gesture';
import type { GestureWorkerRequest, GestureWorkerResponse } from '../src/types/gesture';

vi.mock('../src/services/gestureRecognizer', () => ({
  createGestureRecognizer: vi.fn().mockRejectedValue(new Error('modelo indisponível')),
  detectGesture: vi.fn().mockReturnValue(null),
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
  phase = 'idle',
}: {
  cameraReady?: boolean;
  source?: MediaStream | null;
  phase?: GesturePhase;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognition = useGestureRecognition(videoRef, source, cameraReady, phase, onCommand);
  return (
    <>
      <video ref={videoRef} />
      <button onClick={() => recognition.setEnabled(!recognition.enabled)}>Alternar IA</button>
      <button
        onClick={() => {
          recognition.setDebug(true);
          recognition.setObserve(true);
        }}
      >
        Observar
      </button>
      <span>{recognition.status}</span>
    </>
  );
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'],
  });
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
  it('aceita aquecimento de 38,2 segundos sem acionar fallback antes de 60 segundos', async () => {
    await act(async () => root.render(<Harness />));
    await act(async () => host.querySelector('button')!.click());
    const worker = FakeWorker.instances[0]!;
    await act(async () => vi.advanceTimersByTimeAsync(38200));
    expect(worker.terminate).not.toHaveBeenCalled();
    expect(host.textContent).toContain('loading');
    await act(async () => worker.reply({ type: 'ready' }));
    await act(async () => vi.advanceTimersByTimeAsync(30000));
    expect(host.textContent).toContain('active');
    expect(worker.terminate).not.toHaveBeenCalled();
  });
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

async function readyWorker() {
  await act(async () => root.render(<Harness />));
  const video = host.querySelector('video')!;
  Object.defineProperties(video, {
    readyState: { configurable: true, value: 2 },
    videoWidth: { configurable: true, value: 640 },
    videoHeight: { configurable: true, value: 360 },
    currentTime: { configurable: true, writable: true, value: 1 },
  });
  await act(async () => host.querySelector('button')!.click());
  const worker = FakeWorker.instances[0]!;
  await act(async () => worker.reply({ type: 'ready' }));
  return { worker, video };
}

it('aplica fallback após worker ativo e limita a 5 Hz', async () => {
  const close = vi.fn();
  vi.mocked(createGestureRecognizer).mockResolvedValueOnce({
    close,
  } as unknown as GestureRecognizer);
  const { worker, video } = await readyWorker();
  await act(async () => {
    worker.onerror?.();
    await Promise.resolve();
  });
  expect(worker.terminate).toHaveBeenCalledOnce();
  for (let i = 0; i < 20; i++) {
    video.currentTime += 1;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
  }
  expect(detectGesture).toHaveBeenCalledTimes(5);
});

it('encerra worker sem resposta na inicialização e preserva botão manual', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => host.querySelector('button')!.click());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(gestureConfig.workerInitializationTimeoutMs);
  });
  expect(FakeWorker.instances[0]!.terminate).toHaveBeenCalledOnce();
  expect(host.textContent).toContain('unavailable');
  expect(host.querySelector('button')!.disabled).toBe(false);
});

it('encerra worker sem resposta de inferência', async () => {
  const { worker } = await readyWorker();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(gestureConfig.workerInferenceTimeoutMs);
  });
  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(host.textContent).toContain('unavailable');
});

it('descarta resultado de outro estado e identificador incorreto', async () => {
  const { worker } = await readyWorker();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
  await act(async () => root.render(<Harness phase="review" />));
  await act(async () =>
    worker.reply({ type: 'result', id: 999, detection: { name: 'Thumb_Up', score: 1 } }),
  );
  await act(async () =>
    worker.reply({ type: 'result', id: 1, detection: { name: 'Thumb_Up', score: 1 } }),
  );
  expect(onCommand).not.toHaveBeenCalled();
});

it('fecha bitmap pendente da sessão anterior após desativar e reativar', async () => {
  let resolve!: (value: ImageBitmap) => void;
  vi.mocked(createImageBitmap).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { worker } = await readyWorker();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
  await act(async () => host.querySelector('button')!.click());
  await act(async () => host.querySelector('button')!.click());
  await act(async () => resolve(frame));
  expect(frame.close).toHaveBeenCalled();
  expect(worker.messages.filter((message) => message.type === 'frame')).toHaveLength(0);
  expect(FakeWorker.instances).toHaveLength(2);
});

it.each([
  [false, 'Victory', 'idle', 'start10'],
  [true, 'Victory', 'idle', 'start10'],
  [false, 'Closed_Fist', 'countdown', 'cancel'],
  [false, 'Thumb_Up', 'review', 'confirm'],
] as const)(
  'controla envio: observação %s, gesto %s, fase %s',
  async (observe, name, phase, command) => {
    const { worker, video } = await readyWorker();
    await act(async () => root.render(<Harness phase={phase} />));
    if (observe) await act(async () => host.querySelectorAll('button')[1]!.click());
    for (let i = 0; i <= 22; i++) {
      video.currentTime += 1;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      const message = worker.messages.at(-1);
      if (message?.type !== 'frame') throw Error('Quadro esperado');
      await act(async () =>
        worker.reply({ type: 'result', id: message.id, detection: { name, score: 0.92 } }),
      );
    }
    if (observe) expect(onCommand).not.toHaveBeenCalled();
    else expect(onCommand.mock.calls).toEqual([[command]]);
  },
);
