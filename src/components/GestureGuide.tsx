import { Hand, ThumbsUp } from 'lucide-react';

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

export function GestureGuide() {
  return (
    <aside className="gesture-guide" aria-labelledby="gesture-heading">
      <h2 id="gesture-heading">Guia de gestos</h2>
      <p>Reconhecimento disponível na Etapa 05.</p>
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
