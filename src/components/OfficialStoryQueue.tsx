import { useEffect, useRef, useState } from 'react';
import { PhotoStorageError } from '../services/privatePhotoStorage';
import { composeStory, downloadJpeg } from '../services/storyImage';
import {
  listOfficialStories,
  readOfficialStory,
  storyPageSize,
  updateOfficialStory,
  type StoryDecision,
  type StoryEntry,
  type StoryStatus,
} from '../services/storyStorage';
import { Button } from './Button';

const labels: Record<StoryStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  published: 'Publicada manualmente',
  unavailable: 'Indisponível',
};

const unavailableMessage = 'A fotografia está indisponível por expiração, revogação ou exclusão.';

function errorMessage(failure: unknown) {
  if (failure instanceof PhotoStorageError) {
    if (failure.status === 404) return unavailableMessage;
    if (failure.status === 409) return 'A solicitação mudou. Atualize a fila e tente novamente.';
    if (failure.status === 429) return 'Limite de acessos atingido. Aguarde um minuto.';
  }
  return 'A operação falhou. Confira sua conexão e tente novamente.';
}

function StoryDetails({
  entry,
  token,
  onExpired,
  onUpdate,
}: {
  entry: StoryEntry;
  token: string;
  onExpired: () => void;
  onUpdate: (decision: StoryDecision) => void;
}) {
  const [preview, setPreview] = useState<{
    url: string;
    deadline: number;
    release: () => void;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    let releasePreview: (() => void) | undefined;
    void readOfficialStory(token, entry.id, 'preview', controller.signal)
      .then(({ image, deadline }) => {
        if (controller.signal.aborted) return;
        if (deadline <= performance.now()) throw new PhotoStorageError(404);
        const url = URL.createObjectURL(image);
        const expire = () => {
          release();
          setPreview(null);
          setError(unavailableMessage);
        };
        const check = () => {
          if (performance.now() >= deadline) expire();
        };
        const timer = window.setTimeout(expire, Math.max(0, deadline - performance.now()));
        const release = () => {
          if (!releasePreview) return;
          URL.revokeObjectURL(url);
          window.clearTimeout(timer);
          document.removeEventListener('visibilitychange', check);
          releasePreview = undefined;
        };
        releasePreview = release;
        document.addEventListener('visibilitychange', check);
        setPreview({ url, deadline, release });
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (failure instanceof PhotoStorageError && failure.status === 401) onExpired();
        else setError(errorMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      releasePreview?.();
    };
  }, [token, entry.id, onExpired, attempt]);

  async function perform(action: StoryDecision | 'download') {
    if (!preview || pending.current) return;
    if (performance.now() >= preview.deadline) {
      preview.release();
      setPreview(null);
      setError(unavailableMessage);
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    try {
      if (action === 'download') {
        const photo = await readOfficialStory(token, entry.id, 'download', controller.signal);
        if (controller.signal.aborted) return;
        if (performance.now() >= photo.deadline) throw new PhotoStorageError(404);
        const file = await composeStory(photo.image);
        if (controller.signal.aborted) return;
        if (performance.now() >= photo.deadline) throw new PhotoStorageError(404);
        downloadJpeg(file, file.name);
      } else {
        await updateOfficialStory(token, entry.id, action, controller.signal);
        if (!controller.signal.aborted) onUpdate(action);
      }
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure instanceof PhotoStorageError && failure.status === 401) onExpired();
      else {
        if (failure instanceof PhotoStorageError && failure.status === 404) {
          preview.release();
          setPreview(null);
        }
        setError(errorMessage(failure));
      }
    } finally {
      if (!controller.signal.aborted) {
        pending.current = null;
        setBusy(false);
        setConfirming(false);
      }
    }
  }

  return (
    <>
      {loading && <p role="status">Carregando fotografia…</p>}
      {error && <p role="alert">{error}</p>}
      {!preview && !loading && error && error !== unavailableMessage && (
        <Button
          variant="secondary"
          onClick={() => {
            setError('');
            setLoading(true);
            setAttempt((current) => current + 1);
          }}
        >
          Tentar carregar novamente
        </Button>
      )}
      {preview && (
        <>
          <img
            className="shared-photo-page__image"
            src={preview.url}
            alt="Foto enviada para análise da equipe"
          />
          {entry.status === 'pending' && (
            <div className="preview-actions">
              <Button disabled={busy} onClick={() => void perform('approve')}>
                Aprovar
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void perform('reject')}>
                Rejeitar
              </Button>
            </div>
          )}
          {entry.status === 'approved' && (
            <>
              <div className="preview-actions">
                <Button disabled={busy} onClick={() => void perform('download')}>
                  {busy && !confirming ? 'Preparando operação…' : 'Baixar Story em JPEG'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || confirming}
                  onClick={() => setConfirming(true)}
                >
                  Marcar como publicada
                </Button>
              </div>
              {confirming && (
                <div className="story-section__details">
                  <p>
                    Confirme somente após publicar a foto nos Stories do perfil oficial do evento.
                  </p>
                  <div className="preview-actions">
                    <Button disabled={busy} onClick={() => void perform('publish')}>
                      Sim, já foi publicada
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => setConfirming(false)}
                    >
                      Voltar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

export function OfficialStoryQueue({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [list, setList] = useState<{ entries: StoryEntry[]; more: boolean } | null>(null);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void listOfficialStories(token, page * storyPageSize, controller.signal)
      .then((entries) => {
        if (!controller.signal.aborted) setList(entries);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (failure instanceof PhotoStorageError && failure.status === 401) onExpired();
        else setError(errorMessage(failure));
      });
    return () => controller.abort();
  }, [page, attempt, token, onExpired]);

  function refresh() {
    setError('');
    setList(null);
    setSelected('');
    setAttempt((current) => current + 1);
  }

  return (
    <section className="story-section" aria-labelledby="story-queue-heading">
      <h2 id="story-queue-heading">Fila de aprovação</h2>
      <p>Analise o consentimento e a fotografia antes de autorizar a publicação manual.</p>
      <Button variant="secondary" onClick={refresh} disabled={!list && !error}>
        Atualizar fila
      </Button>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {!list && !error && <p role="status">Carregando solicitações…</p>}
      {list && list.entries.length === 0 && <p role="status">Nenhuma solicitação nesta página.</p>}
      {list && (
        <>
          <ul className="story-queue">
            {list.entries.map((entry) => (
              <li key={entry.id} className="story-queue__entry">
                <div className="story-queue__heading">
                  <p>
                    <strong>{labels[entry.status]}</strong> ·{' '}
                    <time dateTime={entry.createdAt}>
                      {new Date(entry.createdAt).toLocaleString('pt-BR')}
                    </time>
                  </p>
                  {entry.available && (
                    <Button
                      variant="secondary"
                      aria-expanded={selected === entry.id}
                      onClick={() => setSelected(selected === entry.id ? '' : entry.id)}
                    >
                      {selected === entry.id ? 'Fechar foto' : 'Visualizar foto'}
                    </Button>
                  )}
                </div>
                {!entry.available && <p>{unavailableMessage}</p>}
                {entry.available && selected === entry.id && (
                  <StoryDetails
                    entry={entry}
                    token={token}
                    onExpired={onExpired}
                    onUpdate={(decision) => {
                      setNotice(
                        {
                          approve: 'Solicitação aprovada.',
                          reject: 'Solicitação rejeitada.',
                          publish: 'Publicação manual registrada.',
                        }[decision],
                      );
                      refresh();
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
          <nav className="preview-actions" aria-label="Páginas da fila">
            <Button
              variant="secondary"
              disabled={page === 0}
              onClick={() => {
                refresh();
                setPage(page - 1);
              }}
            >
              Página anterior
            </Button>
            <Button
              variant="secondary"
              disabled={!list.more}
              onClick={() => {
                refresh();
                setPage(page + 1);
              }}
            >
              Próxima página
            </Button>
          </nav>
        </>
      )}
    </section>
  );
}
