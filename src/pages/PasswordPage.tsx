import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Brand } from '../components/Brand';
import { Button } from '../components/Button';
import type { createPasswordFlow } from '../services/passwordFlow';

const invalidLink =
  'Este link está inválido, expirou ou já foi utilizado. Solicite um novo link à equipe.';

export function PasswordPage({ flow }: { flow: ReturnType<typeof createPasswordFlow> }) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'unavailable' | 'saved'>(
    'checking',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let mounted = true;
    heading.current?.focus();
    void flow.verify().then((result) => {
      if (mounted) setStatus(result);
    });
    return () => {
      mounted = false;
    };
  }, [flow]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== 'ready' || busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password') ?? '');
    setError('');
    if (password.length < 8) {
      setError('Use pelo menos oito caracteres.');
      return;
    }
    if (password !== data.get('confirmation')) {
      setError('As senhas precisam ser iguais.');
      return;
    }
    setBusy(true);
    const result = await flow.updatePassword(password);
    setBusy(false);
    if (result === 'rejected') {
      setError(
        'Não foi possível salvar a senha. Confira a conexão e escolha uma senha mais forte ou diferente.',
      );
      return;
    }
    form.reset();
    setStatus(result);
  }

  return (
    <main className="booth-shell">
      <div className="booth-main">
        <Brand />
        <section className="photo-review" aria-labelledby="password-heading">
          <h1 id="password-heading" tabIndex={-1} ref={heading}>
            {flow.kind === 'invite' ? 'Definir senha da equipe' : 'Redefinir senha da equipe'}
          </h1>
          {status === 'checking' && <p role="status">Verificando o link…</p>}
          {status === 'invalid' && <p role="alert">{invalidLink}</p>}
          {status === 'unavailable' && (
            <p role="alert">
              Não foi possível verificar o link. Confira a conexão e abra o link do e-mail
              novamente.
            </p>
          )}
          {status === 'saved' && (
            <p role="status">Senha salva. Entre em Acesso da equipe na cabine para continuar.</p>
          )}
          {status === 'ready' && (
            <form className="storage-login password-form" onSubmit={(event) => void submit(event)}>
              <label>
                Nova senha{' '}
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label>
                Confirmar senha{' '}
                <input name="confirmation" type="password" autoComplete="new-password" required />
              </label>
              {error && <p role="alert">{error}</p>}
              <Button type="submit" disabled={busy}>
                {busy ? 'Salvando…' : 'Salvar senha'}
              </Button>
            </form>
          )}
          <div>
            <a
              className="button button--secondary"
              href={window.location.origin + window.location.pathname}
            >
              Voltar ao início
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
