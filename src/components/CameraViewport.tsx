import { ScanLine, VideoOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export function CameraStatus({ available = false }: { available?: boolean }) {
  return (
    <span className="camera-status" data-available={available}>
      <span aria-hidden="true" />
      {available ? 'Câmera disponível' : 'Câmera indisponível'}
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
      {video ? (
        <div className="camera-viewport__media">{video}</div>
      ) : (
        !overlay && (
          <EmptyState
            icon={VideoOff}
            title="A câmera ainda não está disponível"
            description="A prévia ao vivo será integrada na Etapa 03."
          />
        )
      )}
      {overlay}
    </section>
  );
}
