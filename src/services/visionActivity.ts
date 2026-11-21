// The booth owns one capture at a time. Block new gesture work during segmentation.
const gestureWork = new Set<Promise<void>>();
const afterBackground = new Set<() => void>();
let reserved = false;

export const backgroundReserved = () => reserved;

export function holdGestureWork() {
  let release!: () => void;
  const work = new Promise<void>((resolve) => {
    release = resolve;
  });
  gestureWork.add(work);
  return () => {
    gestureWork.delete(work);
    release();
  };
}

export function afterBackgroundVision(callback: () => void) {
  if (reserved) afterBackground.add(callback);
  else callback();
  return () => afterBackground.delete(callback);
}

export async function withBackgroundVision<T>(signal: AbortSignal, work: () => Promise<T>) {
  signal.throwIfAborted();
  if (reserved) throw new Error('Já existe uma composição em andamento.');
  reserved = true;
  let cancel: (() => void) | undefined;
  try {
    if (gestureWork.size) {
      const interrupted = new Promise<never>((_, reject) => {
        cancel = () => reject(signal.reason);
        signal.addEventListener('abort', cancel, { once: true });
      });
      await Promise.race([Promise.all(gestureWork), interrupted]);
    }
    signal.throwIfAborted();
    return await work();
  } finally {
    if (cancel) signal.removeEventListener('abort', cancel);
    reserved = false;
    const waiting = [...afterBackground];
    afterBackground.clear();
    waiting.forEach((callback) => callback());
  }
}
