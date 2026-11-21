// @vitest-environment jsdom
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGestureRecognition } from '../src/hooks/useGestureRecognition';
import { GestureGuide } from '../src/components/GestureGuide';
import { createGestureRecognizer, detectGesture } from '../src/services/gestureRecognizer';
import { gestureConfig } from '../src/config/gestureConfig';
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
      <button onClick={recognition.retry}>Tentar novamente</button>
      <span data-gesture={recognition.gesture ?? ''}>{recognition.status}</span>
      <span data-backend>{recognition.backend}</span>
      <output>
        {recognition.workerError} / {recognition.incidents.timeouts} /{' '}
        {recognition.incidents.failures}
      </output>
      <GestureGuide recognition={recognition} phase={phase} />
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
    await act(async () => worker.reply({ type: 'ready', startupMs: 20, delegate: 'CPU' }));
    await act(async () => vi.advanceTimersByTimeAsync(30000));
    expect(host.textContent).toContain('loading');
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
    await act(async () => worker.reply({ type: 'ready', startupMs: 20, delegate: 'CPU' }));
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
    await act(async () => worker.reply({ type: 'ready', startupMs: 20, delegate: 'CPU' }));
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    await act(async () => worker.reply({ type: 'result', inferenceMs: 5, id: 1, detection: null }));
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
    await act(async () => worker.reply({ type: 'ready', startupMs: 20, delegate: 'CPU' }));
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
  await act(async () => worker.reply({ type: 'ready', startupMs: 20, delegate: 'CPU' }));
  return { worker, video };
}

it('suspende a IA sem carregar CPU na interface e permite reconectar o worker', async () => {
  const { worker, video } = await readyWorker();
  await act(async () => worker.onerror?.());
  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(host.textContent).toContain('unavailable');
  await act(async () => {
    video.currentTime++;
    await vi.advanceTimersByTimeAsync(1500);
  });
  expect(createGestureRecognizer).not.toHaveBeenCalled();
  expect(detectGesture).not.toHaveBeenCalled();
  expect(createImageBitmap).not.toHaveBeenCalled();
  await act(async () => host.querySelectorAll('button')[2]!.click());
  expect(FakeWorker.instances).toHaveLength(2);
  const replacement = FakeWorker.instances[1]!;
  await act(async () => replacement.reply({ type: 'ready', startupMs: 20, delegate: 'CPU' }));
  await act(async () => vi.advanceTimersByTimeAsync(100));
  await act(async () =>
    replacement.reply({ type: 'result', inferenceMs: 10, id: 1, detection: null }),
  );
  expect(host.textContent).toContain('active');
});

it('separa o primeiro quadro lento do timeout de 3 s em regime', async () => {
  const { worker, video } = await readyWorker();
  await act(async () => vi.advanceTimersByTimeAsync(100));
  await act(async () => vi.advanceTimersByTimeAsync(6000));
  expect(worker.terminate).not.toHaveBeenCalled();
  await act(async () =>
    worker.reply({ type: 'result', id: 1, inferenceMs: 6000, detection: null }),
  );
  expect(host.textContent).toContain('active');
  video.currentTime++;
  await act(async () => vi.advanceTimersByTimeAsync(100));
  await act(async () => worker.reply({ type: 'started', id: 2 }));
  await act(async () => vi.advanceTimersByTimeAsync(gestureConfig.workerInferenceTimeoutMs));
  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(host.textContent).toContain('loading');
  expect(host.querySelector('output')?.textContent).toContain('inferência / 1 / 0');
});

it('encerra o primeiro quadro sem resposta no limite de aquecimento', async () => {
  const { worker } = await readyWorker();
  await act(async () => vi.advanceTimersByTimeAsync(100));
  await act(async () => vi.advanceTimersByTimeAsync(gestureConfig.workerFirstFrameTimeoutMs));
  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(host.querySelector('output')?.textContent).toContain(
    'entrega ao worker no primeiro quadro / 1 / 0',
  );
});

