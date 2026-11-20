import { Link } from 'react-router';
import { LoaderCircle, VideoOff } from 'lucide-react';
import { BoothHeader } from '../components/BoothHeader';
import { Button } from '../components/Button';
import { CameraControls } from '../components/CameraControls';
import { CameraStatus, CameraViewport } from '../components/CameraViewport';
import { CaptureControls } from '../components/CaptureControls';
import { GestureGuide } from '../components/GestureGuide';
import { EmptyState } from '../components/EmptyState';
import { useCamera } from '../hooks/useCamera';
import { cameraMessages } from '../services/camera';

export function BoothPage() {
  const camera = useCamera();
  const { status } = camera;
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
        <div className="booth-grid">
          <div className="booth-stage booth-stage--camera">
            <CameraViewport
              video={
                camera.stream && (
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
                )
              }
              overlay={
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
              }
            />
            <CameraControls camera={camera} />
            <CaptureControls />
          </div>
          <GestureGuide />
        </div>
        {import.meta.env.DEV && (
          <Link className="preview-link" to="/previa/contagem">
            Prévias de desenvolvimento
          </Link>
        )}
      </main>
    </div>
  );
}
