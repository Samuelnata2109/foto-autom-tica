import { useId, type Ref } from 'react';
import { Camera, Timer } from 'lucide-react';
import type { TimerDuration } from '../types/photo';
import { Button } from './Button';

export function TimerSelector({
  value,
  onChange,
  disabled,
}: {
  value: TimerDuration;
  onChange: (value: TimerDuration) => void;
  disabled: boolean;
}) {
  const group = useId();
  return (
    <fieldset className="timer-selector" disabled={disabled}>
      <legend>
        <Timer size={16} aria-hidden="true" /> Temporizador
      </legend>
      <div className="timer-selector__options">
        {([5, 10] as const).map((duration) => (
          <label className="timer-option" key={duration}>
            <input
              type="radio"
              name={group}
              checked={value === duration}
              onChange={() => onChange(duration)}
            />
            <span>{duration} s</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CaptureControls({
  duration,
  onDurationChange,
  onCapture,
  ready,
  busy,
  shutterRef,
}: {
  duration: TimerDuration;
  onDurationChange: (value: TimerDuration) => void;
  onCapture: () => void;
  ready: boolean;
  busy: boolean;
  shutterRef: Ref<HTMLButtonElement>;
}) {
  const hint = useId();
  return (
    <div className="capture-controls">
      <TimerSelector value={duration} onChange={onDurationChange} disabled={busy} />
      <div className="capture-controls__shutter">
        <Button
          ref={shutterRef}
          className="shutter"
          disabled={!ready || busy}
          aria-describedby={hint}
          onClick={onCapture}
        >
          <Camera size={21} aria-hidden="true" /> Tirar foto
        </Button>
        <p id={hint}>
          {busy
            ? 'Captura em andamento.'
            : ready
              ? 'A foto será tirada ao fim da contagem.'
              : 'Aguarde a câmera ficar pronta.'}
        </p>
      </div>
    </div>
  );
}
