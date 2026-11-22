import {
  createGestureRecognizer,
  detectGesture,
  GestureModelLoadError,
} from '../services/gestureRecognizer';
import type { GestureWorkerRequest, GestureWorkerResponse } from '../types/gesture';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';

let recognizer: GestureRecognizer | null = null;
const send = (message: GestureWorkerResponse) => self.postMessage(message);

self.onmessage = async (event: MessageEvent<GestureWorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      const startedAt = performance.now();
      // Warm the graph under the initialization deadline before accepting live frames.
      const warmup = new OffscreenCanvas(32, 32);
      warmup.getContext('2d')?.fillRect(0, 0, 32, 32);
      const initialized = await createGestureRecognizer(message.wasmRoot, message.modelUrl, warmup);
      recognizer = initialized.recognizer;
      send({
        type: 'ready',
        startupMs: performance.now() - startedAt,
        delegate: initialized.delegate,
      });
    } else {
      try {
        if (!recognizer) throw new Error('Modelo ainda não carregado.');
        send({ type: 'started', id: message.id });
        const startedAt = performance.now();
        const detection = detectGesture(
          recognizer,
          message.frame,
          message.timestamp,
          message.overlay,
        );
        send({
          type: 'result',
          id: message.id,
          detection,
          inferenceMs: performance.now() - startedAt,
        });
      } finally {
        message.frame.close();
      }
    }
  } catch (error) {
    send({
      type: 'error',
      message: error instanceof Error ? error.message : 'Falha na inferência.',
      reason: error instanceof GestureModelLoadError ? 'model' : undefined,
    });
  }
};
