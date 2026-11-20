import { createGestureRecognizer, detectGesture } from '../services/gestureRecognizer';
import type { GestureWorkerRequest, GestureWorkerResponse } from '../types/gesture';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';

let recognizer: GestureRecognizer | null = null;
const send = (message: GestureWorkerResponse) => self.postMessage(message);

self.onmessage = async (event: MessageEvent<GestureWorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      recognizer = await createGestureRecognizer(message.wasmRoot, message.modelUrl, true);
      // Warm the graph under the initialization deadline before accepting live frames.
      const warmup = new OffscreenCanvas(32, 32);
      warmup.getContext('2d')?.fillRect(0, 0, 32, 32);
      recognizer.recognizeForVideo(warmup, 0);
      send({ type: 'ready' });
    } else {
      try {
        if (!recognizer) throw new Error('Modelo ainda não carregado.');
        send({
          type: 'result',
          id: message.id,
          detection: detectGesture(recognizer, message.frame, message.timestamp, message.overlay),
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
