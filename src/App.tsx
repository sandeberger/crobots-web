import { useCallback, useEffect, useMemo, useState } from 'react';
import { Arena } from './components/Arena';
import { Controls } from './components/Controls';
import { Editor, EditorDiag } from './components/Editor';
import { EventLog } from './components/EventLog';
import { RobotSlots, Slot } from './components/RobotSlots';
import { Scoreboard } from './components/Scoreboard';
import { ROBOT_COLORS } from './engine/constants';
import { CompileIssue, prepareMatch, tickMatch } from './engine/match';
import { useMatchLoop } from './hooks/useMatchLoop';
import { BUILTIN_ROBOTS } from './robots';

const SPEED_PIPS = [1, 4, 16, 64, 250];

function initialSlots(): Slot[] {
  return [0, 1, 2, 3].map((i) => {
    const r = BUILTIN_ROBOTS[i % BUILTIN_ROBOTS.length];
    return {
      name: r.name,
      source: r.source,
      color: ROBOT_COLORS[i % ROBOT_COLORS.length],
      enabled: i < 2,
    };
  });
}

export default function App() {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [activeIdx, setActiveIdx] = useState(0);
  const [speed, setSpeed] = useState(4);
  const [running, setRunning] = useState(false);
  const [issues, setIssues] = useState<CompileIssue[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [matchFinished, setMatchFinished] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showScans, setShowScans] = useState(true);
  const [showTelemetry, setShowTelemetry] = useState(true);

  const { match, setMatch } = useMatchLoop(running, speed);

  const enabledSlots = useMemo(() => slots.filter((s) => s.enabled), [slots]);

  const updateSource = useCallback((i: number, src: string) => {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, source: src } : s)));
  }, []);

  const renameSlot = useCallback((i: number, name: string) => {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, name } : s)));
  }, []);

  const toggleSlot = useCallback((i: number) => {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, enabled: !s.enabled } : s)));
  }, []);

  const loadBuiltin = useCallback((i: number, name: string) => {
    const bot = BUILTIN_ROBOTS.find((b) => b.name === name);
    if (!bot) return;
    setSlots((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, name: bot.name, source: bot.source } : s)),
    );
  }, []);

  const prepare = useCallback((): boolean => {
    const active = slots
      .map((s, idx) => ({ s, idx }))
      .filter(({ s }) => s.enabled);
    if (active.length < 2) {
      setIssues([]);
      setMatch(null);
      setMatchFinished(false);
      setWinner(null);
      return false;
    }
    const { state, issues: iss } = prepareMatch({
      robots: active.map(({ s }) => ({ name: s.name, source: s.source, color: s.color })),
      seed: Math.floor(Math.random() * 0x7fffffff) | 0,
    });
    if (iss.length > 0) {
      const remapped = iss.map((e) => ({ ...e, slotIndex: active[e.slotIndex].idx }));
      setIssues(remapped);
      setMatch(null);
      setMatchFinished(false);
      setWinner(null);
      return false;
    }
    setIssues([]);
    setMatch(state);
    setMatchFinished(false);
    setWinner(null);
    return true;
  }, [slots, setMatch]);

  const handleStart = useCallback(() => {
    if (!match || match.finished) {
      const ok = prepare();
      if (!ok) return;
    }
    setRunning(true);
  }, [match, prepare]);

  const handlePause = useCallback(() => setRunning(false), []);

  const handleStep = useCallback(() => {
    if (!match || match.finished) {
      const ok = prepare();
      if (!ok) return;
    }
    if (match) {
      tickMatch(match);
      setMatch({ ...match });
    }
  }, [match, prepare, setMatch]);

  const handleReset = useCallback(() => {
    setRunning(false);
    prepare();
  }, [prepare]);

  const togglePlay = useCallback(() => {
    if (running) handlePause();
    else handleStart();
  }, [running, handlePause, handleStart]);

  const bumpSpeed = useCallback((dir: 1 | -1) => {
    setSpeed((cur) => {
      const i = SPEED_PIPS.indexOf(cur);
      const next = i === -1 ? 1 : Math.max(0, Math.min(SPEED_PIPS.length - 1, i + dir));
      return SPEED_PIPS[next];
    });
  }, []);

  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      if (el.closest('.cm-editor')) return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (helpOpen && e.key === 'Escape') {
        setHelpOpen(false);
        return;
      }
      if (isEditable(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          handleStep();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          handleReset();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          e.preventDefault();
          setActiveIdx(Number(e.key) - 1);
          break;
        case '?':
        case '/':
          e.preventDefault();
          setHelpOpen((v) => !v);
          break;
        case '+':
        case '=':
          e.preventDefault();
          bumpSpeed(1);
          break;
        case '-':
        case '_':
          e.preventDefault();
          bumpSpeed(-1);
          break;
        case 'x':
        case 'X':
          e.preventDefault();
          setShowScans((v) => !v);
          break;
        case 't':
        case 'T':
          e.preventDefault();
          setShowTelemetry((v) => !v);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, togglePlay, handleStep, handleReset, bumpSpeed]);

  useEffect(() => {
    if (match?.finished && !matchFinished) {
      setMatchFinished(true);
      setRunning(false);
      setWinner(match.winner ? match.winner.name : null);
    }
  }, [match, matchFinished]);

  const activeSlot = slots[activeIdx];
  const activeIssue = issues.find((i) => i.slotIndex === activeIdx);
  const editorDiag: EditorDiag | null = activeIssue
    ? { line: activeIssue.line, col: activeIssue.col, message: activeIssue.message }
    : null;

  const errorIdxSet = useMemo(() => new Set(issues.map((i) => i.slotIndex)), [issues]);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-icon">⬢</span>
          <span>CROBOTS</span>
          <span className="brand-sub">// NEON ARENA</span>
        </div>
        <Controls
          running={running}
          finished={matchFinished}
          hasMatch={!!match}
          speed={speed}
          showScans={showScans}
          showTelemetry={showTelemetry}
          onStart={handleStart}
          onPause={handlePause}
          onStep={handleStep}
          onReset={handleReset}
          onSpeedChange={setSpeed}
          onToggleScans={() => setShowScans((v) => !v)}
          onToggleTelemetry={() => setShowTelemetry((v) => !v)}
          onShowHelp={() => setHelpOpen(true)}
        />
      </header>

      <main className="main">
        <aside className="left">
          <RobotSlots
            slots={slots}
            activeIdx={activeIdx}
            errorIdxSet={errorIdxSet}
            onSelect={setActiveIdx}
            onToggle={toggleSlot}
            onRename={renameSlot}
            onLoadBuiltin={loadBuiltin}
          />
          {showTelemetry && <EventLog state={match} />}
        </aside>

        <section className="center">
          <Arena state={match} showScans={showScans} />
          {winner !== null && matchFinished && (
            <div className={`winner-banner ${winner ? '' : 'draw'}`}>
              {winner ? `◆ Victor: ${winner}` : '✕ Stalemate'}
            </div>
          )}
          {enabledSlots.length < 2 && (
            <div className="info-banner">Aktivera minst 2 robotar för att starta match</div>
          )}
          {issues.length > 0 && (
            <div className="error-banner">
              Kompileringsfel: {issues.map((i) => `${i.name} (rad ${i.line})`).join(', ')}
            </div>
          )}
        </section>

        <aside className="right">
          <Scoreboard state={match} />
        </aside>
      </main>

      <section className="editor-wrap">
        <div className="editor-header">
          <span className="color-dot" style={{ background: activeSlot.color, color: activeSlot.color }} />
          <span className="editor-slot-tag">
            Slot {activeIdx + 1} · {activeSlot.name}
          </span>
          {activeIssue && (
            <span className="editor-err">
              ⚠ rad {activeIssue.line}: {activeIssue.message}
            </span>
          )}
        </div>
        <Editor
          key={activeIdx}
          value={activeSlot.source}
          onChange={(v) => updateSource(activeIdx, v)}
          diag={editorDiag}
        />
      </section>

      {helpOpen && (
        <div className="help-overlay" onClick={() => setHelpOpen(false)}>
          <div className="help-card" onClick={(e) => e.stopPropagation()}>
            <h2>Tangentbordsgenvägar</h2>
            <div className="help-row"><span>Play / pause</span><span className="help-key">Space</span></div>
            <div className="help-row"><span>Steg ett tick</span><span className="help-key">S</span></div>
            <div className="help-row"><span>Reset</span><span className="help-key">R</span></div>
            <div className="help-row"><span>Byt slot</span><span className="help-key">1 – 4</span></div>
            <div className="help-row"><span>Öka / sänk speed</span><span className="help-key">+ / –</span></div>
            <div className="help-row"><span>Skanner-svep på/av</span><span className="help-key">X</span></div>
            <div className="help-row"><span>Telemetri-logg på/av</span><span className="help-key">T</span></div>
            <div className="help-row"><span>Hjälp</span><span className="help-key">?</span></div>
            <button className="btn help-close" onClick={() => setHelpOpen(false)}>Stäng (Esc)</button>
          </div>
        </div>
      )}
    </div>
  );
}
