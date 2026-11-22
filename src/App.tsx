import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useMatch } from 'react-router';
import { useEntranceAnimation } from './hooks/useEntranceAnimation';
import { AdminPage, AdminSection } from './pages/AdminPage';
import { BoothPage } from './pages/BoothPage';
import { DevelopmentPreviewPage } from './pages/DevelopmentPreviewPage';
import { HomePage } from './pages/HomePage';
import { OfficialStoriesPage } from './pages/OfficialStoriesPage';
import { SharedPhotoPage } from './pages/SharedPhotoPage';

export function App() {
  const { pathname } = useLocation();
  const screenKey = useMatch('/equipe/*') ? '/equipe' : pathname;
  const screen = useEntranceAnimation<HTMLDivElement>(screenKey);

  useEffect(() => {
    screen.current?.querySelector('h1')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname, screen]);

  return (
    <div ref={screen} key={screenKey} className="screen">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cabine" element={<BoothPage />} />
        <Route path="/foto/:secret?" element={<SharedPhotoPage />} />
        <Route path="/equipe" element={<AdminPage />}>
          <Route
            index
            element={
              <AdminSection
                title="Visão geral"
                description="Acompanhe as solicitações em Stories oficiais. Os indicadores operacionais estarão disponíveis em uma próxima fase."
              />
            }
          />
          <Route
            path="eventos"
            element={
              <AdminSection
                title="Eventos e recursos"
                description="A configuração de eventos e recursos estará disponível em uma próxima fase."
              />
            }
          />
          <Route path="stories" element={<OfficialStoriesPage />} />
          <Route
            path="auditoria"
            element={
              <AdminSection
                title="Auditoria"
                description="O histórico de ações administrativas estará disponível em uma próxima fase."
              />
            }
          />
        </Route>
        {import.meta.env.DEV && <Route path="/previa/:view" element={<DevelopmentPreviewPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
