import { createGestureRecognizer, detectGesture } from '../services/gestureRecognizer';
import type { GestureWorkerRequest, GestureWorkerResponse } from '../types/gesture';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';

let recognizer: GestureRecognizer | null = null;
const send = (message: GestureWorkerResponse) => self.postMessage(message);

self.onmessage = async (event: MessageEvent<GestureWorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      const startedAt = performance.now();
      recognizer = await createGestureRecognizer(message.wasmRoot, message.modelUrl);
      // Warm the graph under the initialization deadline before accepting live frames.
      const warmup = new OffscreenCanvas(32, 32);
      warmup.getContext('2d')?.fillRect(0, 0, 32, 32);
      recognizer.recognizeForVideo(warmup, 0);
      send({ type: 'ready', startupMs: performance.now() - startedAt });
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
    });
  }
};
