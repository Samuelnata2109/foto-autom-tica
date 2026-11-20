import type { CapturedPhoto } from '../types/photo';

const framePath = '../assets/frames/feira-das-profissoes.png';
const frames = import.meta.glob<string>('../assets/frames/feira-das-profissoes.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export async function composePhoto(
  original: CapturedPhoto,
  signal: AbortSignal,
  frameUrl = frames[framePath],
): Promise<CapturedPhoto | null> {
  if (!frameUrl) return null;
  let frame: ImageBitmap | undefined;
  let photo: ImageBitmap | undefined;
  let canvas: HTMLCanvasElement | undefined;
  try {
    const response = await fetch(frameUrl, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    });
    if (!response.ok) throw new Error('Não foi possível carregar a moldura oficial.');
    frame = await createImageBitmap(await response.blob());
    if (!frame.width || !frame.height || frame.width * 9 !== frame.height * 16) {
      throw new Error('A moldura oficial precisa ter proporção 16:9.');
    }
    signal.throwIfAborted();
    photo = await createImageBitmap(original.blob);
    signal.throwIfAborted();

    const cropWidth = Math.min(photo.width, (photo.height * 16) / 9);
    const cropHeight = (cropWidth * 9) / 16;
    // Keep the frame's resolution or the source crop's resolution, whichever is higher.
    const units = Math.max(frame.width / 16, Math.ceil(cropWidth / 16));
    const width = units * 16;
    const height = units * 9;
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas indisponível.');
    context.drawImage(
      photo,
      (photo.width - cropWidth) / 2,
      (photo.height - cropHeight) / 2,
      cropWidth,
      cropHeight,
      0,
      0,
      width,
      height,
    );
    context.globalCompositeOperation = 'source-over';
    context.drawImage(frame, 0, 0, width, height);
    const output = canvas;
    const blob = await new Promise<Blob | null>((resolve) =>
      output.toBlob(resolve, 'image/jpeg', 0.95),
    );
    signal.throwIfAborted();
    if (!blob?.size || blob.type !== 'image/jpeg')
      throw new Error('Não foi possível gerar o JPEG.');
    return { blob, width, height };
  } finally {
    frame?.close();
    photo?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
