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

export async function composePhoto(
  original: CapturedPhoto,
  signal: AbortSignal,
  resolveFrameUrl: (ratio: FrameRatio) => string | undefined = (ratio) => frames[framePaths[ratio]],
): Promise<CompositionResult> {
  const { width, height } = original;
  const ratio = ratioOf(width, height);
  if (!ratio) return { frame: 'unsupported' };
  const frameUrl = resolveFrameUrl(ratio);
  if (!frameUrl) return { frame: 'missing' };
  let frame: ImageBitmap | undefined;
  let photo: ImageBitmap | undefined;
  let canvas: HTMLCanvasElement | undefined;
  try {
    const response = await fetch(frameUrl, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    });
    if (!response.ok) throw new Error('Não foi possível carregar a moldura oficial.');
    frame = await createImageBitmap(await response.blob());
    if (ratioOf(frame.width, frame.height) !== ratio) {
      throw new Error('A proporção da moldura oficial não corresponde à da foto.');
    }
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
