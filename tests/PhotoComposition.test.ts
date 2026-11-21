// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { composePhoto } from '../src/services/photoComposition';

const png = new Blob(['frame'], { type: 'image/png' });
const originalBlob = new Blob(['original'], { type: 'image/jpeg' });
const jpeg = new Blob(['composed'], { type: 'image/jpeg' });
const frame = { width: 640, height: 480, close: vi.fn() };
const photo = { width: 640, height: 480, close: vi.fn() };
const context = { drawImage: vi.fn(), globalCompositeOperation: '' };
const signal = new AbortController().signal;
let canvas: HTMLCanvasElement;

function capture(width = 640, height = 480) {
  Object.assign(photo, { width, height });
  return { blob: originalBlob, width, height };
}

beforeEach(() => {
  Object.assign(frame, { width: 640, height: 480 });
  canvas = document.createElement('canvas');
  vi.spyOn(document, 'createElement').mockReturnValue(canvas);
  vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(canvas, 'toBlob').mockImplementation((callback, type, quality) => {
    expect([canvas.width, canvas.height, type, quality]).toEqual([
      photo.width,
      photo.height,
      'image/jpeg',
      0.95,
    ]);
    callback(jpeg);
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => png }));
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockImplementation(async (blob) => (blob === png ? frame : photo)),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it.each([
  [1920, 1080, 1920, 1080, 'feira-das-profissoes.png'],
  [640, 480, 640, 480, 'feira-das-profissoes-4x3.png'],
  [1600, 1200, 640, 480, 'feira-das-profissoes-4x3.png'],
  [3840, 2160, 1920, 1080, 'feira-das-profissoes.png'],
])(
  'seleciona a arte para %i × %i e preserva a captura inteira',
  async (width, height, frameWidth, frameHeight, file) => {
    Object.assign(frame, { width: frameWidth, height: frameHeight });
    const original = capture(width, height);
    const result = await composePhoto(original, signal);
    expect(result).toEqual({ frame: 'applied', photo: { blob: jpeg, width, height } });
    expect(original).toEqual({ blob: originalBlob, width, height });
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('/' + file),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(createImageBitmap).toHaveBeenNthCalledWith(2, originalBlob);
    expect(context.drawImage.mock.calls).toEqual([
      [photo, 0, 0],
      [frame, 0, 0, width, height],
    ]);
    expect(context.globalCompositeOperation).toBe('source-over');
    expect(frame.close).toHaveBeenCalledOnce();
    expect(photo.close).toHaveBeenCalledOnce();
    expect([canvas.width, canvas.height]).toEqual([0, 0]);
  },
);

it.each([
  [640, 480, '4:3'],
  [1920, 1080, '16:9'],
] as const)(
  'avisa quando a moldura correspondente a %i × %i está ausente',
  async (width, height, ratio) => {
    const resolveFrame = vi.fn((requested: string) =>
      requested === ratio ? undefined : '/other.png',
    );
    await expect(composePhoto(capture(width, height), signal, resolveFrame)).resolves.toEqual({
      frame: 'missing',
    });
    expect(resolveFrame).toHaveBeenCalledExactlyOnceWith(ratio);
    expect(fetch).not.toHaveBeenCalled();
    expect(createImageBitmap).not.toHaveBeenCalled();
  },
);

it.each([
  [1080, 1920],
  [1280, 800],
  [854, 480],
])(
  'mantém a foto %i × %i sem tentar recortar para uma proporção próxima',
  async (width, height) => {
    await expect(composePhoto(capture(width, height), signal)).resolves.toEqual({
      frame: 'unsupported',
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(canvas.toBlob).not.toHaveBeenCalled();
  },
);

it('rejeita falha HTTP ao carregar a moldura 4:3', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
  await expect(composePhoto(capture(), signal)).rejects.toThrow('carregar');
  expect(createImageBitmap).not.toHaveBeenCalled();
});

it('rejeita uma moldura com proporção incompatível em vez de esticá-la', async () => {
  Object.assign(frame, { width: 1920, height: 1080 });
  await expect(composePhoto(capture(), signal)).rejects.toThrow('proporção');
  expect(frame.close).toHaveBeenCalledOnce();
  expect(context.drawImage).not.toHaveBeenCalled();
});

it('fecha a moldura se a decodificação da foto falhar', async () => {
  vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error('PNG corrompido'));
  await expect(composePhoto(capture(), signal)).rejects.toThrow('corrompido');
  expect(context.drawImage).not.toHaveBeenCalled();
  vi.mocked(createImageBitmap).mockResolvedValueOnce(frame as unknown as ImageBitmap);
  vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error('JPEG corrompido'));
  await expect(composePhoto(capture(), signal)).rejects.toThrow('corrompido');
  expect(frame.close).toHaveBeenCalledOnce();
});

it('libera canvas e imagens mesmo se o JPEG não puder ser codificado', async () => {
  vi.mocked(canvas.toBlob).mockImplementationOnce((callback) => callback(null));
  await expect(composePhoto(capture(), signal)).rejects.toThrow('JPEG');
  expect(frame.close).toHaveBeenCalledOnce();
  expect(photo.close).toHaveBeenCalledOnce();
  expect([canvas.width, canvas.height]).toEqual([0, 0]);
});
