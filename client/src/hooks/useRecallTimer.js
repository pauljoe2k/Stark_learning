import { useEffect, useRef, useState } from 'react';

export function useRecallTimer(seconds, active, onExpire) {
  const [remaining, setRemaining] = useState(seconds);
  const expired = useRef(false);
  useEffect(() => {
    setRemaining(seconds);
    expired.current = false;
  }, [seconds]);
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (active && remaining === 0 && !expired.current) {
      expired.current = true;
      onExpire?.();
    }
  }, [active, remaining, onExpire]);
  return remaining;
}