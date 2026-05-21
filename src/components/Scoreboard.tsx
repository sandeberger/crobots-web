import { MatchState } from '../engine/match';

export interface ScoreboardProps {
  state: MatchState | null;
  winHistory: Record<string, number>;
  draws: number;
  matchCount: number;
}

export function Scoreboard({ state, winHistory, draws, matchCount }: ScoreboardProps) {
  const hasHistory = matchCount > 0;

  if (!state || state.arena.robots.length === 0) {
    return (
      <div>
        <div className="section-header amber">Status</div>
        <div className="scoreboard-empty">— no match loaded —</div>
        {hasHistory && <HistoryFooter draws={draws} matchCount={matchCount} />}
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
          const wins = winHistory[r.name] ?? 0;
          return (
            <div
              key={r.id}
              className={`score-row ${r.alive ? '' : 'dead'}`}
              style={{ ['--robot-color' as string]: r.color }}
            >
              <div className="score-head">
                <span className="color-dot" style={{ background: r.color, color: r.color }} />
                <span className="score-name">{r.name.toUpperCase()}</span>
                {wins > 0 && (
                  <span className="score-wins" title={`${wins} vinst${wins === 1 ? '' : 'er'}`}>
                    ✦ {wins}
                  </span>
                )}
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
      {hasHistory && <HistoryFooter draws={draws} matchCount={matchCount} />}
    </div>
  );
}

function HistoryFooter({ draws, matchCount }: { draws: number; matchCount: number }) {
  return (
    <div className="history-footer">
      <span className="history-label">Matcher</span>
      <span className="history-value">{matchCount}</span>
      {draws > 0 && (
        <>
          <span className="history-divider">·</span>
          <span className="history-label">Oavgjort</span>
          <span className="history-value">{draws}</span>
        </>
      )}
    </div>
  );
}
