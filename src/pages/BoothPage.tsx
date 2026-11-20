import { Link } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, VideoOff } from 'lucide-react';
import { BoothHeader } from '../components/BoothHeader';
import { Button } from '../components/Button';
import { CameraControls } from '../components/CameraControls';
import { CameraStatus, CameraViewport } from '../components/CameraViewport';
import { CaptureControls } from '../components/CaptureControls';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { GestureDiagnostics } from '../components/GestureDiagnostics';
import { GestureGuide } from '../components/GestureGuide';
import { EmptyState } from '../components/EmptyState';
import { PhotoReview } from '../components/PhotoReview';
import { useCamera } from '../hooks/useCamera';
import { useGestureRecognition } from '../hooks/useGestureRecognition';
import { usePhotoCapture } from '../hooks/usePhotoCapture';
import { cameraMessages } from '../services/camera';
import type { TimerDuration } from '../types/photo';

export function BoothPage() {
  const camera = useCamera();
  const { status } = camera;
  const [duration, setDuration] = useState<TimerDuration>(5);
  const ready = status === 'active' && Boolean(camera.settings.width && camera.settings.height);
  const capture = usePhotoCapture(camera.videoRef, camera.stream, ready);
  const { state, countdown, error } = capture;
  const recognition = useGestureRecognition(
    camera.videoRef,
    camera.stream,
    ready,
    state.phase,
    (command) => {
      if (command === 'start5') capture.start(5);
      if (command === 'start10') capture.start(10);
      if (command === 'cancel') capture.cancel();
      if (command === 'confirm') capture.confirm();
    },
  );
  const reviewing = state.phase === 'review' || state.phase === 'confirmed';
  const busy = state.phase === 'countdown' || state.phase === 'capturing';
  const shutter = useRef<HTMLButtonElement>(null);
  const previousPhase = useRef(state.phase);
  useEffect(() => {
    if (state.phase === 'idle' && previousPhase.current !== 'idle' && ready) {
      shutter.current?.focus({ preventScroll: true });
    }
    previousPhase.current = state.phase;
  }, [ready, state.phase]);
  const pending = status === 'permission' || status === 'connecting';
  const [title, description] = cameraMessages[status];

  return (
    <div className="booth-shell">
      <BoothHeader />
      <main className="booth-main">
        <div className="booth-heading">
          <h1 tabIndex={-1}>Cabine fotográfica</h1>
          <CameraStatus status={status} />
        </div>
        <div className="booth-photo-area">
          {reviewing && 'photo' in state && (
            <PhotoReview
              photo={state.photo}
              confirmed={state.phase === 'confirmed'}
              onRetake={() => capture.retake()}
              onConfirm={capture.confirm}
              gestureActive={recognition.enabled && recognition.status === 'active'}
            />
          )}
          <div className="booth-grid" data-reviewing={reviewing}>
            <div className="booth-stage booth-stage--camera">
              <CameraViewport
                video={
                  camera.stream && (
                    <>
                      <video
                        ref={camera.videoRef}
                        aria-label="Prévia ao vivo da câmera"
                        data-mirrored={camera.mirrored}
                        autoPlay
                        muted
                        playsInline
                        onPlaying={camera.onPlaying}
                        onResize={camera.onResize}
                        onError={camera.onVideoError}
                      />
                      {recognition.debug &&
                        recognition.overlay &&
                        recognition.sample?.detection?.points && (
                          <svg
                            className="gesture-landmarks"
                            aria-hidden="true"
                            viewBox={`0 0 ${camera.settings.width} ${camera.settings.height}`}
                            style={{ transform: camera.mirrored ? 'scaleX(-1)' : undefined }}
                          >
                            {recognition.sample.detection.points.map((p, i) => (
                              <circle
                                key={i}
                                cx={p.x * (camera.settings.width ?? 1)}
                                cy={p.y * (camera.settings.height ?? 1)}
                                r={(camera.settings.width ?? 320) / 180}
                              />
                            ))}
                          </svg>
                        )}
                    </>
                  )
                }
                overlay={
                  countdown && status === 'active' ? (
                    <CountdownOverlay
                      {...countdown}
                      guidance="Olhe para a câmera"
                      cancelled={false}
                      onCancel={capture.cancel}
                      focusCancel
                    />
                  ) : (
                    status !== 'active' && (
                      <div className="camera-feedback">
                        <EmptyState
                          icon={pending ? LoaderCircle : VideoOff}
                          title={title}
                          description={description}
                        />
                        {!pending && status !== 'unsupported' && (
                          <Button
                            variant="secondary"
                            onClick={() => void camera.start(camera.selection)}
                          >
                            {status === 'idle' ? 'Iniciar câmera' : 'Tentar novamente'}
                          </Button>
                        )}
                      </div>
                    )
                  )
                }
              />
              {!reviewing && <CameraControls camera={camera} locked={busy} />}
              {!reviewing && (
                <CaptureControls
                  duration={duration}
                  onDurationChange={setDuration}
                  onCapture={() => capture.start(duration)}
                  ready={ready}
                  busy={busy}
                  shutterRef={shutter}
                />
              )}
              {error && (
                <p className="capture-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div>
              <GestureGuide recognition={recognition} phase={state.phase} />
              <GestureDiagnostics ai={recognition} phase={state.phase} />
            </div>
          </div>
          {(state.phase === 'capturing' || reviewing) && (
            <div className="capture-flash" aria-hidden="true" />
          )}
        </div>
        {import.meta.env.DEV && !busy && !reviewing && (
          <Link className="preview-link" to="/previa/contagem">
            Prévias de desenvolvimento
          </Link>
        )}
      </main>
    </div>
  );
}
