import { useState } from 'react';
import { ArrowRight, Check, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Navigate, NavLink, useParams } from 'react-router';
import { BoothHeader } from '../components/BoothHeader';
import { Button, ButtonLink } from '../components/Button';
import { CameraViewport } from '../components/CameraViewport';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { PhotoPreview } from '../components/PhotoPreview';
import { SharingPanel } from '../components/SharingPanel';

function CountdownPreview() {
  const [cancelled, setCancelled] = useState(false);
  return (
    <>
      <CameraViewport
        overlay={
          <CountdownOverlay
            current={3}
            duration={5}
            progress={0.4}
            guidance="Olhe para a câmera"
            cancelled={cancelled}
            onCancel={() => setCancelled(true)}
          />
        }
      />
      {cancelled && (
        <div className="preview-actions">
          <Button variant="secondary" onClick={() => setCancelled(false)}>
            Restaurar exemplo
          </Button>
        </div>
      )}
    </>
  );
}

function ReviewPreview() {
  return (
    <>
      <PhotoPreview />
      <div className="preview-actions">
        <ButtonLink to="/cabine" variant="secondary">
          <RotateCcw size={18} aria-hidden="true" /> Tirar novamente
        </ButtonLink>
        <Button variant="secondary" disabled aria-describedby="review-availability">
          <SlidersHorizontal size={18} aria-hidden="true" /> Personalizar
        </Button>
        <Button disabled aria-describedby="review-availability">
          <Check size={18} aria-hidden="true" /> Confirmar foto
        </Button>
      </div>
      <p id="review-availability">Confirmação na Etapa 04. Personalização na Etapa 06.</p>
    </>
  );
}

function SharingPreview() {
  return (
    <>
      <div className="sharing-grid">
        <PhotoPreview />
        <SharingPanel />
      </div>
      <div className="preview-actions">
        <ButtonLink to="/">
          Finalizar experiência <ArrowRight size={18} aria-hidden="true" />
        </ButtonLink>
      </div>
    </>
  );
}

const views = {
  contagem: { title: 'Contagem regressiva', component: CountdownPreview },
  revisao: { title: 'Revisão da foto', component: ReviewPreview },
  compartilhamento: { title: 'Compartilhamento', component: SharingPreview },
};

function isPreview(view: string | undefined): view is keyof typeof views {
  return view === 'contagem' || view === 'revisao' || view === 'compartilhamento';
}

export function DevelopmentPreviewPage() {
  const { view } = useParams();
  if (!isPreview(view)) return <Navigate to="/cabine" replace />;
  const { title, component: Screen } = views[view];

  return (
    <div className="booth-shell">
      <BoothHeader />
      <main className="preview-main">
        <p className="preview-notice">
          <strong>Prévia de desenvolvimento</strong> · Exemplo visual. Nenhuma foto é capturada.
        </p>
        <nav className="preview-nav" aria-label="Telas em desenvolvimento">
          {Object.entries(views).map(([route, { title }]) => (
            <NavLink key={route} to={'/previa/' + route}>
              {title}
            </NavLink>
          ))}
        </nav>
        <h1 tabIndex={-1}>{title}</h1>
        <Screen />
      </main>
    </div>
  );
}
