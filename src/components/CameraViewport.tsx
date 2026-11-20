import { ScanLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { cameraMessages, type CameraState } from '../services/camera';

export function CameraStatus({ status }: { status: CameraState }) {
  return (
    <span className="camera-status" data-available={status === 'active'} role="status">
      <span aria-hidden="true" />
      {cameraMessages[status][0]}
    </span>
  );
}

export function FramingGuides() {
  return (
    <div className="framing-guides" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}

export function CameraViewport({ video, overlay }: { video?: ReactNode; overlay?: ReactNode }) {
  return (
    <section aria-label="Visor da câmera" className="camera-viewport">
      <FramingGuides />
      <div className="camera-viewport__label">
        <ScanLine size={17} aria-hidden="true" /> Visor da câmera
      </div>
      {video && <div className="camera-viewport__media">{video}</div>}
      {overlay}
    </section>
  );
}
