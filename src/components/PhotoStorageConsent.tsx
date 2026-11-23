import { useEffect, useRef, useState } from 'react';
import type { SessionPhoto } from '../types/photo';
import {
  createPhotoAccess,
  deleteStoredPhoto,
  PhotoStorageError,
  storeConfirmedPhoto,
  type PhotoAccess,
} from '../services/privatePhotoStorage';
import { Button } from './Button';
import { OperatorLogin } from './OperatorLogin';
import { PhotoShareControls } from './PhotoShareControls';
import { sharingConfigured } from '../services/photoShareLink';

export function StorageOperator({
  token,
  onToken,
}: {
  token: string | null;
  onToken: (token: string | null) => void;
}) {
  return (
    <details className="gesture-diagnostics">
      <summary>Acesso da equipe</summary>
      {token ? (
        <Button variant="secondary" onClick={() => onToken(null)}>
          Desconectar armazenamento
        </Button>
      ) : (
        <OperatorLogin
          label="Habilitar armazenamento"
          failureMessage="A equipe não pôde entrar. A cabine continua disponível localmente."
          onSession={({ token }) => onToken(token)}
        />
      )}
    </details>
  );
}
type Stage =
  | 'choice'
  | 'declined'
  | 'sending'
  | 'stored'
  | 'uploadError'
  | 'removing'
  | 'pending'
  | 'removeError'
  | 'removed';

export function PhotoStorageConsent({
  photo,
  token,
  onNewSession,
}: {
  photo: SessionPhoto;
  token: string | null;
  onNewSession?: () => void;
}) {
  const [stage, setStage] = useState<Stage>('choice');
  const [expiresAt, setExpiresAt] = useState('');
  const [storedAccess, setStoredAccess] = useState<PhotoAccess | null>(null);
  const [error, setError] = useState('');
  const scope = useRef<PhotoAccess | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function perform(action: 'upload' | 'delete') {
    if (!token || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setStage(action === 'upload' ? 'sending' : 'removing');
    setError('');
    try {
      const access = (scope.current ??= createPhotoAccess());
      if (action === 'delete') {
        setStage(
          (await deleteStoredPhoto(token, access, controller.signal)) ? 'removed' : 'pending',
        );
      } else {
        setExpiresAt(await storeConfirmedPhoto(token, access, photo, controller.signal));
        setStoredAccess(access);
        setStage('stored');
      }
    } catch (failure) {
      if (controller.signal.aborted) return;
      setStage(action === 'upload' ? 'uploadError' : 'removeError');
      const reauth = failure instanceof PhotoStorageError && failure.status === 401;
      setError(
        reauth
          ? 'Peça à equipe para entrar novamente.'
          : action === 'delete'
            ? 'Não foi possível confirmar a exclusão. Tente novamente.'
            : 'Não foi possível confirmar o envio. Sua foto continua disponível na cabine.',
      );
    } finally {
      if (!controller.signal.aborted) pending.current = null;
    }
  }

  const canUpload = stage === 'choice' || stage === 'uploadError';
  const canDelete = ['stored', 'uploadError', 'pending', 'removeError'].includes(stage);
  return (
    <section aria-label="Armazenamento temporário" className="photo-review">
      {canUpload && (
        <p>
          Se você autorizar, a foto será armazenada em privado por até 24 horas e excluída
          automaticamente. Você pode continuar sem armazenar.
        </p>
      )}
      {!token && (canUpload || canDelete) && (
        <p>Armazenamento indisponível. Peça ajuda à equipe se precisar.</p>
      )}
      {stage === 'declined' && <p role="status">A foto permanece nesta sessão local.</p>}
      {stage === 'sending' && <p role="status">Enviando foto…</p>}
      {stage === 'stored' && (
        <p role="status">
          Foto armazenada. Acesso até{' '}
          <time dateTime={expiresAt}>{new Date(expiresAt).toLocaleString('pt-BR')}</time>.
        </p>
      )}
      {stage === 'removing' && <p role="status">Solicitando exclusão…</p>}
      {stage === 'pending' && (
        <p role="status">Acesso revogado. A remoção será repetida pelo servidor.</p>
      )}
      {stage === 'removed' && <p role="status">A cópia armazenada foi excluída.</p>}
      {error && <p role="alert">{error}</p>}
      {sharingConfigured &&
        storedAccess &&
        onNewSession &&
        ['stored', 'removing', 'removeError'].includes(stage) && (
          <div hidden={stage === 'removing'}>
            <PhotoShareControls token={token} access={storedAccess} onNewSession={onNewSession} />
          </div>
        )}
      <div className="preview-actions">
        {canUpload && (
          <Button onClick={() => void perform('upload')} disabled={!token}>
            {stage === 'choice' ? 'Autorizar e armazenar' : 'Tentar envio novamente'}
          </Button>
        )}
        {stage === 'choice' && (
          <Button variant="secondary" onClick={() => setStage('declined')}>
            Continuar sem armazenar
          </Button>
        )}
        {canDelete && (
          <Button variant="secondary" onClick={() => void perform('delete')} disabled={!token}>
            Excluir cópia armazenada
          </Button>
        )}
      </div>
    </section>
  );
}
