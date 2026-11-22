const width = 1080;
const height = 1920;
const margin = 48;

export async function composeStory(photo: Blob): Promise<File> {
  const canvas = document.createElement('canvas');
  const background = document.createElement('canvas');
  const image = await createImageBitmap(photo);
  try {
    canvas.width = width;
    canvas.height = height;
    background.width = 36;
    background.height = 64;
    const context = canvas.getContext('2d');
    const soft = background.getContext('2d');
    if (!context || !soft || !image.width || !image.height) {
      throw new Error('Não foi possível preparar a imagem do Story.');
    }
    // A small, smoothed intermediate image softens the background on Safari and Chrome.
    const cover = Math.max(background.width / image.width, background.height / image.height);
    const coverWidth = image.width * cover;
    const coverHeight = image.height * cover;
    soft.imageSmoothingQuality = 'high';
    soft.drawImage(
      image,
      (background.width - coverWidth) / 2,
      (background.height - coverHeight) / 2,
      coverWidth,
      coverHeight,
    );
    context.imageSmoothingQuality = 'high';
    context.drawImage(background, 0, 0, width, height);
    context.fillStyle = 'rgba(0, 0, 0, 0.35)';
    context.fillRect(0, 0, width, height);

    const contain = Math.min(
      (width - 2 * margin) / image.width,
      (height - 2 * margin) / image.height,
    );
    const photoWidth = image.width * contain;
    const photoHeight = image.height * contain;
    context.drawImage(
      image,
      (width - photoWidth) / 2,
      (height - photoHeight) / 2,
      photoWidth,
      photoHeight,
    );

    const jpeg = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob?.type === 'image/jpeg' && blob.size) resolve(blob);
          else reject(new Error('Não foi possível gerar o JPEG do Story.'));
        },
        'image/jpeg',
        0.94,
      );
    });
    return new File([jpeg], 'ai-photo-booth-story.jpg', { type: jpeg.type });
  } finally {
    image.close();
    canvas.width = canvas.height = 0;
    background.width = background.height = 0;
  }
}

export function downloadJpeg(image: Blob, filename: string) {
  const url = URL.createObjectURL(image);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function shareStory(file: File) {
  const data = { files: [file] };
  try {
    if (typeof navigator.share !== 'function' || !navigator.canShare?.(data)) return 'unavailable';
    await navigator.share(data);
    return 'handed-off';
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
