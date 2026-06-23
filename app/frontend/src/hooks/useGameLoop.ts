import { useEffect, useRef } from 'react';

export function useGameLoop(callback: () => void, active: boolean, fpsLimit = 60) {
  const requestRef = useRef<number>(0);
  const callbackRef = useRef(callback);
  const lastFrameRef = useRef<number>(0);
  const minFrameDelay = 1000 / Math.max(1, fpsLimit);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!active) return;

    const loop = () => {
      const now = performance.now();
      if (now - lastFrameRef.current >= minFrameDelay) {
        lastFrameRef.current = now;
        callbackRef.current();
      }
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [active, minFrameDelay]);
}
