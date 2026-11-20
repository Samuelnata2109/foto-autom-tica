import { useEffect, useRef, useState, type RefObject } from 'react';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';
import { gestureConfig } from '../config/gestureConfig';
import { GestureValidation } from '../services/gestureValidation';
import type {
  GestureCommand,
  GestureName,
  GesturePhase,
  GestureWorkerResponse,
} from '../types/gesture';

type Status = 'off' | 'loading' | 'active' | 'unavailable';
const root = import.meta.env.BASE_URL;

export function useGestureRecognition(
  videoRef: RefObject<HTMLVideoElement | null>,
  stream: MediaStream | null,
  cameraReady: boolean,
  phase: GesturePhase,
  onCommand: (command: GestureCommand) => void,
) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<Status>('off');
  const [error, setError] = useState('');
  const [gesture, setGesture] = useState<GestureName | null>(null);
  const [progress, setProgress] = useState(0);
  const [confirmed, setConfirmed] = useState<GestureName | null>(null);
  const validator = useRef(new GestureValidation());
  const latest = useRef({ phase, onCommand });
  latest.current = { phase, onCommand };
  const worker = useRef<Worker | null>(null);
  const fallback = useRef<GestureRecognizer | null>(null);
  const busy = useRef(false);
  const lastFrame = useRef(-1);
  const lastInference = useRef(-Infinity);
  const nextId = useRef(0);

  function clearFeedback(keepLatch = false) {
    validator.current.reset(keepLatch);
    setGesture(null);
    setProgress(0);
    setConfirmed(null);
  }

  useEffect(() => {
    clearFeedback(true);
  }, [phase]);

  useEffect(() => {
    clearFeedback();
    lastFrame.current = -1;
  }, [stream]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) clearFeedback();
      lastFrame.current = -1;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      setError('');
      return;
    }
    if (!cameraReady || !stream) {
      setStatus('unavailable');
      setError(
        'Aguarde a câmera ficar pronta para usar a IA. Os controles manuais continuam disponíveis.',
      );
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setError('');
    const onDetection = (detection: { name: string; score: number } | null) => {
      if (cancelled) return;
      busy.current = false;
      if (document.hidden || !['idle', 'countdown', 'review'].includes(latest.current.phase))
        return;
      const result = validator.current.update(detection, latest.current.phase, performance.now());
      setGesture(result.gesture);
      setProgress(result.progress);
      if (result.command) {
        setConfirmed(result.gesture);
        latest.current.onCommand(result.command);
      }
    };
    const useFallback = async () => {
      try {
        const { createGestureRecognizer } = await import('../services/gestureRecognizer');
        const recognizer = await createGestureRecognizer(
          `${root}mediapipe/wasm`,
          `${root}models/gesture_recognizer.task`,
        );
        if (cancelled) recognizer.close();
        else {
          fallback.current = recognizer;
          setStatus('active');
          setError('Worker indisponível. IA operando com frequência reduzida.');
        }
      } catch {
        if (!cancelled) {
          setStatus('unavailable');
          setError('Não foi possível carregar a IA. Use os controles manuais.');
        }
      }
    };
    try {
      if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined')
        throw new Error('Worker indisponível.');
      const instance = new Worker(
        new URL('../workers/gestureRecognition.worker.ts', import.meta.url),
        { type: 'module' },
      );
      worker.current = instance;
      instance.onmessage = (event: MessageEvent<GestureWorkerResponse>) => {
        if (cancelled || worker.current !== instance) return;
        if (event.data.type === 'ready') setStatus('active');
        else if (event.data.type === 'result') onDetection(event.data.detection);
        else {
          instance.terminate();
          worker.current = null;
          busy.current = false;
          void useFallback();
        }
      };
      instance.onerror = () => {
        if (cancelled || worker.current !== instance) return;
        instance.terminate();
        worker.current = null;
        busy.current = false;
        void useFallback();
      };
      instance.postMessage({
        type: 'init',
        wasmRoot: `${root}mediapipe/wasm`,
        modelUrl: `${root}models/gesture_recognizer.task`,
      });
    } catch {
      void useFallback();
    }
    return () => {
      cancelled = true;
      worker.current?.terminate();
      worker.current = null;
      fallback.current?.close();
      fallback.current = null;
      busy.current = false;
      clearFeedback();
    };
  }, [enabled, cameraReady, stream]);

  useEffect(() => {
    if (
      status !== 'active' ||
      !cameraReady ||
      !stream ||
      !['idle', 'countdown', 'review'].includes(phase)
    )
      return;
    let stopped = false;
    const period =
      1000 /
      (fallback.current
        ? Math.min(5, gestureConfig.maximumInferenceHz)
        : gestureConfig.maximumInferenceHz);
    const timer = window.setInterval(
      async () => {
        const video = videoRef.current;
        if (
          stopped ||
          document.hidden ||
          busy.current ||
          !video ||
          video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
          !video.videoWidth ||
          !video.videoHeight ||
          video.currentTime === lastFrame.current
        )
          return;
        const now = performance.now();
        if (now - lastInference.current < period) return;
        busy.current = true;
        lastFrame.current = video.currentTime;
        lastInference.current = now;
        try {
          const width = Math.min(video.videoWidth, gestureConfig.maximumInputWidth);
          const height = Math.max(1, Math.round((video.videoHeight * width) / video.videoWidth));
          const frame = await createImageBitmap(video, {
            resizeWidth: width,
            resizeHeight: height,
            resizeQuality: 'low',
          });
          if (stopped || document.hidden) {
            frame.close();
            busy.current = false;
            return;
          }
          if (worker.current)
            worker.current.postMessage(
              { type: 'frame', frame, timestamp: now, id: ++nextId.current },
              [frame],
            );
          else if (fallback.current) {
            const { detectGesture } = await import('../services/gestureRecognizer');
            try {
              const detection = detectGesture(fallback.current, frame, now);
              if (
                stopped ||
                document.hidden ||
                !['idle', 'countdown', 'review'].includes(latest.current.phase)
              )
                return;
              const result = validator.current.update(
                detection,
                latest.current.phase,
                performance.now(),
              );
              setGesture(result.gesture);
              setProgress(result.progress);
              if (result.command) {
                setConfirmed(result.gesture);
                latest.current.onCommand(result.command);
              }
            } finally {
              frame.close();
              busy.current = false;
            }
          } else {
            frame.close();
            busy.current = false;
          }
        } catch {
          busy.current = false;
          setStatus('unavailable');
          setError('Falha ao processar vídeo com IA. Use os controles manuais.');
        }
      },
      Math.max(50, period / 2),
    );
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [status, cameraReady, stream, phase, videoRef]);

  return { enabled, setEnabled, status, error, gesture, progress, confirmed };
}
