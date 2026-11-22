import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { Brand } from '../components/Brand';
import { Button } from '../components/Button';
import { StoryOptions } from '../components/StoryOptions';
import { PhotoStorageError, readSharedPhoto } from '../services/privatePhotoStorage';
import { downloadJpeg } from '../services/storyImage';

const invalid = 'Este link está inválido, expirou ou foi revogado.';

function failureMessage(failure: unknown) {
  if (failure instanceof PhotoStorageError && failure.status === 404) return invalid;
  if (failure instanceof PhotoStorageError && failure.status === 429)
    return 'Limite de acessos atingido. Aguarde um minuto e tente novamente.';
  return 'Não foi possível acessar a foto. Confira sua conexão e tente novamente.';
}

function PhotoViewer({ secret }: { secret: string }) {
  const [preview, setPreview] = useState<{
    url: string;
    deadline: number;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const download = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void readSharedPhoto(secret, controller.signal)
      .then(({ image, expiresAt, deadline }) => {
        if (controller.signal.aborted) return;
        if (deadline <= performance.now()) setError(invalid);
        else setPreview({ url: URL.createObjectURL(image), expiresAt, deadline });
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failureMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [secret, attempt]);

  useEffect(() => {
    if (!preview) return;
    const expire = () => {
      setPreview(null);
      setError(invalid);
    };
    const check = () => {
      if (performance.now() >= preview.deadline) expire();
    };
    const timer = window.setTimeout(expire, Math.max(0, preview.deadline - performance.now()));
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', check);
      URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  useEffect(() => () => download.current?.abort(), []);

  async function save() {
    if (!preview || download.current) return;
    const controller = new AbortController();
    download.current = controller;
    setSaving(true);
    setError('');
    try {
      const { image, deadline } = await readSharedPhoto(secret, controller.signal);
      if (controller.signal.aborted) return;
      if (deadline <= performance.now()) throw new PhotoStorageError(404);
      downloadJpeg(image, 'ai-photo-booth.jpg');
    } catch (failure) {
      if (!controller.signal.aborted) {
        const message = failureMessage(failure);
        if (message === invalid) setPreview(null);
        setError(message);
      }
    } finally {
      if (!controller.signal.aborted) {
        download.current = null;
        setSaving(false);
      }
    }
  }

  return (
    <main className="booth-shell">
      <div className="booth-main shared-photo-page">
        <Brand />
        <section className="photo-review" aria-labelledby="shared-photo-heading">
          <h1 id="shared-photo-heading" tabIndex={-1}>
            {preview ? 'Sua foto está pronta!' : 'Sua foto'}
          </h1>
          {loading && <p role="status">Carregando fotografia…</p>}
          {error && <p role="alert">{error}</p>}
          {preview && (
            <>
              <img
                className="shared-photo-page__image"
                src={preview.url}
                alt="Foto compartilhada pelo AI Photo Booth"
              />
              <p>
                Disponível até{' '}
                <time dateTime={preview.expiresAt}>
                  {new Date(preview.expiresAt).toLocaleString('pt-BR')}
                </time>
                .
              </p>
              <Button disabled={saving} onClick={() => void save()}>
                {saving ? 'Preparando download…' : 'Baixar foto em JPEG'}
              </Button>
            </>
          )}
          {!loading && !preview && error && error !== invalid && (
            <Button
              onClick={() => {
                setLoading(true);
                setError('');
                setAttempt((current) => current + 1);
              }}
            >
              Tentar novamente
            </Button>
          )}
        </section>
        {preview && (
          <StoryOptions
            secret={secret}
            deadline={preview.deadline}
            onUnavailable={() => {
              setPreview(null);
              setError(invalid);
            }}
          />
        )}
      </div>
    </main>
  );
}

export function SharedPhotoPage() {
  const { secret = '' } = useParams();
  return <PhotoViewer key={secret} secret={secret} />;
}
