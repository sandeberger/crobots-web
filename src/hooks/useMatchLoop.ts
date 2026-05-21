import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { MatchState, tickMatch } from '../engine/match';

const BASE_TICK_MS = 50;

export function useMatchLoop(running: boolean, speed: number) {
  const [match, setMatchState] = useState<MatchState | null>(null);
  const matchRef = useRef<MatchState | null>(null);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  const setMatch = useCallback((m: MatchState | null) => {
    matchRef.current = m;
    setMatchState(m);
  }, []);

  useEffect(() => {
    if (!running) return;
    if (!matchRef.current) return;
    let raf = 0;
    let last = performance.now();
    let accum = 0;

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      accum += dt;
      const tickMs = Math.max(0.05, BASE_TICK_MS / Math.max(1, speed));
      const m = matchRef.current;
      let ticked = 0;
      const cap = speed >= 100 ? 1500 : speed >= 50 ? 600 : 250;
      while (m && !m.finished && accum >= tickMs && ticked < cap) {
        tickMatch(m);
        accum -= tickMs;
        ticked++;
      }
      if (ticked > 0) forceRender();
      if (m && !m.finished) raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [running, speed]);

  return { match, setMatch, forceRender } as const;
}
