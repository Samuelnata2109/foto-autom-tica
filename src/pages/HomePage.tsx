import { Aperture, ArrowRight, Camera, Hand, Image } from 'lucide-react';
import { Brand } from '../components/Brand';
import { ButtonLink } from '../components/Button';
import { FramingGuides } from '../components/CameraViewport';
import { storageConfigured } from '../services/privatePhotoStorage';

export function HomePage() {
  return (
    <main className="welcome">
      <header className="welcome__header">
        <Brand />
      </header>
      <div className="welcome__content">
        <section className="welcome__intro">
          <h1 tabIndex={-1}>
            Seu momento. <br />
            <span>Sua melhor foto.</span>
          </h1>
          <p>Uma cabine fotográfica para guardar os melhores momentos do seu evento escolar.</p>
          <ButtonLink to="/cabine">
            Iniciar experiência <ArrowRight size={21} aria-hidden="true" />
          </ButtonLink>
          <ul className="welcome__features" aria-label="Recursos previstos">
            <li>
              <Camera size={17} aria-hidden="true" /> Fotos
            </li>
            <li>
              <Hand size={17} aria-hidden="true" /> Gestos
            </li>
            <li>
              <Image size={17} aria-hidden="true" /> Personalização
            </li>
          </ul>
          {storageConfigured && (
            <ButtonLink to="/equipe" variant="quiet">
              Painel da equipe
            </ButtonLink>
          )}
        </section>
        <div className="welcome__viewfinder" aria-hidden="true">
          <FramingGuides />
          <div className="welcome__lens">
            <Aperture strokeWidth={1.15} />
          </div>
        </div>
      </div>
    </main>
  );
}
