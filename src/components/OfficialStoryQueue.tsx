import { useLayoutEffect, useRef, useState } from 'react';
import { PhotoStorageError } from '../services/privatePhotoStorage';
import { composeStory, downloadJpeg } from '../services/storyImage';
import {
  listOfficialStories,
  readOfficialStory,
  storyPageSize,
  storyTimeRemaining,
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

type StoryQueueSession = {
  token: string;
  onExpired: () => void;
  isSessionActive: () => boolean;
};

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
  isSessionActive,
  onUpdate,
}: {
  entry: StoryEntry;
  onUpdate: (decision: StoryDecision) => void;
} & StoryQueueSession) {
  const [preview, setPreview] = useState<{
    url: string;
    deadline: number;
    wallDeadline: number;
    invalidate: () => void;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);

  useLayoutEffect(() => {
    const controller = new AbortController();
    const isCurrent = () => !controller.signal.aborted && isSessionActive();
    let releasePreview: (() => void) | undefined;
    void readOfficialStory(token, entry.id, 'preview', controller.signal)
      .then(({ image, deadline, wallDeadline }) => {
        if (!isCurrent()) return;
        const validity = { deadline, wallDeadline };
        if (storyTimeRemaining(validity) <= 0) throw new PhotoStorageError(404);
        const url = URL.createObjectURL(image);
        const invalidate = () => {
          if (!releasePreview) return;
          release();
          pending.current?.abort();
          pending.current = null;
          setPreview(null);
          setBusy(false);
          setConfirming(false);
          setError(unavailableMessage);
        };
        const check = () => {
          if (storyTimeRemaining(validity) <= 0) invalidate();
        };
        const timer = window.setTimeout(invalidate, Math.max(0, storyTimeRemaining(validity)));
        const release = () => {
          URL.revokeObjectURL(url);
          window.clearTimeout(timer);
          document.removeEventListener('visibilitychange', check);
          releasePreview = undefined;
        };
        releasePreview = release;
        document.addEventListener('visibilitychange', check);
        setPreview({ url, ...validity, invalidate });
      })
      .catch((failure: unknown) => {
        if (!isCurrent()) return;
        if (failure instanceof PhotoStorageError && failure.status === 401) onExpired();
        else setError(errorMessage(failure));
      })
      .finally(() => {
        if (isCurrent()) setLoading(false);
      });
    return () => {
      controller.abort();
      pending.current?.abort();
      pending.current = null;
      releasePreview?.();
    };
  }, [token, entry.id, onExpired, isSessionActive, attempt]);

  async function perform(action: StoryDecision | 'download') {
    if (!preview || pending.current || !isSessionActive()) return;
    if (storyTimeRemaining(preview) <= 0) {
      preview.invalidate();
      return;
    }
    const controller = new AbortController();
    const isCurrent = () => pending.current === controller && isSessionActive();
    const canUsePhoto = () => {
      if (!isCurrent()) return false;
      if (storyTimeRemaining(preview) > 0) return true;
      preview.invalidate();
      return false;
    };
    pending.current = controller;
    setBusy(true);
    setError('');
    try {
      if (action === 'download') {
        const photo = await readOfficialStory(token, entry.id, 'download', controller.signal);
        if (!canUsePhoto()) return;
        if (storyTimeRemaining(photo) <= 0) throw new PhotoStorageError(404);
        const file = await composeStory(photo.image, controller.signal);
        if (!canUsePhoto()) return;
        if (storyTimeRemaining(photo) <= 0) throw new PhotoStorageError(404);
        downloadJpeg(file, file.name);
      } else {
        await updateOfficialStory(token, entry.id, action, controller.signal);
        if (canUsePhoto()) onUpdate(action);
      }
    } catch (failure) {
      if (!isCurrent()) return;
      if (failure instanceof PhotoStorageError && failure.status === 401) onExpired();
      else if (failure instanceof PhotoStorageError && failure.status === 404) preview.invalidate();
      else if (canUsePhoto()) setError(errorMessage(failure));
    } finally {
      if (isCurrent()) {
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

export function OfficialStoryQueue({ token, onExpired, isSessionActive }: StoryQueueSession) {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [list, setList] = useState<{ entries: StoryEntry[]; more: boolean } | null>(null);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useLayoutEffect(() => {
    const controller = new AbortController();
    const isCurrent = () => !controller.signal.aborted && isSessionActive();
    void listOfficialStories(token, page * storyPageSize, controller.signal)
      .then((entries) => {
        if (isCurrent()) setList(entries);
      })
      .catch((failure: unknown) => {
        if (!isCurrent()) return;
        if (failure instanceof PhotoStorageError && failure.status === 401) onExpired();
        else setError(errorMessage(failure));
      });
    return () => controller.abort();
  }, [page, attempt, token, onExpired, isSessionActive]);

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
                    isSessionActive={isSessionActive}
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
