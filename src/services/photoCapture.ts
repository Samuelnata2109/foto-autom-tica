import type { CapturedPhoto } from '../types/photo';

export function checkPhotoSource(
  video: HTMLVideoElement | null,
  stream: MediaStream | null,
): asserts video is HTMLVideoElement {
  if (!video || !stream || video.srcObject !== stream) {
    throw new Error('Câmera indisponível. Reconecte a câmera e tente novamente.');
  }
  const track = stream.getVideoTracks()[0];
  if (track?.readyState !== 'live') {
    throw new Error('Câmera indisponível. Reconecte a câmera e tente novamente.');
  }
  if (track.muted || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    throw new Error('O vídeo ainda não está pronto. Aguarde a prévia e tente novamente.');
  }
  if (![video.videoWidth, video.videoHeight].every((size) => Number.isInteger(size) && size > 0)) {
    throw new Error('O vídeo não informou dimensões válidas. Reinicie a câmera e tente novamente.');
  }
}

export async function captureFrame(
  video: HTMLVideoElement | null,
  stream: MediaStream | null,
): Promise<CapturedPhoto> {
  checkPhotoSource(video, stream);
  const { videoWidth: width, videoHeight: height } = video;
  const canvas = document.createElement('canvas');
  try {
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível iniciar o Canvas. Tente novamente.');
    try {
      context.drawImage(video, 0, 0, width, height);
    } catch (cause) {
      throw new Error('Não foi possível ler o quadro da câmera. Tente novamente.', { cause });
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.95),
    ).catch((cause: unknown) => {
      throw new Error('Não foi possível gerar a foto em JPEG. Tente novamente.', { cause });
    });
    if (!blob?.size || blob.type !== 'image/jpeg') {
      throw new Error('Não foi possível gerar a foto em JPEG. Tente novamente.');
    }
    return { blob, width, height };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
