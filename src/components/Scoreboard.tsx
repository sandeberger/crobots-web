import { MatchState } from '../engine/match';

export function Scoreboard({ state }: { state: MatchState | null }) {
  if (!state || state.arena.robots.length === 0) {
    return (
      <div>
        <div className="section-header amber">Status</div>
        <div className="scoreboard-empty">— no match loaded —</div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header amber">Status</div>
      <div className="scoreboard">
        {state.arena.robots.map((r) => {
          const hp = 100 - r.damage;
          const hpColor = r.damage < 40 ? '#7cff6b' : r.damage < 75 ? '#ffc857' : '#ff3860';
          return (
            <div
              key={r.id}
              className={`score-row ${r.alive ? '' : 'dead'}`}
              style={{ ['--robot-color' as string]: r.color }}
            >
              <div className="score-head">
                <span className="color-dot" style={{ background: r.color, color: r.color }} />
                <span className="score-name">{r.name.toUpperCase()}</span>
                <span className={`score-pct ${r.alive ? '' : 'kia'}`}>
                  {r.alive ? `${hp}%` : 'KIA'}
                </span>
              </div>
              <div className="dmg-bar">
                <div
                  className="dmg-fill"
                  style={{ width: `${hp}%`, background: hpColor, color: hpColor }}
                />
              </div>
              <div className="score-meta">
                <span>
                  X{Math.round(r.x).toString().padStart(3, '0')} · Y{Math.round(r.y).toString().padStart(3, '0')}
                </span>
                <span>{Math.round(r.speed).toString().padStart(3, '0')}%</span>
                <span>{r.heading.toString().padStart(3, '0')}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