it('usa novos quadros apresentados pelo vídeo e cancela o callback ao desativar', async () => {
  const { worker, video } = await readyWorker();
  let nextFrame: VideoFrameRequestCallback | undefined;
  const register = vi.fn((callback: VideoFrameRequestCallback) => {
    nextFrame = callback;
    return 42;
  });
  const cancel = vi.fn();
  Object.assign(video, {
    requestVideoFrameCallback: register,
    cancelVideoFrameCallback: cancel,
  });
  await act(async () => root.render(<Harness phase="review" />));
  expect(register).toHaveBeenCalledOnce();
  expect(createImageBitmap).not.toHaveBeenCalled();
  await act(async () =>
    nextFrame?.(performance.now(), { mediaTime: 1 } as VideoFrameCallbackMetadata),
  );
  expect(createImageBitmap).toHaveBeenCalledOnce();
  expect(register).toHaveBeenCalledOnce();
  await act(async () => worker.reply({ type: 'result', id: 1, inferenceMs: 5, detection: null }));
  await act(async () => vi.advanceTimersByTimeAsync(100));
  expect(register).toHaveBeenCalledTimes(2);
  await act(async () => host.querySelector('button')!.click());
  expect(cancel).toHaveBeenCalledExactlyOnceWith(42);
});

it('fecha bitmap que chega depois do prazo de preparação', async () => {
  let resolve!: (bitmap: ImageBitmap) => void;
  vi.mocked(createImageBitmap).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { worker } = await readyWorker();
  await act(async () => vi.advanceTimersByTimeAsync(100 + gestureConfig.workerInferenceTimeoutMs));
  expect(host.querySelector('output')?.textContent).toContain('preparação do quadro / 1 / 0');
  expect(worker.terminate).toHaveBeenCalledOnce();
  await act(async () => resolve(frame));
  expect(frame.close).toHaveBeenCalledOnce();
  expect(worker.messages.filter(({ type }) => type === 'frame')).toHaveLength(0);
});

it('pega somente o quadro mais recente e desacelera após inferência lenta', async () => {
  const { worker, video } = await readyWorker();
  await act(async () => vi.advanceTimersByTimeAsync(50));
  await act(async () => worker.reply({ type: 'result', id: 1, inferenceMs: 5, detection: null }));
  video.currentTime = 2;
  await act(async () => vi.advanceTimersByTimeAsync(100));
  video.currentTime = 3;
  await act(async () => vi.advanceTimersByTimeAsync(80));
  video.currentTime = 4;
  await act(async () => vi.advanceTimersByTimeAsync(80));
  expect(createImageBitmap).toHaveBeenCalledTimes(2);
  const frame = worker.messages.at(-1);
  if (frame?.type !== 'frame') throw Error('Quadro esperado');
  const rest = Math.ceil(performance.now() - frame.timestamp);
  const expectedAt = performance.now() + rest;
  await act(async () => worker.reply({ type: 'result', id: 2, inferenceMs: 160, detection: null }));
  await act(async () => vi.advanceTimersByTimeAsync(rest - 1));
  expect(createImageBitmap).toHaveBeenCalledTimes(2);
  await act(async () => vi.advanceTimersByTimeAsync(1));
  expect(createImageBitmap).toHaveBeenCalledTimes(3);
  expect(worker.messages.at(-1)).toMatchObject({ type: 'frame', timestamp: expectedAt, id: 3 });
});

