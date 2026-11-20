// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { composePhoto } from '../src/services/photoComposition';

const png = new Blob(['frame'], { type: 'image/png' });
const original = {
  blob: new Blob(['original'], { type: 'image/jpeg' }),
  width: 4000,
  height: 3000,
};
const jpeg = new Blob(['composed'], { type: 'image/jpeg' });
const frame = { width: 1920, height: 1080, close: vi.fn() };
const photo = { width: 4000, height: 3000, close: vi.fn() };
const context = { drawImage: vi.fn(), globalCompositeOperation: '' };
const signal = new AbortController().signal;
let canvas: HTMLCanvasElement;

beforeEach(() => {
  canvas = document.createElement('canvas');
  vi.spyOn(document, 'createElement').mockReturnValue(canvas);
  vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(canvas, 'toBlob').mockImplementation((callback, type, quality) => {
    expect([canvas.width, canvas.height, type, quality]).toEqual([4000, 2250, 'image/jpeg', 0.95]);
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

it('recorta ao centro sem inverter a foto, sobrepõe o PNG com alpha e mantém o original', async () => {
  const saved = { ...original };
  const result = await composePhoto(original, signal, '/frame.png');
  expect(result).toEqual({ blob: jpeg, width: 4000, height: 2250 });
  expect(original).toEqual(saved);
  expect(createImageBitmap).toHaveBeenNthCalledWith(2, saved.blob);
  expect(context.drawImage.mock.calls).toEqual([
    [photo, 0, 375, 4000, 2250, 0, 0, 4000, 2250],
    [frame, 0, 0, 4000, 2250],
  ]);
  expect(context.globalCompositeOperation).toBe('source-over');
  expect(frame.close).toHaveBeenCalledOnce();
  expect(photo.close).toHaveBeenCalledOnce();
  expect([canvas.width, canvas.height]).toEqual([0, 0]);
});

it('permite usar a foto original quando a URL da moldura está ausente', async () => {
  await expect(composePhoto(original, signal, '')).resolves.toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  expect(createImageBitmap).not.toHaveBeenCalled();
});

it('rejeita falha HTTP ao carregar a moldura', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
  await expect(composePhoto(original, signal, '/frame.png')).rejects.toThrow('carregar');
  expect(createImageBitmap).not.toHaveBeenCalled();
});

it('fecha a moldura se a decodificação da foto falhar', async () => {
  vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error('PNG corrompido'));
  await expect(composePhoto(original, signal, '/frame.png')).rejects.toThrow('corrompido');
  expect(context.drawImage).not.toHaveBeenCalled();
  vi.mocked(createImageBitmap).mockResolvedValueOnce(frame as unknown as ImageBitmap);
  vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error('JPEG corrompido'));
  await expect(composePhoto(original, signal, '/frame.png')).rejects.toThrow('corrompido');
  expect(frame.close).toHaveBeenCalledOnce();
});

it('libera canvas e imagens mesmo se o JPEG não puder ser codificado', async () => {
  vi.mocked(canvas.toBlob).mockImplementationOnce((callback) => callback(null));
  await expect(composePhoto(original, signal, '/frame.png')).rejects.toThrow('JPEG');
  expect(frame.close).toHaveBeenCalledOnce();
  expect(photo.close).toHaveBeenCalledOnce();
  expect([canvas.width, canvas.height]).toEqual([0, 0]);
});
