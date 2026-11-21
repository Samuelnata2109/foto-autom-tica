import { Image } from 'lucide-react';
import type { CSSProperties } from 'react';
import { EmptyState } from './EmptyState';

type PreviewPhoto = { src: string; alt: string; width: number; height: number };

export function PhotoPreview({ photo }: { photo?: PreviewPhoto }) {
  return (
    <section
      className={photo ? 'photo-preview photo-preview--filled' : 'photo-preview'}
      style={photo ? ({ '--photo-ratio': photo.width / photo.height } as CSSProperties) : undefined}
      aria-label="Visualização da foto"
    >
      {photo ? (
        <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} />
      ) : (
        <EmptyState
          icon={Image}
          title="Nenhuma foto disponível"
          description="A fotografia aparecerá aqui após a captura."
        />
      )}
    </section>
  );
}
