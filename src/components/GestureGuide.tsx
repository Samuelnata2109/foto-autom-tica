import { Hand, ThumbsUp } from 'lucide-react';
import { commandFor, gestureLabels } from '../services/gestureValidation';
import { gestureConfig } from '../config/gestureConfig';
import type { GestureCommand, GestureName, GesturePhase } from '../types/gesture';
import { Button } from './Button';

function Peace() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m8.5 11-2-6.5a1.5 1.5 0 0 1 2.9-.85L12 10l2.2-6.85a1.5 1.5 0 0 1 2.9.8L15.4 11M9 14l-2-1a1.5 1.5 0 0 0-2 2l2.5 4A5 5 0 0 0 12 22h1a5 5 0 0 0 5-5v-3a3 3 0 0 0-3-3h-3a1.5 1.5 0 0 0 0 3h2" />
    </svg>
  );
}

function Fist() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 11V7a1.5 1.5 0 0 1 3 0v3-5a1.5 1.5 0 0 1 3 0v5-4a1.5 1.5 0 0 1 3 0v4-2a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4 14a2 2 0 0 1 2.5-3l3 1h4a1.5 1.5 0 0 1 0 3H10" />
    </svg>
  );
}

const gestures = [
  { name: 'Mão aberta', action: 'Temporizador de 5 s', icon: Hand },
  { name: 'Sinal de paz', action: 'Temporizador de 10 s', icon: Peace },
  { name: 'Polegar positivo', action: 'Confirmar fotografia', icon: ThumbsUp },
  { name: 'Punho fechado', action: 'Cancelar ação', icon: Fist },
];

type Recognition = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  status: 'off' | 'loading' | 'active' | 'unavailable';
  error: string;
  workerError: string;
  retry: () => void;
  gesture: GestureName | null;
  handDetected: boolean;
  diagnosticOnly: boolean;
  progress: number;
  feedback: { gesture: GestureName; command: GestureCommand } | null;
};

const seconds = (ms: number) => (ms / 1000).toLocaleString('pt-BR');
const guidance: Record<GesturePhase, string> = {
  idle: `Mostre a palma aberta ou o sinal de paz por ${seconds(gestureConfig.confirmationMs)} s.`,
  countdown: `Mantenha o punho fechado por ${seconds(gestureConfig.cancelConfirmationMs)} s para cancelar.`,
  capturing: 'Aguarde a captura.',
  review: `Mostre o polegar para cima por ${seconds(gestureConfig.confirmationMs)} s para confirmar.`,
  confirmed: 'Foto confirmada. Use os controles manuais para repetir.',
};

const executed: Record<GestureCommand, { phase: GesturePhase; message: string }> = {
  start5: { phase: 'countdown', message: 'Contagem de 5 s iniciada' },
  start10: { phase: 'countdown', message: 'Contagem de 10 s iniciada' },
  cancel: { phase: 'idle', message: 'Contagem cancelada' },
  confirm: { phase: 'confirmed', message: 'Foto confirmada' },
};

export function GestureGuide({
  recognition,
  phase,
}: {
  recognition: Recognition;
  phase: GesturePhase;
}) {
  const action = recognition.feedback && executed[recognition.feedback.command];
  const blockedByPhase = recognition.gesture && !commandFor(phase, recognition.gesture);
  return (
    <aside className="gesture-guide" aria-labelledby="gesture-heading">
      <h2 id="gesture-heading">Guia de gestos</h2>
      <label className="gesture-toggle">
        <input
          type="checkbox"
          checked={recognition.enabled}
          onChange={(event) => recognition.setEnabled(event.target.checked)}
        />
        Ativar reconhecimento por gestos
      </label>
      <p className="gesture-status" role="status">
        {recognition.status === 'off' && 'IA desativada'}
        {recognition.status === 'loading' && 'Carregando modelo de gestos…'}
        {recognition.status === 'active' &&
          (recognition.diagnosticOnly ? 'Observação ativa · comandos pausados' : 'IA ativa')}
        {recognition.status === 'unavailable' && 'IA indisponível'}
      </p>
      {recognition.error && <p role="alert">{recognition.error}</p>}
      {recognition.status === 'unavailable' && recognition.workerError && (
        <Button variant="secondary" onClick={recognition.retry}>
          Tentar reativar IA
        </Button>
      )}
      {recognition.status === 'active' && (
        <>
          <p>{guidance[phase]}</p>
          <p className="gesture-detection" role="status">
            {recognition.gesture
              ? `Mão detectada · ${gestureLabels[recognition.gesture]}`
              : recognition.handDetected
                ? 'Mão detectada · Aguardando gesto estável'
                : 'Aguardando uma mão'}
            {blockedByPhase && !recognition.diagnosticOnly ? ' · disponível em outra fase' : ''}
          </p>
          <progress
            aria-label="Progresso da confirmação do gesto"
            max={1}
            value={recognition.progress}
          />
          {recognition.feedback && (
            <p role="status">
              Gesto confirmado: {gestureLabels[recognition.feedback.gesture]}
              {action?.phase === phase ? ` · ${action.message}` : ''}
            </p>
          )}
        </>
      )}
      <ul>
        {gestures.map(({ name, action, icon: Icon }) => (
          <li key={name}>
            <span className="gesture-icon" aria-hidden="true">
              <Icon />
            </span>
            <div>
              <strong>{name}</strong>
              <span>{action}</span>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
