import { useCallback, useEffect, useRef, useState } from 'react';
import { cameraError, requestCamera, stopStream, type CameraState } from '../services/camera';

export function useCamera() {
  const api = navigator.mediaDevices;
  const media =
    typeof api?.getUserMedia === 'function' && typeof api.enumerateDevices === 'function'
      ? api
      : undefined;
  const [status, setStatus] = useState<CameraState>(media ? 'idle' : 'unsupported');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selection, setSelection] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [settings, setSettings] = useState<MediaTrackSettings>({});
  const [mirrored, setMirrored] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const current = useRef<{
    stream: MediaStream;
    track: MediaStreamTrack;
    ended: () => void;
  } | null>(null);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const refreshVersion = useRef(0);

  const release = useCallback(() => {
    if (videoRef.current) videoRef.current.srcObject = null;
    const active = current.current;
    current.current = null;
    if (!active) return;
    active.track.removeEventListener('ended', active.ended);
    stopStream(active.stream);
  }, []);

  const clear = useCallback(
    (next: CameraState) => {
      release();
      setStream(null);
      setSettings({});
      setStatus(next);
    },
    [release],
  );

  const refresh = useCallback(
    async (checkRemoval = false) => {
      if (!media || !mounted.current) return;
      const version = ++refreshVersion.current;
      try {
        const inputs = (await media.enumerateDevices()).filter(({ kind }) => kind === 'videoinput');
        if (!mounted.current || version !== refreshVersion.current) return;
        setDevices(inputs);
        const ids = inputs.map(({ deviceId }) => deviceId).filter(Boolean);
        const activeId = current.current?.track.getSettings().deviceId;
        if (
          checkRemoval &&
          activeId &&
          (inputs.length === 0 || (ids.length === inputs.length && !ids.includes(activeId)))
        ) {
          clear('disconnected');
        }
        if (checkRemoval && (inputs.length === 0 || ids.length === inputs.length)) {
          setSelection((selected) => (ids.includes(selected) ? selected : ''));
        }
      } catch {
        // A captura continua válida quando só a enumeração falha.
      }
    },
    [clear, media],
  );

  const start = useCallback(
    async (deviceId = '') => {
      if (!media || request.current || !mounted.current) return;
      const controller = new AbortController();
      request.current = controller;
      setSelection(deviceId);
      clear('permission');

      try {
        const permission = await navigator.permissions
          ?.query({ name: 'camera' })
          .catch(() => undefined);
        if (controller.signal.aborted) return;
        if (permission?.state === 'granted') setStatus('connecting');
        const next = await requestCamera(media, deviceId, controller.signal);
        if (!next) return;
        if (controller.signal.aborted) {
          stopStream(next);
          return;
        }
        const track = next.getVideoTracks()[0];
        if (!track || track.readyState === 'ended') {
          stopStream(next);
          clear(track ? 'disconnected' : 'missing');
          return;
        }
        const ended = () => {
          if (current.current?.stream !== next) return;
          clear('disconnected');
          void refresh(true);
        };
        current.current = { stream: next, track, ended };
        track.addEventListener('ended', ended);
        setSelection(track.getSettings().deviceId || deviceId);
        setStatus('connecting');
        setStream(next);
        void refresh();
      } catch (error) {
        if (!controller.signal.aborted) {
          const failure = cameraError(error);
          clear(failure);
          void refresh(failure === 'missing');
        }
      } finally {
        if (request.current === controller) request.current = null;
      }
    },
    [clear, media, refresh],
  );

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    const updateDevices = () => void refresh(true);
    media?.addEventListener('devicechange', updateDevices);
    queueMicrotask(() => {
      if (disposed) return;
      void refresh();
      void start();
    });
    return () => {
      disposed = true;
      mounted.current = false;
      refreshVersion.current++;
      request.current?.abort();
      request.current = null;
      release();
      media?.removeEventListener('devicechange', updateDevices);
    };
  }, [media, refresh, release, start]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    return () => {
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    if (!stream || status !== 'connecting') return;
    const timeout = window.setTimeout(() => clear('unexpected'), 12000);
    return () => window.clearTimeout(timeout);
  }, [clear, status, stream]);

  function updateSettings() {
    const video = videoRef.current;
    const track = current.current?.track;
    if (!track || !video?.videoWidth || !video.videoHeight) return;
    setSettings({ ...track.getSettings(), width: video.videoWidth, height: video.videoHeight });
  }

  function onPlaying() {
    if (!current.current) return;
    updateSettings();
    setStatus('active');
  }

  return {
    status,
    devices,
    selection,
    stream,
    videoRef,
    settings,
    mirrored,
    setMirrored,
    start,
    stop: () => clear('idle'),
    refreshDevices: () => refresh(true),
    onPlaying,
    onResize: updateSettings,
    onVideoError: () => {
      if (current.current) clear('unexpected');
    },
  };
}
