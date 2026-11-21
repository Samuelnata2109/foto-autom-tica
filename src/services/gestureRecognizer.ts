import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { handGeometry, supportsThumb, thumbMetrics } from './handGeometry';
import type { GestureDelegate, GestureDetection } from '../types/gesture';
import { gestureConfig } from '../config/gestureConfig';

export class GestureModelLoadError extends Error {}

export async function createGestureRecognizer(
  wasmRoot: string,
  modelUrl: string,
  warmup: OffscreenCanvas,
) {
  let model: Uint8Array<ArrayBuffer>;
  try {
    const response = await fetch(modelUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (response.headers.get('content-type')?.startsWith('text/html'))
      throw new Error('o servidor retornou uma página HTML');
    model = new Uint8Array(await response.arrayBuffer());
    if (model.length === 0) throw new Error('o arquivo está vazio');
  } catch (cause) {
    const detail = cause instanceof Error ? ` (${cause.message})` : '';
    throw new GestureModelLoadError(
      `Não foi possível carregar o modelo de gestos${detail}. Em desenvolvimento, execute npm run setup:gesture-model.`,
    );
  }
  const files = await FilesetResolver.forVisionTasks(wasmRoot, true);
  async function initialize(delegate: GestureDelegate) {
    const recognizer = await GestureRecognizer.createFromOptions(files, {
      baseOptions: { modelAssetBuffer: model, delegate },
      runningMode: 'VIDEO',
      numHands: 1,
    });
    try {
      recognizer.recognizeForVideo(warmup, 0);
      return { recognizer, delegate };
    } catch (cause) {
      recognizer.close();
      throw cause;
    }
  }
  try {
    return await initialize('GPU');
  } catch {
    return initialize('CPU');
  }
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
