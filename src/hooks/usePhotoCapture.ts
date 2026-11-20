import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { captureFrame, checkPhotoSource } from '../services/photoCapture';
import type { SessionPhoto, TimerDuration } from '../types/photo';
import { useCountdown } from './useCountdown';

type PhotoState =
  | { phase: 'idle' | 'countdown' | 'capturing' }
  | { phase: 'review' | 'confirmed'; photo: SessionPhoto };

export function usePhotoCapture(
  videoRef: RefObject<HTMLVideoElement | null>,
  stream: MediaStream | null,
  ready: boolean,
) {
  const { countdown, start: schedule, cancel: cancelCountdown } = useCountdown();
  const [state, setState] = useState<PhotoState>({ phase: 'idle' });
  const [error, setError] = useState('');
  const operation = useRef<{ stream: MediaStream } | null>(null);
  const photoUrl = useRef<string | null>(null);

  const disposePhoto = useCallback(() => {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = null;
  }, []);

  useEffect(
    () => () => {
      operation.current = null;
      disposePhoto();
    },
    [disposePhoto],
  );

  const reset = useCallback(
    (message = '') => {
      operation.current = null;
      cancelCountdown();
      disposePhoto();
      setState({ phase: 'idle' });
      setError(message);
    },
    [cancelCountdown, disposePhoto],
  );

  useEffect(() => {
    if (operation.current && (!ready || stream !== operation.current.stream)) {
      reset('A fonte de vídeo mudou ou foi desconectada. Aguarde a câmera e tente novamente.');
    }
  }, [ready, reset, stream]);

  function start(duration: TimerDuration) {
    if (operation.current || photoUrl.current) return;
    setError('');
    try {
      if (!ready || !stream) throw new Error('Aguarde a câmera ficar pronta para tirar a foto.');
      checkPhotoSource(videoRef.current, stream);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Câmera indisponível.');
      return;
    }

    const ticket = { stream };
    operation.current = ticket;
    setState({ phase: 'countdown' });
    schedule(duration, () => void capture(ticket));
  }

  async function capture(ticket: { stream: MediaStream }) {
    if (operation.current !== ticket) return;

    try {
      const result = captureFrame(videoRef.current, ticket.stream);
      setState({ phase: 'capturing' });
      const photo = await result;
      if (operation.current !== ticket) return;
      checkPhotoSource(videoRef.current, ticket.stream);
      const url = URL.createObjectURL(photo.blob);
      photoUrl.current = url;
      operation.current = null;
      setState({ phase: 'review', photo: { ...photo, url } });
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

  return { state, countdown, error, start, cancel, confirm, retake: reset };
}
