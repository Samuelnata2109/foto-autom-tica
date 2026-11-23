import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router';
import { Brand } from '../components/Brand';
import { Button, ButtonLink } from '../components/Button';
import { OperatorLogin } from '../components/OperatorLogin';
import { storageConfigured, type OperatorSession } from '../services/privatePhotoStorage';
import './admin.css';

export type AdminSessionContext = {
  token: string;
  onExpired: () => void;
  isSessionActive: () => boolean;
};

export function AdminPage() {
  const [session, setSession] = useState<OperatorSession | null>(null);
  const activeSession = useRef<OperatorSession | null>(null);
  const [expired, setExpired] = useState(false);
  const main = useRef<HTMLElement>(null);
  const endSession = useCallback((target: OperatorSession, wasExpired: boolean) => {
    if (activeSession.current !== target) return;
    activeSession.current = null;
    setSession(null);
    setExpired(wasExpired);
  }, []);
  const expireSession = useCallback(() => {
    if (session) endSession(session, true);
  }, [session, endSession]);
  const isSessionActive = useCallback(
    () => session !== null && activeSession.current === session && Date.now() < session.expiresAt,
    [session],
  );

  useLayoutEffect(() => {
    main.current?.querySelector('h1')?.focus({ preventScroll: true });
    if (!session) return;
    const check = () => {
      if (Date.now() >= session.expiresAt) expireSession();
    };
    const timer = window.setTimeout(expireSession, Math.max(0, session.expiresAt - Date.now()));
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [session, expireSession]);

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Brand />
        <div className="admin-header__actions">
          <ButtonLink to="/" variant="quiet">
            Voltar ao início
          </ButtonLink>
          {session && (
            <Button variant="secondary" onClick={() => endSession(session, false)}>
              Sair da equipe
            </Button>
          )}
        </div>
      </header>
      <div className={session ? 'admin-layout' : 'admin-layout admin-layout--locked'}>
        <main className="admin-content" ref={main}>
          {session ? (
            <Outlet
              context={
                {
                  token: session.token,
                  onExpired: expireSession,
                  isSessionActive,
                } satisfies AdminSessionContext
              }
            />
          ) : (
            <section className="admin-panel" aria-labelledby="admin-login-title">
              <h1 id="admin-login-title" tabIndex={-1}>
                Acesso da equipe
              </h1>
              {expired && (
                <p role="alert">Sessão indisponível. Entre novamente com uma conta autorizada.</p>
              )}
              {storageConfigured ? (
                <>
                  <p>Entre com uma conta autorizada da equipe.</p>
                  <OperatorLogin
                    label="Entrar no painel"
                    failureMessage="A equipe não pôde entrar. Confira as credenciais e tente novamente."
                    onSession={(next) => {
                      activeSession.current = next;
                      setSession(next);
                      setExpired(false);
                    }}
                  />
                </>
              ) : (
                <p>O acesso da equipe está indisponível nesta instalação.</p>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
