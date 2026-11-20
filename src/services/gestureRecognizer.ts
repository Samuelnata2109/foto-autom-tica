import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import type { GestureDetection } from '../types/gesture';

export async function createGestureRecognizer(wasmRoot: string, modelUrl: string) {
  const files = await FilesetResolver.forVisionTasks(wasmRoot);
  return GestureRecognizer.createFromOptions(files, {
    baseOptions: { modelAssetPath: modelUrl, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numHands: 1,
  });
}

export function detectGesture(
  recognizer: GestureRecognizer,
  frame: ImageBitmap,
  timestamp: number,
): GestureDetection {
  const category = recognizer.recognizeForVideo(frame, timestamp).gestures[0]?.[0];
  return category ? { name: category.categoryName, score: category.score } : null;
}
