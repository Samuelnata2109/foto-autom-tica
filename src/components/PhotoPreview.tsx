import { Image } from 'lucide-react';
import { EmptyState } from './EmptyState';

type PreviewPhoto = { src: string; alt: string };

export function PhotoPreview({ photo }: { photo?: PreviewPhoto }) {
  return (
    <section className="photo-preview" aria-label="Visualização da foto">
      {photo ? (
        <img src={photo.src} alt={photo.alt} />
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
