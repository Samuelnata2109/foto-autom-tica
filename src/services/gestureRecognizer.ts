import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { handGeometry, supportsThumb, thumbMetrics } from './handGeometry';
import type { GestureDetection } from '../types/gesture';
import { gestureConfig } from '../config/gestureConfig';

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
  let metrics = raw === 'Thumb_Up' ? thumbMetrics(landmarks) : null;
  let geometry =
    raw === 'Thumb_Up' && supportsThumb(metrics) ? 'Thumb_Up' : handGeometry(landmarks);
  let geometrySource: 'world' | 'image' | undefined = geometry ? 'world' : undefined;
  if (
    !geometry &&
    imageLandmarks?.length === 21 &&
    frame.width > 0 &&
    frame.height > 0 &&
    rawScore >= gestureConfig.imageGeometryConfidence &&
    Object.hasOwn(gestureConfig.supportedConfidence, raw)
  ) {
    // Image landmarks normalize x and y against different dimensions. Express both in frame widths.
    const aspect = frame.height / frame.width;
    const corrected = imageLandmarks.map(({ x, y, z }) => ({ x, y: y * aspect, z }));
    const imageMetrics = raw === 'Thumb_Up' ? thumbMetrics(corrected) : null;
    const imageGeometry = supportsThumb(imageMetrics) ? 'Thumb_Up' : handGeometry(corrected);
    if (imageGeometry === raw) {
      geometry = imageGeometry;
      geometrySource = 'image';
      metrics = imageMetrics;
    }
  }
  const agreement = geometry === raw;
  const conflict = geometry !== null && !agreement;
  return {
    name: conflict ? 'None' : raw,
    score: rawScore,
    raw,
    rawScore,
    geometry,
    geometrySource,
    thumbMetrics: metrics,
    points: overlay ? imageLandmarks : undefined,
  };
}
