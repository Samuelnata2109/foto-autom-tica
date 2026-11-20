import { useEffect, useRef } from 'react';
import { Check, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { SessionPhoto } from '../types/photo';
import { useEntranceAnimation } from '../hooks/useEntranceAnimation';
import { Button } from './Button';
import { PhotoPreview } from './PhotoPreview';

export function PhotoReview({
  photo,
  confirmed,
  onRetake,
  onConfirm,
  gestureActive = false,
}: {
  photo: SessionPhoto;
  confirmed: boolean;
  onRetake: () => void;
  onConfirm: () => void;
  gestureActive?: boolean;
}) {
  const section = useEntranceAnimation<HTMLElement>(photo.url);
  const heading = useRef<HTMLHeadingElement>(null);
  const confirmation = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const target = confirmed ? confirmation.current : heading.current;
    target?.focus();
  }, [confirmed]);

  return (
    <section ref={section} className="photo-review" aria-label="Revisão da foto capturada">
      <h2 ref={heading} tabIndex={-1}>
        Revisão da foto
      </h2>
      <PhotoPreview photo={{ src: photo.url, alt: 'Fotografia capturada na cabine' }} />
      <p className="photo-review__details">
        {photo.width} × {photo.height} · JPEG
      </p>
      <div className="preview-actions">
        <Button variant="secondary" onClick={onRetake}>
          <RotateCcw size={18} aria-hidden="true" /> Tirar novamente
        </Button>
        <Button variant="secondary" disabled aria-describedby="editing-availability">
          <SlidersHorizontal size={18} aria-hidden="true" /> Moldura automática
        </Button>
        <Button onClick={onConfirm} disabled={confirmed}>
          <Check size={18} aria-hidden="true" /> Confirmar foto
        </Button>
      </div>
      <p id="editing-availability">
        {photo.frame === 'applied'
          ? 'Moldura oficial aplicada.'
          : photo.frame === 'missing'
            ? 'Moldura oficial indisponível. Exibindo a foto original.'
            : 'Falha ao aplicar a moldura. Exibindo a foto original.'}
      </p>
      {!confirmed && gestureActive && (
        <p>Mostre o polegar para cima por 2 segundos para confirmar a foto.</p>
      )}
      {confirmed && (
        <p ref={confirmation} tabIndex={-1} role="status">
          Foto confirmada para esta sessão.
        </p>
      )}
    </section>
  );
}
