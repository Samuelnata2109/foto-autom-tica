import { Link } from 'react-router';
import { BoothHeader } from '../components/BoothHeader';
import { CameraStatus, CameraViewport } from '../components/CameraViewport';
import { CaptureControls } from '../components/CaptureControls';
import { GestureGuide } from '../components/GestureGuide';

export function BoothPage() {
  return (
    <div className="booth-shell">
      <BoothHeader />
      <main className="booth-main">
        <div className="booth-heading">
          <h1 tabIndex={-1}>Cabine fotográfica</h1>
          <CameraStatus />
        </div>
        <div className="booth-grid">
          <div className="booth-stage">
            <CameraViewport />
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
