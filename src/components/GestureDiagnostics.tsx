import type { useGestureRecognition } from '../hooks/useGestureRecognition';
import type { GesturePhase } from '../types/gesture';
import { useEffect, useState } from 'react';
import type { useCamera } from '../hooks/useCamera';

function CameraPerformance({ camera }: { camera: ReturnType<typeof useCamera> }) {
  const { stream, videoRef, settings } = camera;
  const [preview, setPreview] = useState<{ processed: number; shown: number } | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!stream || !video?.getVideoPlaybackQuality) return;
    let previous = video.getVideoPlaybackQuality();
    let lastAt = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const quality = video.getVideoPlaybackQuality();
      const processed = quality.totalVideoFrames - previous.totalVideoFrames;
      const dropped = quality.droppedVideoFrames - previous.droppedVideoFrames;
      const seconds = (now - lastAt) / 1000;
      setPreview(
        document.hidden ||
          quality.totalVideoFrames === 0 ||
          seconds <= 0 ||
          processed < 0 ||
          dropped < 0 ||
          dropped > processed
          ? null
          : { processed: processed / seconds, shown: (processed - dropped) / seconds },
      );
      previous = quality;
      lastAt = now;
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stream, videoRef]);

  const track = stream?.getVideoTracks()[0]?.getSettings();
  return (
    <>
      <p>
        Faixa da câmera: {track?.width && track.height ? `${track.width} × ${track.height}` : '—'} ·{' '}
        {track?.frameRate ? `${track.frameRate.toFixed(1)} FPS informados` : 'FPS não informado'}
      </p>
      <p>
        Vídeo: {settings.width && settings.height ? `${settings.width} × ${settings.height}` : '—'}{' '}
        ·{' '}
        {preview
          ? `${preview.processed.toFixed(1)} FPS processados · ${preview.shown.toFixed(1)} FPS exibidos (estimativa)`
          : 'FPS medido indisponível'}
      </p>
    </>
  );
}

function ms(value: number | null | undefined) {
  return value == null ? '—' : `${value.toFixed(1)} ms`;
}

export function GestureDiagnostics({
  ai,
  camera,
  phase,
}: {
  ai: ReturnType<typeof useGestureRecognition>;
  camera: ReturnType<typeof useCamera>;
  phase: GesturePhase;
}) {
  const s = ai.sample,
    d = s?.detection;
  const timing = ai.performanceSample;
  return (
    <details className="gesture-diagnostics" onToggle={(e) => ai.setDebug(e.currentTarget.open)}>
      <summary>Diagnóstico de gestos</summary>
      {ai.debug && (
        <>
          <label>
            <input
              type="checkbox"
              checked={ai.observe}
              onChange={(e) => ai.setObserve(e.target.checked)}
            />{' '}
            Observar todas as fases sem executar comandos
          </label>
          <label>
            <input
              type="checkbox"
              checked={ai.overlay}
              onChange={(e) => ai.setOverlay(e.target.checked)}
            />{' '}
            Mostrar 21 pontos da mão
          </label>
          <p>
            {ai.backend} · {phase}
          </p>
          <CameraPerformance key={camera.stream?.id} camera={camera} />
          <p>
            Timeouts: {ai.incidents.timeouts} · outras falhas: {ai.incidents.failures}
          </p>
          {ai.workerError && <p>IA suspensa. Motivo: {ai.workerError}</p>}
          <p>
            Modelo: {d?.raw ?? '—'} · confiança {d?.rawScore?.toFixed(2) ?? '—'} · geometria:{' '}
            {d?.geometry ?? '—'}
            {d?.geometrySource === 'world' && ' (3D)'}
            {d?.geometrySource === 'image' && ' (imagem)'}
          </p>
          <p>
            Validado: {s?.validated ?? '—'} · estabilidade {s?.stable ?? 0} ms
          </p>
          {d?.thumbMetrics && (
            <p>
              Polegar: extensão {d.thumbMetrics.straightRatio.toFixed(2)} · afastamento da palma{' '}
              {d.thumbMetrics.outwardRatio.toFixed(2)} · dedos flexionados{' '}
              {d.thumbMetrics.foldedFingers}/4
            </p>
          )}
          <p>
            Frequência média da IA: {timing ? `${timing.hz.toFixed(1)} Hz` : '—'} · inferência média{' '}
            {ms(timing?.meanInference)} · máxima {ms(timing?.maxInference)}
          </p>
          <p>
            Preparação média do quadro: {ms(timing?.meanPreparation)} · inicialização do worker{' '}
            {ms(timing?.startupMs)}
          </p>
          <p>
            {s?.reason ?? 'Aguardando amostra'} · último comando: {ai.lastCommand ?? '—'}
          </p>
        </>
      )}
    </details>
  );
}
