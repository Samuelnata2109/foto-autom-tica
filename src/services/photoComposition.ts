import type { CapturedPhoto } from '../types/photo';

const framePaths = {
  '16:9': '../assets/frames/feira-das-profissoes.png',
  '4:3': '../assets/frames/feira-das-profissoes-4x3.png',
};
const frames = import.meta.glob<string>(
  ['../assets/frames/feira-das-profissoes.png', '../assets/frames/feira-das-profissoes-4x3.png'],
  { eager: true, query: '?url', import: 'default' },
);

type FrameRatio = keyof typeof framePaths;
type CompositionResult =
  { frame: 'applied'; photo: CapturedPhoto } | { frame: 'missing' | 'unsupported' };

function ratioOf(width: number, height: number): FrameRatio | null {
  if (width <= 0 || height <= 0) return null;
  if (width * 9 === height * 16) return '16:9';
  if (width * 3 === height * 4) return '4:3';
  return null;
}

function officialFrameUrl(ratio: FrameRatio) {
  return frames[framePaths[ratio]];
}

export function selectOfficialFrame(width: number, height: number) {
  const ratio = ratioOf(width, height);
  return ratio ? officialFrameUrl(ratio) : undefined;
}

export async function loadOfficialFrame(
  width: number,
  height: number,
  signal?: AbortSignal,
  resolveFrameUrl: (ratio: FrameRatio) => string | undefined = officialFrameUrl,
): Promise<{ frame: 'applied'; bitmap: ImageBitmap } | { frame: 'missing' | 'unsupported' }> {
  const ratio = ratioOf(width, height);
  if (!ratio) return { frame: 'unsupported' };
  const url = resolveFrameUrl(ratio);
  if (!url) return { frame: 'missing' };
  const timeout = AbortSignal.timeout(5000);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error('Não foi possível carregar a moldura oficial.');
  const bitmap = await createImageBitmap(await response.blob());
  if (ratioOf(bitmap.width, bitmap.height) !== ratio || signal?.aborted) {
    bitmap.close();
    signal?.throwIfAborted();
    throw new Error('A proporção da moldura oficial não corresponde à da foto.');
  }
  return { frame: 'applied', bitmap };
}

export async function composePhoto(
  original: CapturedPhoto,
  signal: AbortSignal,
  resolveFrameUrl?: (ratio: FrameRatio) => string | undefined,
): Promise<CompositionResult> {
  const { width, height } = original;
  let frame: ImageBitmap | undefined;
  let photo: ImageBitmap | undefined;
  let canvas: HTMLCanvasElement | undefined;
  try {
    const layer = await loadOfficialFrame(width, height, signal, resolveFrameUrl);
    if (layer.frame !== 'applied') return layer;
    frame = layer.bitmap;
    signal.throwIfAborted();
    photo = await createImageBitmap(original.blob);
    signal.throwIfAborted();

    if (photo.width !== width || photo.height !== height)
      throw new Error('As dimensões da foto decodificada diferem das dimensões da captura.');
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas indisponível.');
    context.drawImage(photo, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.drawImage(frame, 0, 0, width, height);
    const output = canvas;
    const blob = await new Promise<Blob | null>((resolve) =>
      output.toBlob(resolve, 'image/jpeg', 0.95),
    );
    signal.throwIfAborted();
    if (!blob?.size || blob.type !== 'image/jpeg')
      throw new Error('Não foi possível gerar o JPEG.');
    return { frame: 'applied', photo: { blob, width, height } };
  } finally {
    frame?.close();
    photo?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
