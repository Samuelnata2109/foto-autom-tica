// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { composeStory, shareStory } from '../src/services/storyImage';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function canvasFixture(width: number, height: number) {
  const image = { width, height, close: vi.fn() };
  const drawImage = vi.fn();
  const fillRect = vi.fn();
  const input = new Blob(['foto com moldura'], { type: 'image/jpeg' });
  const decode = vi.fn().mockResolvedValue(image);
  vi.stubGlobal('createImageBitmap', decode);
  const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
    fillRect,
  } as unknown as CanvasRenderingContext2D);
  const encoded = vi.fn();
  const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
    type,
    quality,
  ) {
    encoded(this.width, this.height, type, quality);
    callback(new Blob(['story'], { type }));
  });
  return { image, drawImage, fillRect, input, decode, context, encoded, encode };
}

it.each([
  [1920, 1080],
  [640, 480],
  [1080, 1920],
])(
  'preserva a foto inteira e a moldura de %i × %i em um JPEG 1080 × 1920',
  async (width, height) => {
    const { image, drawImage, fillRect, input, decode, encoded } = canvasFixture(width, height);
    const file = await composeStory(input);
    expect(decode).toHaveBeenCalledExactlyOnceWith(input);
    expect(encoded).toHaveBeenCalledExactlyOnceWith(1080, 1920, 'image/jpeg', 0.94);
    expect(file).toMatchObject({ name: 'ai-photo-booth-story.jpg', type: 'image/jpeg' });
    expect(file).not.toBe(input);
    expect(drawImage).toHaveBeenCalledTimes(3);
    expect(fillRect).toHaveBeenCalledExactlyOnceWith(0, 0, 1080, 1920);
    const [source, x, y, drawnWidth, drawnHeight] = drawImage.mock.calls[2]!;
    expect(source).toBe(image);
    expect(drawnWidth / drawnHeight).toBeCloseTo(width / height);
    expect(x).toBeCloseTo((1080 - drawnWidth) / 2);
    expect(y).toBeCloseTo((1920 - drawnHeight) / 2);
    expect(x).toBeGreaterThanOrEqual(47.99);
    expect(y).toBeGreaterThanOrEqual(47.99);
    expect(drawImage.mock.calls[1]![0]).toMatchObject({ width: 0, height: 0 });
    expect(image.close).toHaveBeenCalledOnce();
  },
);

it('libera a imagem quando o contexto 2D ou o JPEG falham', async () => {
  const missing = canvasFixture(640, 480);
  missing.context.mockReturnValueOnce(null);
  await expect(composeStory(missing.input)).rejects.toThrow(/preparar a imagem/);
  expect(missing.image.close).toHaveBeenCalledOnce();
  vi.restoreAllMocks();
  const encoder = canvasFixture(640, 480);
  encoder.encode.mockImplementationOnce((callback) => callback(null));
  await expect(composeStory(encoder.input)).rejects.toThrow(/gerar o JPEG/);
  expect(encoder.image.close).toHaveBeenCalledOnce();
});

it('libera bitmap e canvases ao cancelar enquanto o navegador ainda codifica o JPEG', async () => {
  const { image, input, encode, drawImage } = canvasFixture(640, 480);
  const controller = new AbortController();
  let finish!: BlobCallback;
  encode.mockImplementationOnce((callback) => {
    finish = callback;
  });

  const result = composeStory(input, controller.signal);
  const check = expect(result).rejects.toMatchObject({ name: 'AbortError' });
  await Promise.resolve();
  expect(encode).toHaveBeenCalledOnce();
  const canvas = encode.mock.contexts[0];
  controller.abort();
  await check;
  expect(image.close).toHaveBeenCalledOnce();
  expect(canvas).toMatchObject({ width: 0, height: 0 });
  expect(drawImage.mock.calls[1]![0]).toMatchObject({ width: 0, height: 0 });
  finish(new Blob(['story'], { type: 'image/jpeg' }));
  expect(image.close).toHaveBeenCalledOnce();
});

it('entrega somente o arquivo ao compartilhamento nativo', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  const canShare = vi.fn().mockReturnValue(true);
  vi.stubGlobal('navigator', { share, canShare });
  const file = new File(['story'], 'story.jpg', { type: 'image/jpeg' });
  await expect(shareStory(file)).resolves.toBe('handed-off');
  expect(canShare).toHaveBeenCalledExactlyOnceWith({ files: [file] });
  expect(share).toHaveBeenCalledExactlyOnceWith({ files: [file] });
});

it('permite o download quando a API falta ou recusa o arquivo', async () => {
  const file = new File(['story'], 'story.jpg');
  vi.stubGlobal('navigator', {});
  await expect(shareStory(file)).resolves.toBe('unavailable');
  const share = vi.fn();
  vi.stubGlobal('navigator', { share, canShare: () => false });
  await expect(shareStory(file)).resolves.toBe('unavailable');
  expect(share).not.toHaveBeenCalled();
});

it.each([
  ['AbortError', 'cancelled'],
  ['NotAllowedError', 'failed'],
] as const)('interpreta a rejeição de compartilhamento %s', async (name, result) => {
  vi.stubGlobal('navigator', {
    share: vi.fn().mockRejectedValue(new DOMException('', name)),
    canShare: () => true,
  });
  await expect(shareStory(new File(['story'], 'story.jpg'))).resolves.toBe(result);
});
