import { useCallback, useEffect, useMemo, useState } from 'react';
import { sfx } from './audio/sfx';
import { Arena } from './components/Arena';
import { Controls } from './components/Controls';
import { Editor, EditorDiag } from './components/Editor';
import { EventLog } from './components/EventLog';
import { RobotPicker } from './components/RobotPicker';
import { RobotSlots, Slot } from './components/RobotSlots';
import { Scoreboard } from './components/Scoreboard';
import { VoicePicker } from './components/VoicePicker';
import { ROBOT_COLORS } from './engine/constants';
import { CompileIssue, prepareMatch, tickMatch } from './engine/match';
import { useCommentator } from './hooks/useCommentator';
import { useMatchLoop } from './hooks/useMatchLoop';
import { useSfx } from './hooks/useSfx';
import { BUILTIN_ROBOTS, ROBOT_INDEX, computeSpeakable, loadRobotSource } from './robots';

const SPEED_PIPS = [1, 4, 16, 64, 250];
const ZOOM_LEVELS = [1, 1.5, 2, 3];

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
  const [zoom, setZoom] = useState(1);
  const [winHistory, setWinHistory] = useState<Record<string, number>>({});
  const [draws, setDraws] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [autoContinue, setAutoContinue] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  );
  const [voiceName, setVoiceName] = useState('');
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<'normal' | 'minimized' | 'expanded'>('normal');

  const { match, setMatch } = useMatchLoop(running, speed);

  const speakableByName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of slots) m[s.name] = computeSpeakable(s.name);
    return m;
  }, [slots]);

  useSfx(match, audioMuted, running);
  useCommentator({ match, running, enabled: voiceEnabled, voiceName, speakableByName });

  useEffect(() => {
    const unlock = () => sfx.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const enabledSlots = useMemo(() => slots.filter((s) => s.enabled), [slots]);

  const slotsSignature = useMemo(
    () => slots.map((s) => `${s.enabled ? '+' : '-'}${s.name}\0${s.source}`).join('|'),
    [slots],
  );

  useEffect(() => {
    setWinHistory({});
    setDraws(0);
    setMatchCount(0);
  }, [slotsSignature]);

  const updateSource = useCallback((i: number, src: string) => {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, source: src } : s)));
  }, []);

  const renameSlot = useCallback((i: number, name: string) => {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, name } : s)));
  }, []);

  const toggleSlot = useCallback((i: number) => {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, enabled: !s.enabled } : s)));
  }, []);

  const loadIntoSlot = useCallback((i: number, name: string, source: string) => {
    setSlots((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, name, source } : s)),
    );
  }, []);

  const saveActiveSource = useCallback(() => {
    const slot = slots[activeIdx];
    if (!slot) return;
    const filename = `${slot.name || 'robot'}.r`;
    const blob = new Blob([slot.source], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [slots, activeIdx]);

  const openSourceIntoActive = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.r,.txt,text/plain';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result ?? '');
        const base = file.name.replace(/\.(r|txt)$/i, '');
        loadIntoSlot(activeIdx, base || 'robot', src);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [activeIdx, loadIntoSlot]);

  const randomizeAllSlots = useCallback(async () => {
    if (ROBOT_INDEX.length === 0) return;
    const picks: number[] = [];
    const seen = new Set<number>();
    while (picks.length < 4 && seen.size < ROBOT_INDEX.length) {
      const i = Math.floor(Math.random() * ROBOT_INDEX.length);
      if (seen.has(i)) continue;
      seen.add(i);
      picks.push(i);
    }
    const entries = picks.map((i) => ROBOT_INDEX[i]);
    const sources = await Promise.all(
      entries.map((e) => loadRobotSource(e.path).catch(() => null)),
    );
    setSlots((prev) =>
      prev.map((s, idx) => {
        const entry = entries[idx];
        const src = sources[idx];
        if (!entry || !src) return s;
        return { ...s, name: entry.name, source: src };
      }),
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

  const bumpZoom = useCallback((dir: 1 | -1) => {
    setZoom((cur) => {
      const i = ZOOM_LEVELS.findIndex((z) => Math.abs(z - cur) < 0.01);
      const idx = i === -1 ? 0 : i;
      const next = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, idx + dir));
      return ZOOM_LEVELS[next];
    });
  }, []);
  const zoomIn = useCallback(() => bumpZoom(1), [bumpZoom]);
  const zoomOut = useCallback(() => bumpZoom(-1), [bumpZoom]);
  const zoomReset = useCallback(() => setZoom(1), []);

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
        case 'z':
        case 'Z':
          e.preventDefault();
          if (e.shiftKey) bumpZoom(-1);
          else bumpZoom(1);
          break;
        case '0':
          e.preventDefault();
          setZoom(1);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setAudioMuted((v) => !v);
          break;
        case 'v':
        case 'V':
          e.preventDefault();
          setVoiceEnabled((v) => !v);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, togglePlay, handleStep, handleReset, bumpSpeed, bumpZoom]);

  useEffect(() => {
    if (match?.finished && !matchFinished) {
      setMatchFinished(true);
      setAutoContinue(running);
      setRunning(false);
      const winName = match.winner ? match.winner.name : null;
      setWinner(winName);
      setMatchCount((n) => n + 1);
      if (winName) {
        setWinHistory((prev) => ({ ...prev, [winName]: (prev[winName] ?? 0) + 1 }));
      } else {
        setDraws((d) => d + 1);
      }
    }
  }, [match, match?.finished, matchFinished, running]);

  useEffect(() => {
    if (!matchFinished) return;
    const t = setTimeout(() => {
      const ok = prepare();
      if (ok && autoContinue) setRunning(true);
    }, 2800);
    return () => clearTimeout(t);
  }, [matchFinished, prepare, autoContinue]);

  const activeSlot = slots[activeIdx];
  const activeIssue = issues.find((i) => i.slotIndex === activeIdx);
  const editorDiag: EditorDiag | null = activeIssue
    ? { line: activeIssue.line, col: activeIssue.col, message: activeIssue.message }
    : null;

  const errorIdxSet = useMemo(() => new Set(issues.map((i) => i.slotIndex)), [issues]);

  return (
    <div className={`app editor-${editorMode}`}>
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
          audioMuted={audioMuted}
          voiceEnabled={voiceEnabled}
          onStart={handleStart}
          onPause={handlePause}
          onStep={handleStep}
          onReset={handleReset}
          onSpeedChange={setSpeed}
          onToggleScans={() => setShowScans((v) => !v)}
          onToggleAudio={() => setAudioMuted((v) => !v)}
          onToggleVoice={() => setVoiceEnabled((v) => !v)}
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
            onOpenPicker={(i) => {
              setActiveIdx(i);
              setPickerSlot(i);
            }}
            onRandomizeAll={randomizeAllSlots}
          />
          <EventLog
            state={match}
            expanded={showTelemetry}
            onToggle={() => setShowTelemetry((v) => !v)}
          />
        </aside>

        <section className="center">
          <Arena
            state={match}
            showScans={showScans}
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onZoomReset={zoomReset}
          />
          {winner !== null && matchFinished && (
            <div className={`winner-banner ${winner ? '' : 'draw'}`}>
              {winner ? `◆ Victor: ${winner}` : '✕ Stalemate'}
            </div>
          )}
          {enabledSlots.length < 2 && (
            <div className="info-banner">Enable at least 2 robots to start a match</div>
          )}
          {issues.length > 0 && (
            <div className="error-banner">
              Compile error: {issues.map((i) => `${i.name} (line ${i.line})`).join(', ')}
            </div>
          )}
        </section>

        <aside className="right">
          <Scoreboard
            state={match}
            winHistory={winHistory}
            draws={draws}
            matchCount={matchCount}
          />
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
              ⚠ line {activeIssue.line}: {activeIssue.message}
            </span>
          )}
          <div className="editor-actions">
            <button
              className="editor-action"
              onClick={openSourceIntoActive}
              title="Open .r file"
              aria-label="Open"
            >
              ⤒
            </button>
            <button
              className="editor-action"
              onClick={saveActiveSource}
              title={`Save as ${activeSlot.name || 'robot'}.r`}
              aria-label="Save"
            >
              ⤓
            </button>
            <span className="editor-action-divider" />
            <button
              className="editor-action"
              onClick={() =>
                setEditorMode((m) => (m === 'minimized' ? 'normal' : 'minimized'))
              }
              title={editorMode === 'minimized' ? 'Restore code panel' : 'Minimize code panel'}
              aria-label="Minimize"
            >
              {editorMode === 'minimized' ? '▴' : '▾'}
            </button>
            <button
              className="editor-action"
              onClick={() =>
                setEditorMode((m) => (m === 'expanded' ? 'normal' : 'expanded'))
              }
              title={editorMode === 'expanded' ? 'Restore code panel' : 'Expand code panel'}
              aria-label="Expand"
            >
              ⛶
            </button>
          </div>
        </div>
        <Editor
          key={activeIdx}
          value={activeSlot.source}
          onChange={(v) => updateSource(activeIdx, v)}
          diag={editorDiag}
        />
      </section>

      <RobotPicker
        open={pickerSlot !== null}
        slotIdx={pickerSlot}
        onClose={() => setPickerSlot(null)}
        onSelect={(name, source) => {
          if (pickerSlot !== null) loadIntoSlot(pickerSlot, name, source);
          setPickerSlot(null);
        }}
      />

      {helpOpen && (
        <div className="help-overlay" onClick={() => setHelpOpen(false)}>
          <div className="help-card" onClick={(e) => e.stopPropagation()}>
            <h2>Commentator voice</h2>
            <VoicePicker value={voiceName} onChange={setVoiceName} />
            <h2 style={{ marginTop: 18 }}>Keyboard shortcuts</h2>
            <div className="help-row"><span>Play / pause</span><span className="help-key">Space</span></div>
            <div className="help-row"><span>Step one tick</span><span className="help-key">S</span></div>
            <div className="help-row"><span>Reset</span><span className="help-key">R</span></div>
            <div className="help-row"><span>Switch slot</span><span className="help-key">1 – 4</span></div>
            <div className="help-row"><span>Increase / decrease speed</span><span className="help-key">+ / –</span></div>
            <div className="help-row"><span>Scanner sweep on/off</span><span className="help-key">X</span></div>
            <div className="help-row"><span>Telemetry log on/off</span><span className="help-key">T</span></div>
            <div className="help-row"><span>Zoom in / out</span><span className="help-key">Z / Shift+Z</span></div>
            <div className="help-row"><span>Reset zoom</span><span className="help-key">0</span></div>
            <div className="help-row"><span>Mute audio</span><span className="help-key">M</span></div>
            <div className="help-row"><span>Commentator on/off</span><span className="help-key">V</span></div>
            <div className="help-row"><span>Help</span><span className="help-key">?</span></div>
            <button className="btn help-close" onClick={() => setHelpOpen(false)}>Close (Esc)</button>
          </div>
        </div>
      )}
    </div>
  );
}
