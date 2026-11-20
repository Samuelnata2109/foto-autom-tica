import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { useFullscreen } from '../hooks/useFullscreen';
import { Brand } from './Brand';
import { ButtonLink, IconButton } from './Button';

export function BoothHeader() {
  const { active, supported, error, toggle } = useFullscreen();
  return (
    <header className="booth-header">
      <Brand />
      <div className="booth-header__actions">
        <IconButton
          label={
            supported ? (active ? 'Sair da tela cheia' : 'Tela cheia') : 'Tela cheia indisponível'
          }
          disabled={!supported}
          onClick={() => void toggle()}
        >
          {active ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
        </IconButton>
        <ButtonLink to="/" variant="quiet">
          <ArrowLeft size={18} aria-hidden="true" /> Início
        </ButtonLink>
      </div>
      {error && (
        <p className="booth-header__error" role="alert">
          {error}
        </p>
      )}
    </header>
  );
}
