import { useMemo } from 'react';
import { MatchState } from '../engine/match';

type LogLine = {
  key: string;
  kind: 'fire' | 'explosion' | 'damage' | 'death';
  tick: number;
  text: string;
};

export function EventLog({ state }: { state: MatchState | null }) {
  const lines = useMemo<LogLine[]>(() => {
    if (!state) return [];
    const robots = state.arena.robots;
    const nameOf = (id: number) =>
      (robots.find((r) => r.id === id)?.name ?? `#${id}`).toUpperCase();
    const recent = state.arena.events.slice(-14).reverse();
    return recent.map((e, idx) => {
      const key = `${e.tick}-${idx}-${e.kind}`;
      switch (e.kind) {
        case 'fire':
          return {
            key,
            kind: 'fire',
            tick: e.tick,
            text: `${nameOf(e.robotId)} → fire @ ${e.heading}° / ${e.range}m`,
          };
        case 'explosion':
          return {
            key,
            kind: 'explosion',
            tick: e.tick,
            text: `boom (${Math.round(e.x)}, ${Math.round(e.y)})`,
          };
        case 'damage':
          return {
            key,
            kind: 'damage',
            tick: e.tick,
            text: `${nameOf(e.robotId)} -${e.amount}% (${e.cause})`,
          };
        case 'death':
          return {
            key,
            kind: 'death',
            tick: e.tick,
            text: `${nameOf(e.robotId)}  KIA`,
          };
      }
    });
  }, [state, state?.arena.tick, state?.arena.events.length]);

  return (
    <div className="eventlog">
      <div className="section-header magenta">Telemetry</div>
      <div className="eventlog-body">
        {lines.length === 0 ? (
          <div className="muted">— no signal —</div>
        ) : (
          lines.map((l) => (
            <div key={l.key} className={`eventlog-line k-${l.kind}`}>
              <span className="eventlog-tick">t{l.tick.toString().padStart(4, '0')}</span>
              {l.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