it('reinicia automaticamente e suspende após três timeouts consecutivos', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => host.querySelector('button')!.click());
  for (let attempt = 1; attempt <= 3; attempt++) {
    await act(async () => vi.advanceTimersByTimeAsync(gestureConfig.workerInitializationTimeoutMs));
    expect(FakeWorker.instances[attempt - 1]!.terminate).toHaveBeenCalledOnce();
    if (attempt < 3) expect(host.textContent).toContain('loading');
    await act(async () => vi.advanceTimersByTimeAsync(gestureConfig.workerRetryDelayMs));
    expect(FakeWorker.instances).toHaveLength(Math.min(attempt + 1, 3));
  }
  expect(host.textContent).toContain('unavailable');
  expect(host.querySelector('output')?.textContent).toContain('inicialização do worker / 3 / 0');
  expect(host.querySelector('button')!.disabled).toBe(false);
});

it('cancela a retomada agendada ao desligar o reconhecimento', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => host.querySelector('button')!.click());
  await act(async () => vi.advanceTimersByTimeAsync(gestureConfig.workerInitializationTimeoutMs));
  await act(async () => host.querySelector('button')!.click());
  await act(async () => vi.advanceTimersByTimeAsync(gestureConfig.workerRetryDelayMs));
  expect(FakeWorker.instances).toHaveLength(1);
  expect(FakeWorker.instances[0]!.terminate).toHaveBeenCalledOnce();
});

it('mostra a GPU do novo worker e restaura o orçamento após um quadro válido', async () => {
  const { video } = await readyWorker();
  for (let attempt = 0; attempt < 2; attempt++) {
    const limit =
      attempt === 0
        ? gestureConfig.workerFirstFrameTimeoutMs + 50
        : gestureConfig.workerInitializationTimeoutMs;
    await act(async () => vi.advanceTimersByTimeAsync(limit));
    await act(async () => vi.advanceTimersByTimeAsync(gestureConfig.workerRetryDelayMs));
  }
  const recovered = FakeWorker.instances[2]!;
  await act(async () => recovered.reply({ type: 'ready', startupMs: 20, delegate: 'GPU' }));
  expect(host.querySelector('[data-backend]')?.textContent).toBe('Worker · GPU');
  for (let id = 1; id <= 2; id++) {
    video.currentTime++;
    await act(async () => vi.advanceTimersByTimeAsync(100));
    await act(async () => recovered.reply({ type: 'result', id, inferenceMs: 5, detection: null }));
  }
  expect(host.textContent).toContain('active');
  video.currentTime++;
  await act(async () => vi.advanceTimersByTimeAsync(gestureConfig.workerInferenceTimeoutMs + 100));
  expect(host.textContent).toContain('loading');
  await act(async () => vi.advanceTimersByTimeAsync(gestureConfig.workerRetryDelayMs));
  expect(FakeWorker.instances).toHaveLength(4);
});

it('oferece orientação de instalação quando o modelo está ausente', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => host.querySelector('button')!.click());
  const message =
    'Não foi possível carregar o modelo de gestos (HTTP 404). Execute npm run setup:gesture-model.';
  await act(async () =>
    FakeWorker.instances[0]!.reply({ type: 'error', reason: 'model', message }),
  );
  expect(host.querySelector('[role=alert]')?.textContent).toBe(message);
  expect(FakeWorker.instances[0]!.terminate).toHaveBeenCalledOnce();
});

it('ignora classificação de uma amostra antiga mesmo antes do timeout', async () => {
  const { worker, video } = await readyWorker();
  await act(async () => vi.advanceTimersByTimeAsync(50));
  await act(async () => worker.reply({ type: 'result', id: 1, detection: null, inferenceMs: 5 }));
  video.currentTime++;
  await act(async () => vi.advanceTimersByTimeAsync(100 + gestureConfig.maximumSampleGapMs + 1));
  const frame = worker.messages.at(-1);
  if (frame?.type !== 'frame') throw Error('Quadro esperado');
  const rest = Math.ceil((performance.now() - frame.timestamp) / 2);
  await act(async () =>
    worker.reply({
      type: 'result',
      id: 2,
      detection: { name: 'Open_Palm', score: 1 },
      inferenceMs: 800,
    }),
  );
  expect(host.querySelector('[data-gesture]')?.getAttribute('data-gesture')).toBe('');
  expect(host.textContent).toContain('active');
  expect(worker.terminate).not.toHaveBeenCalled();
  video.currentTime++;
  await act(async () => vi.advanceTimersByTimeAsync(rest - 1));
  expect(createImageBitmap).toHaveBeenCalledTimes(2);
  await act(async () => vi.advanceTimersByTimeAsync(1));
  expect(createImageBitmap).toHaveBeenCalledTimes(3);
});

