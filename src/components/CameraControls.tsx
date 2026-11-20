import { useId } from 'react';
import { RefreshCw } from 'lucide-react';
import type { useCamera } from '../hooks/useCamera';
import { Button, IconButton } from './Button';

export function CameraControls({
  camera,
  locked = false,
}: {
  camera: ReturnType<typeof useCamera>;
  locked?: boolean;
}) {
  const id = useId();
  const { devices, selection, settings, status } = camera;
  const pending = status === 'permission' || status === 'connecting';
  const unavailable = status === 'unsupported';
  const { width, height, frameRate } = settings;

  return (
    <div className="camera-controls">
      <label htmlFor={id}>Câmera</label>
      <select
        id={id}
        value={selection}
        disabled={pending || unavailable || locked}
        onChange={(event) => void camera.start(event.currentTarget.value)}
      >
        <option value="">Padrão do sistema</option>
        {selection && !devices.some(({ deviceId }) => deviceId === selection) && (
          <option value={selection}>Câmera selecionada</option>
        )}
        {devices
          .filter(({ deviceId }) => deviceId)
          .map(({ deviceId, label }, index) => (
            <option key={deviceId} value={deviceId}>
              {label || 'Câmera ' + (index + 1)}
            </option>
          ))}
      </select>
      <IconButton
        label="Atualizar lista de câmeras"
        disabled={pending || unavailable || locked}
        onClick={() => void camera.refreshDevices()}
      >
        <RefreshCw size={16} aria-hidden="true" />
      </IconButton>
      <label className="camera-controls__mirror">
        <input
          type="checkbox"
          checked={camera.mirrored}
          onChange={(event) => camera.setMirrored(event.currentTarget.checked)}
        />
        Espelhar prévia
      </label>
      {camera.stream && (
        <Button variant="quiet" onClick={camera.stop} disabled={locked}>
          Desligar câmera
        </Button>
      )}
      {status === 'active' && (
        <span className="camera-controls__quality">
          {width && height ? width + ' × ' + height : 'Resolução não informada'}
          {frameRate
            ? ' · ' + frameRate.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' FPS'
            : ''}
        </span>
      )}
    </div>
  );
}
