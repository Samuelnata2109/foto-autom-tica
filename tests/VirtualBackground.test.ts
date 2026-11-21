// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { softenSubjectMask } from '../src/services/subjectMask';
import { replaceBackground, type BackgroundResponse } from '../src/services/virtualBackground';
import {
  afterBackgroundVision,
  backgroundReserved,
  holdGestureWork,
} from '../src/services/visionActivity';

const original = { blob: new Blob(['photo'], { type: 'image/jpeg' }), width: 640, height: 480 };
const terminate = vi.fn();
const postMessage = vi.fn();
const workers: FakeWorker[] = [];
class FakeWorker {
  onmessage?: (event: { data: BackgroundResponse }) => void;
  terminate = terminate;
  postMessage = postMessage;
  constructor() {
    workers.push(this);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  workers.length = 0;
});

it('converte confiança em alfa suave e rejeita máscara sem pessoa', () => {
  const alpha = new Uint8ClampedArray(16);
  expect(softenSubjectMask(new Float32Array([0, 0.55, 0.99, 0.24]), alpha)).toBe(true);
  expect([alpha[3], alpha[7], alpha[11], alpha[15]]).toEqual([0, 128, 255, 0]);
  expect(softenSubjectMask(new Float32Array([0, 0.3]), alpha)).toBe(false);
});

it('aguarda os gestos em andamento e libera o worker ao concluir', async () => {
  vi.stubGlobal('Worker', FakeWorker);
  const finishGesture = holdGestureWork();
  const progress = vi.fn();
  const job = replaceBackground(original, 'data-center', new AbortController().signal, progress);
  expect(backgroundReserved()).toBe(true);
  expect(postMessage).not.toHaveBeenCalled();
  const restartGestures = vi.fn();
  afterBackgroundVision(restartGestures);
  expect(restartGestures).not.toHaveBeenCalled();
  finishGesture();
  await vi.waitFor(() => expect(postMessage).toHaveBeenCalledOnce());
  expect(postMessage.mock.calls[0]?.[0]).toMatchObject({
    original,
    assetUrl: expect.stringContaining('/backgrounds/data-center.webp'),
  });
  const worker = workers[0]!;
  worker.onmessage?.({ data: { type: 'progress', stage: 'segmenting' } });
  expect(progress).toHaveBeenCalledWith('segmenting');
  const result = { photo: original, frame: 'applied' } as const;
  worker.onmessage?.({ data: { type: 'done', result } });
  await expect(job).resolves.toEqual(result);
  expect(terminate).toHaveBeenCalledOnce();
  expect(backgroundReserved()).toBe(false);
  expect(restartGestures).toHaveBeenCalledOnce();
});

it.each(['cancelamento', 'falha'])('encerra e libera por %s', async (mode) => {
  vi.stubGlobal('Worker', FakeWorker);
  const control = new AbortController();
  const job = replaceBackground(original, 'ai-lab', control.signal, vi.fn());
  const rejection = expect(job).rejects.toThrow();
  if (mode === 'cancelamento') control.abort();
  else workers[0]?.onmessage?.({ data: { type: 'error', message: 'Modelo inválido' } });
  await rejection;
  expect(terminate).toHaveBeenCalledOnce();
  expect(backgroundReserved()).toBe(false);
});
