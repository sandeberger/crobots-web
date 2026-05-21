import { useEffect, useRef } from 'react';
import { sfx } from '../audio/sfx';
import { MatchState } from '../engine/match';

const MAX_FIRES_PER_FRAME = 3;
const MAX_BOOMS_PER_FRAME = 3;
const MAX_SCANS_PER_FRAME = 2;
const MAX_CRASHES_PER_FRAME = 2;
const TURN_THRESHOLD_DEG = 1;

export function useSfx(match: MatchState | null, muted: boolean, running: boolean) {
  const lastFires = useRef(0);
  const lastBooms = useRef(0);
  const lastScans = useRef(0);
  const lastDeaths = useRef(0);
  const lastHeadings = useRef<Record<number, number>>({});

  useEffect(() => {
    sfx.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (!match) {
      lastFires.current = 0;
      lastBooms.current = 0;
      lastScans.current = 0;
      lastDeaths.current = 0;
      lastHeadings.current = {};
      sfx.stopAllMotors();
      return;
    }

    const arena = match.arena;

    const dFires = Math.max(0, arena.totalFires - lastFires.current);
    const dBooms = Math.max(0, arena.totalExplosions - lastBooms.current);
    const dScans = Math.max(0, arena.totalScans - lastScans.current);
    const dCrashes = Math.max(0, arena.totalDeaths - lastDeaths.current);
    lastFires.current = arena.totalFires;
    lastBooms.current = arena.totalExplosions;
    lastScans.current = arena.totalScans;
    lastDeaths.current = arena.totalDeaths;

    if (running || dFires + dBooms + dScans + dCrashes > 0) {
      const fires = Math.min(dFires, MAX_FIRES_PER_FRAME);
      const booms = Math.min(dBooms, MAX_BOOMS_PER_FRAME);
      const scans = Math.min(dScans, MAX_SCANS_PER_FRAME);
      const crashes = Math.min(dCrashes, MAX_CRASHES_PER_FRAME);
      for (let i = 0; i < fires; i++) sfx.cannon();
      for (let i = 0; i < booms; i++) sfx.boom();
      for (let i = 0; i < scans; i++) sfx.scan();
      for (let i = 0; i < crashes; i++) sfx.crash();
    }

    let servoTriggered = false;
    for (const r of arena.robots) {
      const prevH = lastHeadings.current[r.id];
      if (r.alive && r.capabilities.drive) {
        if (
          prevH !== undefined &&
          !servoTriggered &&
          angleDiff(prevH, r.heading) >= TURN_THRESHOLD_DEG &&
          running
        ) {
          sfx.servo();
          servoTriggered = true;
        }
      }
      lastHeadings.current[r.id] = r.heading;

      if (running && r.alive && r.capabilities.drive) {
        sfx.motor(r.id, r.speed);
      } else {
        sfx.motor(r.id, 0);
      }
    }
  }, [match, match?.arena.tick, running, muted]);

  useEffect(
    () => () => {
      sfx.stopAllMotors();
    },
    [],
  );
}

function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}
