import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { handGeometry } from './handGeometry';
import type { GestureDetection } from '../types/gesture';

export async function createGestureRecognizer(
  wasmRoot: string,
  modelUrl: string,
  moduleWorker = false,
) {
  const files = await FilesetResolver.forVisionTasks(wasmRoot, moduleWorker);
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
  overlay = false,
): GestureDetection {
  const result = recognizer.recognizeForVideo(frame, timestamp);
  const category = result.gestures[0]?.[0];
  if (!category && !result.landmarks[0]) return null;
  const raw = category?.categoryName ?? 'None',
    rawScore = category?.score ?? 0;
  const geometry = handGeometry(result.worldLandmarks[0] ?? []);
  const agreement = geometry === raw;
  const conflict = geometry !== null && !agreement;
  return {
    name: conflict ? 'None' : raw,
    score: rawScore,
    raw,
    rawScore,
    geometry,
    points: overlay ? result.landmarks[0] : undefined,
  };
}
