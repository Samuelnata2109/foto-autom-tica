import { useCallback, useState } from 'react';
import { Brand } from '../components/Brand';
import { ButtonLink } from '../components/Button';
import { OfficialStoryQueue } from '../components/OfficialStoryQueue';
import { StorageOperator } from '../components/PhotoStorageConsent';
import { storageConfigured } from '../services/privatePhotoStorage';

export function OfficialStoriesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const resetSession = useCallback(() => {
    setToken(null);
    setExpired(true);
  }, []);

  return (
    <main className="booth-shell">
      <div className="booth-main shared-photo-page">
        <Brand />
        <section className="photo-review">
          <h1 tabIndex={-1}>Stories oficiais</h1>
          <ButtonLink to="/" variant="quiet">
            Voltar ao início
          </ButtonLink>
          {expired && (
            <p role="alert">Sessão indisponível. Entre novamente com uma conta autorizada.</p>
          )}
          {storageConfigured ? (
            <StorageOperator
              stories
              token={token}
              onToken={(value) => {
                setToken(value);
                setExpired(false);
              }}
            />
          ) : (
            <p>A fila está indisponível nesta instalação.</p>
          )}
        </section>
        {token && <OfficialStoryQueue token={token} onExpired={resetSession} />}
      </div>
    </main>
  );
}
