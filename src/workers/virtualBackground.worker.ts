import {
  FilesetResolver,
  ImageSegmenter,
  type ImageSegmenterResult,
} from '@mediapipe/tasks-vision';
import { loadOfficialFrame } from '../services/photoComposition';
import { softenSubjectMask } from '../services/subjectMask';
import type {
  BackgroundRequest,
  BackgroundResponse,
  BackgroundResult,
} from '../services/virtualBackground';

const send = (message: BackgroundResponse) => self.postMessage(message);

async function render({ original, root, assetUrl }: BackgroundRequest): Promise<BackgroundResult> {
  const { width, height } = original;
  const canvas = new OffscreenCanvas(width, height);
  const maskCanvas = new OffscreenCanvas(1, 1);
  let segmenter: ImageSegmenter | undefined;
  let input: ImageBitmap | undefined;
  let originalBitmap: ImageBitmap | undefined;
  let background: ImageBitmap | undefined;
  let frame: ImageBitmap | undefined;
  let result: ImageSegmenterResult | undefined;
  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas indisponível no worker.');
    const files = await FilesetResolver.forVisionTasks(new URL('mediapipe/wasm', root).href, true);
    segmenter = await ImageSegmenter.createFromOptions(files, {
      baseOptions: {
        modelAssetPath: new URL('models/selfie_segmenter.tflite', root).href,
        delegate: 'CPU',
      },
      runningMode: 'IMAGE',
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });
    send({ type: 'progress', stage: 'segmenting' });
    const scale = Math.min(1, 512 / Math.max(width, height));
    input = await createImageBitmap(original.blob, {
      resizeWidth: Math.max(1, Math.round(width * scale)),
      resizeHeight: Math.max(1, Math.round(height * scale)),
      resizeQuality: 'high',
    });
    result = segmenter.segment(input);
    const masks = result.confidenceMasks;
    const mask = masks?.[1] ?? masks?.[0];
    if (!mask) throw new Error('O modelo não retornou uma máscara de pessoa.');
    maskCanvas.width = mask.width;
    maskCanvas.height = mask.height;
    const maskContext = maskCanvas.getContext('2d');
    if (!maskContext) throw new Error('Canvas da máscara indisponível.');
    const matte = maskContext.createImageData(mask.width, mask.height);
    if (!softenSubjectMask(mask.getAsFloat32Array(), matte.data))
      throw new Error('Nenhuma pessoa detectada com confiança.');
    maskContext.putImageData(matte, 0, 0);
    result.close();
    result = undefined;
    input.close();
    input = undefined;
    segmenter.close();
    segmenter = undefined;

    send({ type: 'progress', stage: 'composing' });
    originalBitmap = await createImageBitmap(original.blob);
    const image = await fetch(assetUrl);
    if (!image.ok) throw new Error('Não foi possível carregar o cenário selecionado.');
    background = await createImageBitmap(await image.blob());
    context.imageSmoothingQuality = 'high';
    context.drawImage(originalBitmap, 0, 0);
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(maskCanvas, 0, 0, width, height);
    context.globalCompositeOperation = 'destination-over';
    const cover = Math.max(width / background.width, height / background.height);
    const bgWidth = background.width * cover;
    const bgHeight = background.height * cover;
    context.drawImage(
      background,
      (width - bgWidth) / 2,
      (height - bgHeight) / 2,
      bgWidth,
      bgHeight,
    );
    context.globalCompositeOperation = 'source-over';
    let frameStatus: BackgroundResult['frame'] = 'failed';
    try {
      const layer = await loadOfficialFrame(width, height);
      frameStatus = layer.frame;
      if (layer.frame === 'applied') frame = layer.bitmap;
    } catch {
      // Keep the replacement if the decorative frame is unavailable.
    }
    if (frame) context.drawImage(frame, 0, 0, width, height);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
    if (!blob.size || blob.type !== 'image/jpeg') throw new Error('Falha ao exportar o JPEG.');
    return { photo: { blob, width, height }, frame: frameStatus };
  } finally {
    result?.close();
    segmenter?.close();
    input?.close();
    originalBitmap?.close();
    background?.close();
    frame?.close();
    canvas.width = maskCanvas.width = 0;
    canvas.height = maskCanvas.height = 0;
  }
}

self.onmessage = async ({ data }: MessageEvent<BackgroundRequest>) => {
  try {
    send({ type: 'done', result: await render(data) });
  } catch (error) {
    send({
      type: 'error',
      message: error instanceof Error ? error.message : 'Falha na segmentação.',
    });
  }
};
