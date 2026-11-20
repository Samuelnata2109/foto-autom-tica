import { useLayoutEffect, useRef } from 'react';
import { animate } from 'motion/mini';

export function useEntranceAnimation<T extends HTMLElement>(key: string | number | undefined) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (key === undefined || !element || typeof element.animate !== 'function') return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) return;

    const animation = animate(
      element,
      { opacity: [0, 1], transform: ['translateY(6px)', 'none'] },
      { duration: 0.23, ease: 'easeOut' },
    );
    const onPreferenceChange = () => {
      if (preference.matches) animation.cancel();
    };
    preference.addEventListener('change', onPreferenceChange);
    return () => {
      preference.removeEventListener('change', onPreferenceChange);
      animation.cancel();
    };
  }, [key]);

  return ref;
}
