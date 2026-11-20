import { useEffect, useState } from 'react';

export function useFullscreen() {
  const [active, setActive] = useState(() => Boolean(document.fullscreenElement));
  const [error, setError] = useState('');
  const supported = Boolean(document.fullscreenEnabled);

  useEffect(() => {
    const update = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  async function toggle() {
    if (!supported) return;
    setError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setError('Não foi possível alterar o modo de tela cheia.');
    }
  }

  return { active, supported, error, toggle };
}
