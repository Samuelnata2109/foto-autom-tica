import { useEffect, useRef, useState } from 'react';
import { Download, Send, Share2 } from 'lucide-react';
import { PhotoStorageError, readSharedPhoto } from '../services/privatePhotoStorage';
import { composeStory, downloadJpeg, shareStory } from '../services/storyImage';
import { submitOfficialStory } from '../services/storyStorage';
import { Button } from './Button';

const shareMessage = {
  'handed-off':
    'Arquivo entregue ao compartilhamento do dispositivo. Conclua no aplicativo escolhido.',
  unavailable:
    'Seu navegador não compartilha arquivos. Baixe a imagem e abra os Stories no Instagram.',
  cancelled: 'Compartilhamento cancelado. O download continua disponível.',
  failed: 'Não foi possível compartilhar. Baixe a imagem e abra os Stories no Instagram.',
};

export function StoryOptions({
  secret,
  deadline,
  onUnavailable,
}: {
  secret: string;
  deadline: number;
  onUnavailable: () => void;
}) {
  const [mode, setMode] = useState<'personal' | 'official' | null>(null);
  const [story, setStory] = useState<{ file: File; url: string; deadline: number } | null>(null);
  const [busy, setBusy] = useState<'prepare' | 'share' | 'submit' | 'download' | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [receipt, setReceipt] = useState<'received' | 'duplicate' | null>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (story) return () => URL.revokeObjectURL(story.url);
  }, [story]);

  function available() {
    if (performance.now() < Math.min(deadline, story?.deadline ?? deadline)) return true;
    onUnavailable();
    return false;
  }

  async function perform(task: NonNullable<typeof busy>) {
    if (pending.current || !available()) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(task);
    setError('');
    setNote('');
    try {
      if (task === 'prepare') {
        const photo = await readSharedPhoto(secret, controller.signal);
        if (controller.signal.aborted) return;
        if (performance.now() >= photo.deadline) throw new PhotoStorageError(404);
        const file = await composeStory(photo.image);
        if (!controller.signal.aborted && available()) {
          if (performance.now() >= photo.deadline) throw new PhotoStorageError(404);
          setStory({ file, url: URL.createObjectURL(file), deadline: photo.deadline });
        }
      } else if (task === 'share' && story) {
        const result = await shareStory(story.file);
        if (!controller.signal.aborted) setNote(shareMessage[result]);
      } else if (task === 'download' && story) {
        const photo = await readSharedPhoto(secret, controller.signal);
        if (controller.signal.aborted) return;
        if (performance.now() >= photo.deadline) throw new PhotoStorageError(404);
        if (available()) downloadJpeg(story.file, story.file.name);
      } else if (task === 'submit' && consent) {
        const result = await submitOfficialStory(secret, consent, controller.signal);
        if (!controller.signal.aborted) setReceipt(result);
      }
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure instanceof PhotoStorageError && failure.status === 404) onUnavailable();
      else if (failure instanceof PhotoStorageError && failure.status === 429)
        setError('Limite de acessos atingido. Aguarde um minuto e tente novamente.');
      else
        setError(
          task === 'submit'
            ? 'Não foi possível confirmar o envio. Confira sua conexão e tente novamente.'
            : task === 'download'
              ? 'Não foi possível baixar o Story. Confira sua conexão e tente novamente.'
              : 'Não foi possível preparar o Story. Confira sua conexão e tente novamente.',
        );
    } finally {
      if (!controller.signal.aborted) {
        pending.current = null;
        setBusy(null);
      }
    }
  }

  function choose(choice: 'personal' | 'official') {
    setMode(choice);
    setNote('');
    setError('');
    setConsent(false);
    if (!story) void perform('prepare');
  }

  return (
    <section className="story-section" aria-labelledby="stories-heading">
      <h2 id="stories-heading">Compartilhar nos Stories</h2>
      <div className="preview-actions">
        <Button
          variant={mode === 'personal' ? 'primary' : 'secondary'}
          aria-pressed={mode === 'personal'}
          disabled={busy !== null}
          onClick={() => choose('personal')}
        >
          <Share2 size={18} aria-hidden="true" /> Compartilhar nos meus Stories
        </Button>
        <Button
          variant={mode === 'official' ? 'primary' : 'secondary'}
          aria-pressed={mode === 'official'}
          disabled={busy !== null}
          onClick={() => choose('official')}
        >
          <Send size={18} aria-hidden="true" /> Enviar para os Stories oficiais
        </Button>
      </div>
      {busy === 'prepare' && <p role="status">Gerando Story…</p>}
      {error && <p role="alert">{error}</p>}
      {story && mode && (
        <div className="story-section__body">
          <figure className="story-preview">
            <img src={story.url} alt="Prévia vertical da fotografia para os Stories" />
            <figcaption role="status">Story pronto · 1080 × 1920</figcaption>
          </figure>
          <div className="story-section__details">
            {mode === 'personal' ? (
              <>
                <p>
                  Escolha o Instagram se ele aparecer nas opções do dispositivo. Você também pode
                  baixar a imagem e selecioná-la na galeria ao criar um Story.
                </p>
                <div className="preview-actions">
                  {typeof navigator.share === 'function' && (
                    <Button disabled={busy !== null} onClick={() => void perform('share')}>
                      {busy === 'share' ? 'Abrindo compartilhamento…' : 'Abrir compartilhamento'}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    disabled={busy !== null}
                    onClick={() => void perform('download')}
                  >
                    <Download size={18} aria-hidden="true" />{' '}
                    {busy === 'download' ? 'Preparando download…' : 'Baixar Story em JPEG'}
                  </Button>
                </div>
                {note && <p role="status">{note}</p>}
              </>
            ) : receipt ? (
              <p role="status">
                {receipt === 'received'
                  ? 'Solicitação recebida. A equipe vai analisar o envio.'
                  : 'Já existe uma solicitação para esta fotografia.'}
              </p>
            ) : (
              <form
                className="story-section__details"
                onSubmit={(event) => {
                  event.preventDefault();
                  void perform('submit');
                }}
              >
                <p>
                  A equipe poderá publicar esta foto nos Stories do perfil oficial do evento.
                  Pessoas que acompanham o perfil poderão vê-la.
                </p>
                <p>
                  Se a foto incluir menores de idade, fale com a equipe e com os responsáveis antes
                  de enviar.
                </p>
                <label className="story-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    required
                    disabled={busy !== null}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  Autorizo o envio para análise e a possível publicação pública nos Stories do
                  perfil oficial do evento.
                </label>
                <Button type="submit" disabled={!consent || busy !== null}>
                  {busy === 'submit' ? 'Enviando solicitação…' : 'Confirmar envio para análise'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
