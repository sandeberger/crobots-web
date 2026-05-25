export interface ControlsProps {
  running: boolean;
  finished: boolean;
  hasMatch: boolean;
  speed: number;
  showScans: boolean;
  audioMuted: boolean;
  voiceEnabled: boolean;
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (s: number) => void;
  onToggleScans: () => void;
  onToggleAudio: () => void;
  onToggleVoice: () => void;
  onShowHelp: () => void;
}

const SPEED_PIPS = [1, 4, 16, 64, 250];

export function Controls({
  running,
  finished,
  hasMatch,
  speed,
  showScans,
  audioMuted,
  voiceEnabled,
  onStart,
  onPause,
  onStep,
  onReset,
  onSpeedChange,
  onToggleScans,
  onToggleAudio,
  onToggleVoice,
  onShowHelp,
}: ControlsProps) {
  return (
    <div className="controls">
      {running ? (
        <button onClick={onPause} className="btn btn-pause" title="Pause (Space)">
          ❚❚ Pause
          <span className="kbd">SPACE</span>
        </button>
      ) : (
        <button onClick={onStart} className="btn btn-start" title="Start (Space)">
          {finished ? '↻ New match' : hasMatch ? '▶ Resume' : '▶ Start'}
          <span className="kbd">SPACE</span>
        </button>
      )}
      <button
        onClick={onStep}
        disabled={running || finished}
        className="btn"
        title="Step one tick (S)"
      >
        ▸▮ Step
        <span className="kbd">S</span>
      </button>
      <button onClick={onReset} className="btn" title="Reset (R)">
        ⟲ Reset
        <span className="kbd">R</span>
      </button>
      <div className="speed">
        <span>Speed</span>
        <div className="speed-track" role="group" aria-label="Speed">
          {SPEED_PIPS.map((s) => (
            <button
              key={s}
              className={`speed-pip ${speed === s ? 'active' : ''}`}
              onClick={() => onSpeedChange(s)}
              title={`${s}× speed`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
      <div className="fx-toggles" role="group" aria-label="FX">
        <button
          className={`fx-toggle ${showScans ? 'on' : ''}`}
          onClick={onToggleScans}
          title="Show scanner sweep (X)"
        >
          ⌖ Scan
        </button>
        <button
          className={`fx-toggle ${audioMuted ? '' : 'on'}`}
          onClick={onToggleAudio}
          title="Audio on/off (M)"
        >
          {audioMuted ? '⊘' : '♪'} Audio
        </button>
        <button
          className={`fx-toggle ${voiceEnabled ? 'on' : ''}`}
          onClick={onToggleVoice}
          title="Commentator on/off (V)"
        >
          🎙 Voice
        </button>
      </div>
      <button className="help-btn" onClick={onShowHelp} title="Shortcuts (?)">
        ?
      </button>
    </div>
  );
}
