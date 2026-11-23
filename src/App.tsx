import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useMatch } from 'react-router';
import { useEntranceAnimation } from './hooks/useEntranceAnimation';
import { AdminPage } from './pages/AdminPage';
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
          <Route index element={<OfficialStoriesPage />} />
          <Route path="stories" element={<Navigate to="/equipe" replace />} />
        </Route>
        {import.meta.env.DEV && <Route path="/previa/:view" element={<DevelopmentPreviewPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
