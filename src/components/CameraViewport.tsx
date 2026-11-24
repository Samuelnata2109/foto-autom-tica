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

export function CameraViewport({
  video,
  overlay,
  frameUrl,
}: {
  video?: ReactNode;
  overlay?: ReactNode;
  frameUrl?: string;
}) {
  const framed = Boolean(video && frameUrl);
  return (
    <section aria-label="Visor da câmera" className="camera-viewport" data-framed={framed}>
      {!framed && (
        <>
          <FramingGuides />
          <div className="camera-viewport__label">
            <ScanLine size={17} aria-hidden="true" /> Visor da câmera
          </div>
        </>
      )}
      {video && (
        <div className="camera-viewport__media">
          {video}
          {frameUrl && <img className="camera-viewport__frame" src={frameUrl} alt="" />}
        </div>
      )}
      {overlay}
    </section>
  );
}
