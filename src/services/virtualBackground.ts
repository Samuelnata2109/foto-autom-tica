import type { CapturedPhoto, SessionPhoto } from '../types/photo';
import { withBackgroundVision } from './visionActivity';

export const scenarios = [
  { id: 'original', label: 'Fundo original' },
  { id: 'ai-lab', label: 'Laboratório de Inteligência Artificial' },
  { id: 'data-center', label: 'Centro de dados' },
  { id: 'neural-networks', label: 'Redes Neurais' },
  { id: 'robotics', label: 'Laboratório de Robótica' },
] as const;

export type Scenario = (typeof scenarios)[number]['id'];
export type VirtualScenario = Exclude<Scenario, 'original'>;
export type BackgroundProgress = 'loading' | 'segmenting' | 'composing';
export type BackgroundRequest = { original: CapturedPhoto; assetUrl: string; root: string };
export type BackgroundResult = { photo: CapturedPhoto; frame: SessionPhoto['frame'] };
export type BackgroundResponse =
  | { type: 'progress'; stage: BackgroundProgress }
  | { type: 'done'; result: BackgroundResult }
  | { type: 'error'; message: string };

export async function replaceBackground(
  original: CapturedPhoto,
  scenario: VirtualScenario,
  signal: AbortSignal,
  onProgress: (stage: BackgroundProgress) => void,
): Promise<BackgroundResult> {
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(25000)]);
  return withBackgroundVision(
    deadline,
    () =>
      new Promise<BackgroundResult>((resolve, reject) => {
        const worker = new Worker(
          new URL('../workers/virtualBackground.worker.ts', import.meta.url),
          { type: 'module' },
        );
        const stop = () => {
          deadline.removeEventListener('abort', abort);
          worker.terminate();
        };
        const abort = () => {
          stop();
          reject(deadline.reason);
        };
        deadline.addEventListener('abort', abort, { once: true });
        const fail = (message: string) => {
          stop();
          reject(new Error(message));
        };
        worker.onerror = () => fail('O worker de cenários não pôde ser executado.');
        worker.onmessageerror = () => fail('O worker retornou uma resposta inválida.');
        worker.onmessage = ({ data }: MessageEvent<BackgroundResponse>) => {
          if (data.type === 'progress') onProgress(data.stage);
          else if (data.type === 'error') fail(data.message);
          else {
            stop();
            resolve(data.result);
          }
        };
        const root = new URL(import.meta.env.BASE_URL, document.baseURI).href;
        try {
          worker.postMessage({
            original,
            root,
            assetUrl: new URL(`backgrounds/${scenario}.webp`, root).href,
          } satisfies BackgroundRequest);
        } catch {
          fail('Não foi possível iniciar o processamento da foto.');
        }
      }),
  );
}
