import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useEntranceAnimation } from '../hooks/useEntranceAnimation';
import { Button } from './Button';

export function CountdownOverlay({
  current,
  duration,
  progress,
  guidance,
  cancelled,
  onCancel,
  focusCancel = false,
}: {
  current: number;
  duration: number;
  progress: number;
  guidance: string;
  cancelled: boolean;
  onCancel?: () => void;
  focusCancel?: boolean;
}) {
  const number = useEntranceAnimation<HTMLSpanElement>(cancelled ? undefined : current);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focusCancel) cancelButton.current?.focus({ preventScroll: true });
  }, [focusCancel]);
  return (
    <div className="countdown">
      <p>{guidance}</p>
      <p className="countdown__value" data-cancelled={cancelled} role="status">
        {cancelled ? (
          <span>Cancelado</span>
        ) : (
          <span ref={number} key={current}>
            {current}
            <span className="sr-only"> segundos restantes</span>
          </span>
        )}
      </p>
      {!cancelled && (
        <>
          <progress value={progress} max={1} aria-label="Progresso da contagem" />
          <p className="countdown__duration">Duração total: {duration} s</p>
          {onCancel && (
            <Button ref={cancelButton} variant="secondary" onClick={onCancel}>
              <X size={17} aria-hidden="true" /> Cancelar
            </Button>
          )}
        </>
      )}
    </div>
  );
}
