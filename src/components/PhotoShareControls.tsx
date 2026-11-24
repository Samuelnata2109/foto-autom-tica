import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from './Button';
import {
  createPhotoSecret,
  revokePhotoShare,
  shareStoredPhoto,
  type PhotoAccess,
} from '../services/privatePhotoStorage';
import { isPhotoSharingConfigured, photoShareLink } from '../services/photoShareLink';

export function PhotoShareControls({
  token,
  access,
  onNewSession,
}: {
  token: string | null;
  access: PhotoAccess;
  onNewSession: () => void;
}) {
  const pending = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const capability = useRef('');
  const [share, setShare] = useState<{ url: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [manualCopy, setManualCopy] = useState(false);
  const configured = isPhotoSharingConfigured();

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (!share) return;
    heading.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(
      () => {
        setShare(null);
        setNotice('O prazo de compartilhamento terminou.');
      },
      Math.max(0, Date.parse(share.expiresAt) - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [share]);

  async function update(action: 'create' | 'revoke') {
    if (!token || pending.current || (action === 'create' && !configured)) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    setNotice('');
    setManualCopy(false);
    try {
      if (action === 'revoke') {
        await revokePhotoShare(token, access, controller.signal);
        if (controller.signal.aborted) return;
        capability.current = '';
        setShare(null);
        setNotice('Compartilhamento revogado.');
      } else {
        const secret = (capability.current ||= createPhotoSecret());
        const url = photoShareLink(secret);
        if (!url) throw new Error('URL indisponível');
        const expiresAt = await shareStoredPhoto(token, access, secret, controller.signal);
        if (!controller.signal.aborted) setShare({ url, expiresAt });
      }
    } catch {
      if (!controller.signal.aborted)
        setError(
          action === 'create'
            ? 'Não foi possível gerar o link. Peça ajuda à equipe ou tente novamente.'
            : 'Não foi possível confirmar a revogação. Tente novamente.',
        );
    } finally {
      if (!controller.signal.aborted) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Link copiado.');
    } catch {
      setManualCopy(true);
    }
  }

  return (
    <section className="photo-share" aria-label="Compartilhamento da fotografia">
      {share ? (
        <>
          <h2 ref={heading} tabIndex={-1}>
            Escaneie o QR Code para receber sua foto
          </h2>
          <QRCodeSVG
            className="photo-share__qr"
            value={share.url}
            size={256}
            marginSize={4}
            title="QR Code da fotografia"
          />
          <p>
            Disponível até{' '}
            <time dateTime={share.expiresAt}>
              {new Date(share.expiresAt).toLocaleString('pt-BR')}
            </time>
            .
          </p>
          <div className="preview-actions">
            <Button disabled={busy} onClick={() => void copy(share.url)}>
              Copiar link
            </Button>
            <Button
              variant="secondary"
              disabled={busy || !token}
              onClick={() => void update('revoke')}
            >
              Revogar link
            </Button>
            <Button variant="secondary" disabled={busy} onClick={onNewSession}>
              Iniciar nova sessão
            </Button>
          </div>
          {manualCopy && (
            <label>
              Copie o link da fotografia{' '}
              <input value={share.url} readOnly onFocus={(event) => event.target.select()} />
            </label>
          )}
        </>
      ) : (
        <>
          {configured ? (
            <p>
              Você pode autorizar um link temporário. Qualquer pessoa com o link poderá baixar a foto
              até o prazo original ou a revogação.
            </p>
          ) : (
            <p id="photo-share-unavailable" role="status">
              QR Code indisponível: falta configurar um endereço público para esta cabine.
            </p>
          )}
          <Button
            aria-describedby={configured ? undefined : 'photo-share-unavailable'}
            disabled={busy || !token || !configured}
            onClick={() => void update('create')}
          >
            Autorizar compartilhamento e gerar QR Code
          </Button>
        </>
      )}
      {busy && <p role="status">Atualizando compartilhamento…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
