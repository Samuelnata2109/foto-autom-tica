import { useEffect, useRef, useState, type RefObject } from 'react';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';
import { gestureConfig as config } from '../config/gestureConfig';
import { GestureVote } from '../services/gestureVote';
import { GestureValidation } from '../services/gestureValidation';
import type {
  GestureCommand,
  GestureDetection,
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
  const [debug, setDebug] = useState(false);
  const [observe, setObserve] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [workerError, setWorkerError] = useState('');
  const [backend, setBackend] = useState('—');
  const [sample, setSample] = useState<{
    detection: GestureDetection;
    hz: number;
    interval: number;
    ms: number;
    reason: string;
    stable: number;
    validated: GestureName | null;
  } | null>(null);
  const [lastCommand, setLastCommand] = useState<GestureCommand | null>(null);
  const vote = useRef(new GestureVote());
  const diagnosticOnly = debug && observe;
  const latest = useRef({
    phase,
    onCommand,
    stream,
    cameraReady,
    enabled,
    debug,
    diagnosticOnly,
    overlay,
  });
  latest.current = {
    phase,
    onCommand,
    stream,
    cameraReady,
    enabled,
    debug,
    diagnosticOnly,
    overlay,
  };
  const generation = useRef(0);
  const epoch = useRef(0);
  const validator = useRef(new GestureValidation());
  const clearFeedback = (keepLatch = false) => {
    validator.current.reset(keepLatch);
    vote.current.reset();
    setSample(null);
    setGesture(null);
    setProgress(0);
    setConfirmed(null);
  };
  useEffect(() => {
    epoch.current++;
    clearFeedback(true);
  }, [phase, diagnosticOnly]);
  useEffect(() => {
    const change = () => {
      epoch.current++;
      clearFeedback(true);
    };
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);

  useEffect(() => {
    const session = ++generation.current;
    setBackend('—');
    setWorkerError('');
    setLastCommand(null);
    clearFeedback();
    if (!enabled || !cameraReady || !stream) {
      setStatus(enabled ? 'unavailable' : 'off');
      setError(enabled ? 'Aguarde a câmera ficar pronta para usar a IA.' : '');
      return;
    }
    let disposed = false;
    let worker: Worker | null = null;
    let fallback: GestureRecognizer | null = null;
    let fallbackStarted = false;
    let active = false;
    let modeGeneration = 0;
    let period = 1000 / config.maximumInferenceHz;
    let lastInference = -Infinity;
    let lastFrame = -1;
    let sequence = 0;
    type Ticket = {
      id: number;
      epoch: number;
      phase: GesturePhase;
      video: HTMLVideoElement;
      mode: number;
      timestamp: number;
    };
    let pending: Ticket | null = null;
    let deadline: number | undefined;
    const live = () =>
      !disposed &&
      generation.current === session &&
      latest.current.enabled &&
      latest.current.cameraReady &&
      latest.current.stream === stream;
    const valid = (ticket: Ticket) =>
      live() &&
      pending === ticket &&
      ticket.mode === modeGeneration &&
      ticket.epoch === epoch.current &&
      ticket.phase === latest.current.phase &&
      ticket.video === videoRef.current &&
      !document.hidden;
    const clearDeadline = () => window.clearTimeout(deadline);
    let frames = 0,
      totalMs = 0,
      firstTime = 0,
      previousTime = 0;
    const apply = (ticket: Ticket, detection: GestureDetection) => {
      if (!valid(ticket)) return;
      const voted = vote.current.accept(detection, ticket.timestamp);
      const result = validator.current.update(voted, ticket.phase, ticket.timestamp, period, true);
      if (latest.current.debug) {
        if (frames === 0) firstTime = ticket.timestamp;
        frames++;
        totalMs += performance.now() - ticket.timestamp;
        setSample({
          detection,
          interval: frames > 1 ? ticket.timestamp - previousTime : 0,
          hz: frames > 1 ? ((frames - 1) * 1000) / (ticket.timestamp - firstTime) : 0,
          ms: totalMs / frames,
          reason: latest.current.diagnosticOnly
            ? 'Observação sem comandos: ' + result.reason
            : result.reason,
          stable: Math.round(result.progress * config.confirmationMs),
          validated: voted ? result.gesture : null,
        });
        previousTime = ticket.timestamp;
      } else {
        frames = 0;
        totalMs = 0;
      }
      setGesture(result.gesture);
      setProgress(result.progress);
      if (result.command && !latest.current.diagnosticOnly) {
        setLastCommand(result.command);
        setConfirmed(result.gesture);
        latest.current.onCommand(result.command);
      }
    };
    const fail = () => {
      if (!live()) return;
      active = false;
      clearFeedback();
      setStatus('unavailable');
      setError('Não foi possível carregar ou processar a IA. Use os controles manuais.');
    };
    const useFallback = async (cause: unknown) => {
      if (!live() || fallbackStarted) return;
      fallbackStarted = true;
      setWorkerError(cause instanceof Error ? cause.message : String(cause));
      frames = 0;
      totalMs = 0;
      active = false;
      modeGeneration++;
      worker?.terminate();
      worker = null;
      pending = null;
      clearDeadline();
      clearFeedback(true);
      period = 1000 / Math.min(config.fallbackInferenceHz, config.maximumInferenceHz);
      lastInference = -Infinity;
      lastFrame = -1;
      setStatus('loading');
      try {
        const { createGestureRecognizer } = await import('../services/gestureRecognizer');
        if (!live()) return;
        const recognizer = await createGestureRecognizer(
          `${root}mediapipe/wasm`,
          `${root}models/gesture_recognizer.task`,
        );
        if (!live()) {
          recognizer.close();
          return;
        }
        fallback = recognizer;
        setBackend('CPU na thread principal');
        active = true;
        setStatus('active');
        setError('Worker indisponível. IA operando com frequência reduzida.');
      } catch {
        fail();
      }
    };
    setStatus('loading');
    setError('');
    try {
      if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined')
        throw new Error('Worker ou ImageBitmap indisponível');
      const instance = new Worker(
        new URL('../workers/gestureRecognition.worker.ts', import.meta.url),
        { type: 'module' },
      );
      worker = instance;
      deadline = window.setTimeout(
        () => void useFallback('Tempo limite de inicialização'),
        config.workerInitializationTimeoutMs,
      );
      instance.onmessage = (event: MessageEvent<GestureWorkerResponse>) => {
        if (!live() || worker !== instance) return;
        const message = event.data;
        if (message.type === 'ready' && !active) {
          setBackend('Worker');
          clearDeadline();
          active = true;
          setStatus('active');
        } else if (message.type === 'result' && pending?.id === message.id) {
          const ticket = pending;
          clearDeadline();
          apply(ticket, message.detection);
          pending = null;
        } else if (message.type === 'error') void useFallback(message.message);
      };
      instance.onerror = (event) => {
        if (worker === instance) void useFallback(event?.message || 'Erro do worker');
      };
      instance.postMessage({
        type: 'init',
        wasmRoot: new URL(`${root}mediapipe/wasm`, document.baseURI).href,
        modelUrl: new URL(`${root}models/gesture_recognizer.task`, document.baseURI).href,
      });
    } catch (cause) {
      void useFallback(cause);
    }

    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      if (
        !live() ||
        !active ||
        pending ||
        document.hidden ||
        (!latest.current.diagnosticOnly &&
          !['idle', 'countdown', 'review'].includes(latest.current.phase)) ||
        !video ||
        video.readyState < 2 ||
        !video.videoWidth ||
        !video.videoHeight ||
        video.currentTime === lastFrame
      )
        return;
      const now = performance.now();
      if (now - lastInference < period) return;
      const ticket: Ticket = {
        id: ++sequence,
        epoch: epoch.current,
        phase: latest.current.phase,
        video,
        mode: modeGeneration,
        timestamp: now,
      };
      pending = ticket;
      lastInference = now;
      lastFrame = video.currentTime;
      let frame: ImageBitmap | null = null;
      try {
        const width = Math.min(video.videoWidth, config.maximumInputWidth);
        frame = await createImageBitmap(video, {
          resizeWidth: width,
          resizeHeight: Math.max(1, Math.round((video.videoHeight * width) / video.videoWidth)),
          resizeQuality: 'low',
        });
        if (!valid(ticket)) return;
        if (worker) {
          worker.postMessage(
            {
              type: 'frame',
              frame,
              overlay: latest.current.debug && latest.current.overlay,
              timestamp: now,
              id: ticket.id,
            },
            [frame],
          );
          frame = null; // Ownership transferred to the worker, which closes it in finally.
          deadline = window.setTimeout(
            () => void useFallback('Tempo limite de inferência'),
            config.workerInferenceTimeoutMs,
          );
          return;
        }
        const { detectGesture } = await import('../services/gestureRecognizer');
        if (!valid(ticket) || !fallback) return;
        apply(
          ticket,
          detectGesture(fallback, frame, now, latest.current.debug && latest.current.overlay),
        );
      } catch (cause) {
        if (valid(ticket)) {
          if (worker) void useFallback(cause);
          else fail();
        }
      } finally {
        frame?.close();
        if (pending === ticket && (!worker || frame)) pending = null;
      }
    }, 50);
    return () => {
      disposed = true;
      modeGeneration++;
      pending = null;
      window.clearInterval(timer);
      clearDeadline();
      worker?.terminate();
      fallback?.close();
    };
  }, [enabled, cameraReady, stream, videoRef]);
  return {
    enabled,
    setEnabled,
    status,
    error,
    gesture,
    progress,
    confirmed,
    debug,
    setDebug,
    observe,
    setObserve,
    overlay,
    setOverlay,
    sample,
    backend,
    workerError,
    lastCommand,
  };
}
