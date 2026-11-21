import { useEffect, useRef, useState, type RefObject } from 'react';
import { gestureConfig as config } from '../config/gestureConfig';
import { GestureVote } from '../services/gestureVote';
import {
  afterBackgroundVision,
  backgroundReserved,
  holdGestureWork,
} from '../services/visionActivity';
import { confirmationDuration, GestureValidation } from '../services/gestureValidation';
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
    reason: string;
    stable: number;
    validated: GestureName | null;
  } | null>(null);
  const [performanceSample, setPerformanceSample] = useState<{
    hz: number;
    meanInference: number | null;
    maxInference: number | null;
    meanPreparation: number | null;
    startupMs?: number;
  } | null>(null);
  const [incidents, setIncidents] = useState({ timeouts: 0, failures: 0 });
  const [retryVersion, setRetryVersion] = useState(0);
  const wake = useRef<(() => void) | null>(null);
  const [lastCommand, setLastCommand] = useState<GestureCommand | null>(null);
  const [vote] = useState(() => new GestureVote());
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
  const epoch = useRef(0);
  const [validator] = useState(() => new GestureValidation());
  const clearFeedback = (keepLatch = false) => {
    validator.reset(keepLatch);
    vote.reset();
    setSample(null);
    setGesture(null);
    setProgress(0);
    setConfirmed(null);
  };
  useEffect(() => {
    epoch.current++;
    clearFeedback(true);
    wake.current?.();
  }, [phase, diagnosticOnly]);
  useEffect(() => {
    const change = () => {
      epoch.current++;
      clearFeedback(true);
      wake.current?.();
    };
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);

  useEffect(() => {
    setBackend('—');
    setWorkerError('');
    setLastCommand(null);
    setPerformanceSample(null);
    clearFeedback();
    if (!enabled || !cameraReady || !stream) {
      setStatus(enabled ? 'unavailable' : 'off');
      setError(enabled ? 'Aguarde a câmera ficar pronta para usar a IA.' : '');
      return;
    }

    let worker: Worker | null = null;
    let hasFinished = false;
    let loaded = false;
    let firstFrame = true;
    let acceptablePeriod = 1000 / config.maximumInferenceHz;
    let smoothedCost: number | undefined;
    let nextSampleAt = -Infinity;
    let lastFrame = -1;
    let sequence = 0;
    let deadline: number | undefined;
    let cancelScheduled: (() => void) | undefined;
    let startupMs: number | undefined;
    type Ticket = {
      id: number;
      epoch: number;
      phase: GesturePhase;
      video: HTMLVideoElement;
      timestamp: number;
      started?: boolean;
    };
    let pending: Ticket | null = null;
    let releaseWork: (() => void) | undefined;
    const finishWork = () => {
      releaseWork?.();
      releaseWork = undefined;
    };
    const live = () =>
      !hasFinished &&
      latest.current.enabled &&
      latest.current.cameraReady &&
      latest.current.stream === stream;
    const canSample = () =>
      live() &&
      loaded &&
      !backgroundReserved() &&
      latest.current.phase !== 'capturing' &&
      !document.hidden &&
      (latest.current.diagnosticOnly ||
        ['idle', 'countdown', 'review'].includes(latest.current.phase));
    const valid = (ticket: Ticket) =>
      canSample() &&
      pending === ticket &&
      ticket.epoch === epoch.current &&
      ticket.phase === latest.current.phase &&
      ticket.video === videoRef.current;

    const clearDeadline = () => window.clearTimeout(deadline);
    const stop = () => {
      hasFinished = true;
      pending = null;
      clearDeadline();
      cancelScheduled?.();
      cancelScheduled = undefined;
      wake.current = null;
      worker?.terminate();
      worker = null;
      finishWork();
    };
    let count = 0;
    let firstAt = 0;
    let totalInference = 0;
    let maxInference = 0;
    let totalPreparation = 0;
    let prepared = 0;
    let lastPublish = -Infinity;
    const publish = (now: number) => {
      lastPublish = now;
      setPerformanceSample({
        hz: count > 1 && now > firstAt ? ((count - 1) * 1000) / (now - firstAt) : 0,
        meanInference: count ? totalInference / count : null,
        maxInference: count ? maxInference : null,
        meanPreparation: prepared ? totalPreparation / prepared : null,
        startupMs,
      });
    };
    const fail = (cause: unknown, timeout = false) => {
      if (!live()) return;
      stop();
      setWorkerError(cause instanceof Error ? cause.message : String(cause));
      setIncidents((current) => ({
        timeouts: current.timeouts + Number(timeout),
        failures: current.failures + Number(!timeout),
      }));
      if (latest.current.debug) publish(performance.now());
      clearFeedback(true);
      setBackend('—');
      setStatus('unavailable');
      setError('Reconhecimento suspenso. Use os controles manuais ou tente ativar a IA novamente.');
    };

    const schedule = () => {
      const video = videoRef.current;
      if (!video || !canSample() || pending || cancelScheduled) return;
      const delay = nextSampleAt - performance.now();
      const frameCallbacks =
        typeof video.requestVideoFrameCallback === 'function' &&
        typeof video.cancelVideoFrameCallback === 'function';
      if (delay > 0 || !frameCallbacks) {
        const timer = window.setTimeout(
          () => {
            cancelScheduled = undefined;
            if (frameCallbacks) schedule();
            else void capture(video, video.currentTime);
          },
          delay > 0 ? Math.ceil(delay) : 50,
        );
        cancelScheduled = () => window.clearTimeout(timer);
        return;
      }
      const callback = video.requestVideoFrameCallback((_now, { mediaTime }) => {
        cancelScheduled = undefined;
        void capture(video, mediaTime);
      });
      cancelScheduled = () => video.cancelVideoFrameCallback(callback);
    };
    wake.current = () => {
      cancelScheduled?.();
      cancelScheduled = undefined;
      if (latest.current.debug && loaded) publish(performance.now());
      schedule();
    };

    async function capture(video: HTMLVideoElement, frameTime: number) {
      if (!canSample() || pending) return;
      if (
        video !== videoRef.current ||
        video.readyState < 2 ||
        !video.videoWidth ||
        !video.videoHeight ||
        frameTime === lastFrame
      ) {
        schedule();
        return;
      }
      const timestamp = performance.now();
      const ticket: Ticket = {
        id: ++sequence,
        epoch: epoch.current,
        phase: latest.current.phase,
        video,
        timestamp,
      };
      pending = ticket;
      nextSampleAt = timestamp + acceptablePeriod;
      lastFrame = frameTime;
      let frame: ImageBitmap | undefined;
      let transferred = false;
      deadline = window.setTimeout(
        () => fail('Tempo limite na preparação do quadro', true),
        config.workerInferenceTimeoutMs,
      );
      try {
        const width = Math.min(video.videoWidth, config.maximumInputWidth);
        frame = await createImageBitmap(video, {
          resizeWidth: width,
          resizeHeight: Math.max(1, Math.round((video.videoHeight * width) / video.videoWidth)),
          resizeQuality: 'low',
        });
        if (!worker || !valid(ticket)) return;
        clearDeadline();
        totalPreparation += performance.now() - timestamp;
        prepared++;
        releaseWork = holdGestureWork();
        worker.postMessage(
          {
            type: 'frame',
            frame,
            overlay: latest.current.debug && latest.current.overlay,
            timestamp,
            id: ticket.id,
          },
          [frame],
        );
        transferred = true;
        deadline = window.setTimeout(
          () => {
            const stage = ticket.started
              ? 'inferência ou entrega do resultado'
              : 'entrega ao worker';
            const warmup = firstFrame ? ' no primeiro quadro' : '';
            fail(`Tempo limite de ${stage}${warmup}`, true);
          },
          firstFrame ? config.workerFirstFrameTimeoutMs : config.workerInferenceTimeoutMs,
        );
      } catch (cause) {
        if (valid(ticket)) fail(cause);
      } finally {
        if (!transferred) {
          frame?.close();
          if (pending === ticket) {
            clearDeadline();
            pending = null;
            schedule();
          }
        }
      }
    }

    setStatus('loading');
    setError('');
    const cancelStartup = afterBackgroundVision(() => {
      if (!live()) return;
      try {
        if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined')
          throw new Error('Worker ou ImageBitmap indisponível');
        const instance = new Worker(
          new URL('../workers/gestureRecognition.worker.ts', import.meta.url),
          { type: 'module' },
        );
        worker = instance;
        releaseWork = holdGestureWork();
        deadline = window.setTimeout(
          () => fail('Tempo limite de inicialização do worker', true),
          config.workerInitializationTimeoutMs,
        );
        instance.onmessage = (event: MessageEvent<GestureWorkerResponse>) => {
          if (!live() || worker !== instance) return;
          const message = event.data;
          if (message.type === 'error') {
            fail(message.message);
          } else if (message.type === 'ready' && !loaded) {
            clearDeadline();
            finishWork();
            loaded = true;
            startupMs = message.startupMs;
            setBackend('Worker · CPU/WASM');
            if (latest.current.debug) publish(performance.now());
            schedule();
          } else if (message.type === 'started' && pending?.id === message.id) {
            pending.started = true;
          } else if (message.type === 'result' && pending?.id === message.id) {
            clearDeadline();
            finishWork();
            const ticket = pending;
            const now = performance.now();
            const cost = now - ticket.timestamp;
            if (count === 0) firstAt = now;
            count++;
            totalInference += message.inferenceMs;
            maxInference = Math.max(maxInference, message.inferenceMs);
            if (latest.current.debug && now - lastPublish >= config.diagnosticsIntervalMs)
              publish(now);
            const warming = firstFrame;
            if (warming) {
              firstFrame = false;
              setStatus('active');
              // The first live frame warms the graph before it can authorize a gesture.
            } else if (valid(ticket) && cost > config.maximumSampleGapMs) {
              clearFeedback(true);
            } else if (valid(ticket)) {
              const voted = vote.accept(message.detection, ticket.timestamp);
              const result = validator.update(
                voted,
                ticket.phase,
                ticket.timestamp,
                acceptablePeriod,
                true,
              );
              const showDetails =
                latest.current.debug && (now === lastPublish || latest.current.overlay);
              if (showDetails) {
                setSample({
                  detection: message.detection,
                  reason: latest.current.diagnosticOnly
                    ? 'Observação sem comandos: ' + result.reason
                    : result.reason,
                  stable: Math.round(result.progress * confirmationDuration(result.gesture)),
                  validated: voted ? result.gesture : null,
                });
              }
              setGesture(result.gesture);
              setProgress(result.progress);
              if (result.command && !latest.current.diagnosticOnly) {
                setLastCommand(result.command);
                setConfirmed(result.gesture);
                latest.current.onCommand(result.command);
              }
            }

            // Small inputs and one outstanding frame bound the memory use. Reduce duty cycle under load.
            if (!warming) {
              smoothedCost = smoothedCost === undefined ? cost : smoothedCost * 0.75 + cost * 0.25;
              acceptablePeriod = Math.min(
                config.maximumSamplingPeriodMs,
                Math.max(1000 / config.maximumInferenceHz, smoothedCost * 2),
              );
              // Leave time for the preview even when one inference exceeds the sampling interval.
              const rest = Math.min(config.maximumSamplingPeriodMs, cost / 2);
              nextSampleAt = Math.max(ticket.timestamp + acceptablePeriod, now + rest);
            }
            pending = null;
            schedule();
          }
        };
        instance.onerror = (event) => fail(event?.message || 'Erro do worker');
        instance.onmessageerror = () => fail('Falha ao receber uma mensagem do worker');
        instance.postMessage({
          type: 'init',
          wasmRoot: new URL(`${root}mediapipe/wasm`, document.baseURI).href,
          modelUrl: new URL(`${root}models/gesture_recognizer.task`, document.baseURI).href,
        });
      } catch (cause) {
        fail(cause);
      }
    });
    return () => {
      cancelStartup();
      stop();
    };
  }, [enabled, cameraReady, stream, videoRef, retryVersion]);

  useEffect(() => {
    if (debug) wake.current?.();
  }, [debug]);
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
    performanceSample,
    incidents,
    retry: () => setRetryVersion((current) => current + 1),
    lastCommand,
  };
}
