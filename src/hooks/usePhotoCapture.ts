import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { captureFrame, checkPhotoSource } from '../services/photoCapture';
import { composePhoto } from '../services/photoComposition';
import {
  replaceBackground,
  type BackgroundProgress,
  type Scenario,
} from '../services/virtualBackground';
import type { SessionPhoto, TimerDuration } from '../types/photo';
import { useCountdown } from './useCountdown';

type CaptureTicket = {
  stream: MediaStream;
  controller: AbortController;
  scenario: Scenario;
  mirrored: boolean;
  captured?: boolean;
  background?: AbortController;
};

type PhotoState =
  | { phase: 'idle' | 'countdown' | 'capturing' }
  | { phase: 'review' | 'confirmed'; photo: SessionPhoto };

export function usePhotoCapture(
  videoRef: RefObject<HTMLVideoElement | null>,
  stream: MediaStream | null,
  ready: boolean,
  mirrored: boolean,
) {
  const { countdown, start: schedule, cancel: cancelCountdown } = useCountdown();
  const [state, setState] = useState<PhotoState>({ phase: 'idle' });
  const [error, setError] = useState('');
  const [backgroundProgress, setBackgroundProgress] = useState<BackgroundProgress | null>(null);
  const [backgroundNote, setBackgroundNote] = useState('');
  const operation = useRef<CaptureTicket | null>(null);
  const photoUrl = useRef<string | null>(null);

  const disposePhoto = useCallback(() => {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = null;
  }, []);

  useEffect(
    () => () => {
      operation.current?.controller.abort();
      operation.current = null;
      disposePhoto();
    },
    [disposePhoto],
  );

  const reset = useCallback(
    (message = '') => {
      operation.current?.controller.abort();
      operation.current = null;
      cancelCountdown();
      disposePhoto();
      setState({ phase: 'idle' });
      setError(message);
      setBackgroundNote('');
      setBackgroundProgress(null);
    },
    [cancelCountdown, disposePhoto],
  );

  useEffect(() => {
    if (
      operation.current &&
      !operation.current.captured &&
      (!ready || stream !== operation.current.stream)
    ) {
      reset('A fonte de vídeo mudou ou foi desconectada. Aguarde a câmera e tente novamente.');
    }
  }, [ready, reset, stream]);

  function start(duration: TimerDuration, scenario: Scenario = 'original') {
    if (operation.current || photoUrl.current) return;
    setError('');
    try {
      if (!ready || !stream) throw new Error('Aguarde a câmera ficar pronta para tirar a foto.');
      checkPhotoSource(videoRef.current, stream);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Câmera indisponível.');
      return;
    }

    const ticket: CaptureTicket = { stream, controller: new AbortController(), scenario, mirrored };
    operation.current = ticket;
    setState({ phase: 'countdown' });
    schedule(duration, () => void capture(ticket));
  }

  function captureNow(scenario: Scenario = 'original') {
    if (operation.current || photoUrl.current) return;
    setError('');
    try {
      if (!ready || !stream) throw new Error('Aguarde a câmera ficar pronta para tirar a foto.');
      checkPhotoSource(videoRef.current, stream);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Câmera indisponível.');
      return;
    }

    const ticket: CaptureTicket = { stream, controller: new AbortController(), scenario, mirrored };
    operation.current = ticket;
    void capture(ticket);
  }

  async function capture(ticket: CaptureTicket) {
    if (operation.current !== ticket) return;

    try {
      const result = captureFrame(videoRef.current, ticket.stream, ticket.mirrored);
      setState({ phase: 'capturing' });
      const original = await result;
      if (operation.current !== ticket) return;
      checkPhotoSource(videoRef.current, ticket.stream);
      ticket.captured = true;
      let photo = original;
      let frame: SessionPhoto['frame'] = 'missing';
      let scenarioId: Scenario = 'original';
      if (ticket.scenario !== 'original') {
        ticket.background = new AbortController();
        setBackgroundProgress('loading');
        try {
          const composed = await replaceBackground(
            original,
            ticket.scenario,
            AbortSignal.any([ticket.controller.signal, ticket.background.signal]),
            (stage) => {
              if (operation.current === ticket) setBackgroundProgress(stage);
            },
          );
          photo = composed.photo;
          frame = composed.frame;
          scenarioId = ticket.scenario;
        } catch (failure) {
          if (operation.current !== ticket) return;
          const detail = ticket.background.signal.aborted
            ? 'Cenário cancelado.'
            : failure instanceof DOMException && failure.name === 'TimeoutError'
              ? 'O cenário excedeu o tempo de processamento.'
              : 'Não foi possível aplicar o cenário.';
          setBackgroundNote(`${detail} A foto está com o fundo original.`);
        } finally {
          if (operation.current === ticket) {
            ticket.background = undefined;
            setBackgroundProgress(null);
          }
        }
      }
      if (operation.current !== ticket) return;
      if (photo === original) {
        try {
          const composed = await composePhoto(original, ticket.controller.signal);
          frame = composed.frame;
          if (composed.frame === 'applied') photo = composed.photo;
        } catch {
          frame = 'failed';
        }
      }
      if (operation.current !== ticket) return;
      const url = URL.createObjectURL(photo.blob);
      photoUrl.current = url;
      operation.current = null;
      setState({ phase: 'review', photo: { ...photo, original, frame, url, scenarioId } });
    } catch (failure) {
      if (operation.current !== ticket) return;
      reset(failure instanceof Error ? failure.message : 'Não foi possível capturar a foto.');
    }
  }

  function confirm() {
    setState((current) =>
      current.phase === 'review' ? { ...current, phase: 'confirmed' } : current,
    );
  }

  function cancel() {
    if (state.phase === 'countdown') reset();
  }

  return {
    state,
    countdown,
    error,
    start,
    captureNow,
    cancel,
    confirm,
    retake: reset,
    backgroundProgress,
    backgroundNote,
    skipBackground: () => operation.current?.background?.abort(),
  };
}