it('descarta resultado de outro estado e identificador incorreto', async () => {
  const { worker, video } = await readyWorker();
  await act(async () => vi.advanceTimersByTimeAsync(50));
  await act(async () => worker.reply({ type: 'result', id: 1, detection: null, inferenceMs: 5 }));
  video.currentTime++;
  await act(async () => vi.advanceTimersByTimeAsync(100));
  await act(async () => root.render(<Harness phase="review" />));
  for (const id of [999, 2]) {
    await act(async () =>
      worker.reply({
        type: 'result',
        id,
        detection: { name: 'Thumb_Up', score: 1 },
        inferenceMs: 5,
      }),
    );
  }
  expect(host.querySelector('[data-gesture]')?.getAttribute('data-gesture')).toBe('');
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
  await act(async () => vi.advanceTimersByTimeAsync(100));
  await act(async () => host.querySelector('button')!.click());
  await act(async () => host.querySelector('button')!.click());
  await act(async () => resolve(frame));
  expect(frame.close).toHaveBeenCalledOnce();
  expect(worker.messages.filter((message) => message.type === 'frame')).toHaveLength(0);
  expect(FakeWorker.instances).toHaveLength(2);
});

it.each([
  [false, 'Open_Palm', 'idle', 'start5'],
  [false, 'Victory', 'idle', 'start10'],
  [true, 'Victory', 'idle', 'start10'],
  [false, 'Closed_Fist', 'countdown', 'cancel'],
  [false, 'Thumb_Up', 'review', 'confirm'],
] as const)(
  'controla comandos com observação %s, gesto %s, fase %s',
  async (observe, name, phase, command) => {
    const { worker, video } = await readyWorker();
    await act(async () => root.render(<Harness phase={phase} />));
    if (observe) await act(async () => host.querySelectorAll('button')[1]!.click());
    const frames = command === 'cancel' ? 11 : 6;
    for (let i = 0; i < frames; i++) {
      video.currentTime++;
      await act(async () => vi.advanceTimersByTimeAsync(100));
      const message = worker.messages.at(-1);
      if (message?.type !== 'frame') throw Error('Quadro esperado');
      await act(async () =>
        worker.reply({
          type: 'result',
          id: message.id,
          inferenceMs: 5,
          detection: { name, score: 0.92 },
        }),
      );
    }
    expect(onCommand.mock.calls).toEqual(observe ? [] : [[command]]);
    expect(host.textContent).toContain('Mão detectada');
    if (observe) {
      expect(host.textContent).toContain('Observação ativa · comandos pausados');
      expect(host.textContent).not.toContain('Gesto confirmado');
    } else {
      expect(host.textContent).toContain('Gesto confirmado');
      const nextPhase =
        command === 'cancel'
          ? 'idle'
          : command === 'confirm'
            ? 'confirmed'
            : command === 'start5'
              ? 'capturing'
              : 'countdown';
      const message = {
        start5: 'Captura imediata iniciada',
        start10: 'Contagem de 10 s iniciada',
        cancel: 'Contagem cancelada',
        confirm: 'Foto confirmada',
      }[command];
      await act(async () => root.render(<Harness phase={nextPhase} />));
      expect(host.textContent).toContain(` · ${message}`);
      await act(async () => vi.advanceTimersByTimeAsync(gestureConfig.commandFeedbackMs));
      expect(host.textContent).not.toContain('Gesto confirmado');
    }
  },
);
