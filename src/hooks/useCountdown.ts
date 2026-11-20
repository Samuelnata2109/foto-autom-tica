import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimerDuration } from '../types/photo';

type Countdown = { current: number; duration: TimerDuration; progress: number };

export function useCountdown() {
  const timer = useRef<number | undefined>(undefined);
  const [countdown, setCountdown] = useState<Countdown | null>(null);

  const clearTimer = useCallback(() => window.clearTimeout(timer.current), []);
  useEffect(() => clearTimer, [clearTimer]);

  const cancel = useCallback(() => {
    clearTimer();
    setCountdown(null);
  }, [clearTimer]);

  const start = useCallback(
    (duration: TimerDuration, complete: () => void) => {
      clearTimer();
      const total = duration * 1000;
      const deadline = performance.now() + total;

      function tick() {
        const remaining = deadline - performance.now();
        if (remaining <= 0) {
          setCountdown(null);
          complete();
          return;
        }
        const current = Math.ceil(remaining / 1000);
        setCountdown({ current, duration, progress: 1 - remaining / total });
        timer.current = window.setTimeout(tick, Math.max(1, remaining - (current - 1) * 1000));
      }

      setCountdown({ current: duration, duration, progress: 0 });
      timer.current = window.setTimeout(tick, 1000);
    },
    [clearTimer],
  );

  return { countdown, start, cancel };
}
