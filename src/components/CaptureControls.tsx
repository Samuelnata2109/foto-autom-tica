import { useId, useState } from 'react';
import { Camera, Timer } from 'lucide-react';
import { Button } from './Button';

export type TimerDuration = 5 | 10;

export function TimerSelector({
  value,
  onChange,
}: {
  value: TimerDuration;
  onChange: (value: TimerDuration) => void;
}) {
  const group = useId();
  return (
    <fieldset className="timer-selector">
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

export function CaptureControls() {
  const [duration, setDuration] = useState<TimerDuration>(5);
  const hint = useId();
  return (
    <div className="capture-controls">
      <TimerSelector value={duration} onChange={setDuration} />
      <div className="capture-controls__shutter">
        <Button className="shutter" disabled aria-describedby={hint}>
          <Camera size={21} aria-hidden="true" /> Tirar foto
        </Button>
        <p id={hint}>Captura indisponível nesta etapa.</p>
      </div>
    </div>
  );
}
