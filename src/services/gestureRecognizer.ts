import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { handGeometry, supportsThumb, thumbMetrics } from './handGeometry';
import type { GestureDetection } from '../types/gesture';

export async function createGestureRecognizer(wasmRoot: string, modelUrl: string) {
  const files = await FilesetResolver.forVisionTasks(wasmRoot, true);
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
  const imageLandmarks = result.landmarks[0];
  const landmarks = result.worldLandmarks[0] ?? [];
  if (!imageLandmarks?.length && !landmarks.length) return null;
  const raw = category?.categoryName ?? 'None',
    rawScore = category?.score ?? 0;
  const metrics = raw === 'Thumb_Up' ? thumbMetrics(landmarks) : null;
  const geometry =
    raw === 'Thumb_Up' && supportsThumb(metrics) ? 'Thumb_Up' : handGeometry(landmarks);
  const agreement = geometry === raw;
  const conflict = geometry !== null && !agreement;
  return {
    name: conflict ? 'None' : raw,
    score: rawScore,
    raw,
    rawScore,
    geometry,
    thumbMetrics: metrics,
    points: overlay ? imageLandmarks : undefined,
  };
}
