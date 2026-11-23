import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { signInOperator, type OperatorSession } from '../services/privatePhotoStorage';
import { Button } from './Button';

export function OperatorLogin({
  onSession,
  label,
  failureMessage,
}: {
  onSession: (session: OperatorSession) => void;
  label: string;
  failureMessage: string;
}) {
  const pending = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useLayoutEffect(() => () => pending.current?.abort(), []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const controller = new AbortController();
    pending.current = controller;
    form.reset();
    setError(false);
    setBusy(true);
    try {
      const session = await signInOperator(
        String(values.get('email') ?? ''),
        String(values.get('password') ?? ''),
        controller.signal,
      );
      if (!controller.signal.aborted) onSession(session);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <>
      <form className="camera-controls storage-login" aria-busy={busy} onSubmit={login}>
        <label>
          E-mail da equipe <input name="email" type="email" required autoComplete="username" />
        </label>
        <label>
          Senha <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <Button type="submit" variant="secondary" disabled={busy}>
          {label}
        </Button>
      </form>
      {busy && <p role="status">Verificando acesso…</p>}
      {error && <p role="alert">{failureMessage}</p>}
    </>
  );
}
