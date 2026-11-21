import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { useEntranceAnimation } from './hooks/useEntranceAnimation';
import { BoothPage } from './pages/BoothPage';
import { DevelopmentPreviewPage } from './pages/DevelopmentPreviewPage';
import { HomePage } from './pages/HomePage';
import { SharedPhotoPage } from './pages/SharedPhotoPage';

export function App() {
  const { pathname } = useLocation();
  const screen = useEntranceAnimation<HTMLDivElement>(pathname);

  useEffect(() => {
    screen.current?.querySelector('h1')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname, screen]);

  return (
    <div ref={screen} key={pathname} className="screen">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cabine" element={<BoothPage />} />
        <Route path="/foto/:secret?" element={<SharedPhotoPage />} />
        {import.meta.env.DEV && <Route path="/previa/:view" element={<DevelopmentPreviewPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
