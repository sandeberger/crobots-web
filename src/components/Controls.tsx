export interface ControlsProps {
  running: boolean;
  finished: boolean;
  hasMatch: boolean;
  speed: number;
  showScans: boolean;
  showTelemetry: boolean;
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (s: number) => void;
  onToggleScans: () => void;
  onToggleTelemetry: () => void;
  onShowHelp: () => void;
}

const SPEED_PIPS = [1, 4, 16, 64, 250];

export function Controls({
  running,
  finished,
  hasMatch,
  speed,
  showScans,
  showTelemetry,
  onStart,
  onPause,
  onStep,
  onReset,
  onSpeedChange,
  onToggleScans,
  onToggleTelemetry,
  onShowHelp,
}: ControlsProps) {
  return (
    <div className="controls">
      {running ? (
        <button onClick={onPause} className="btn btn-pause" title="Pausa (Space)">
          ❚❚ Pausa
          <span className="kbd">SPACE</span>
        </button>
      ) : (
        <button onClick={onStart} className="btn btn-start" title="Starta (Space)">
          {finished ? '↻ Ny match' : hasMatch ? '▶ Fortsätt' : '▶ Starta'}
          <span className="kbd">SPACE</span>
        </button>
      )}
      <button
        onClick={onStep}
        disabled={running || finished}
        className="btn"
        title="Stega ett tick (S)"
      >
        ▸▮ Steg
        <span className="kbd">S</span>
      </button>
      <button onClick={onReset} className="btn" title="Reset (R)">
        ⟲ Reset
        <span className="kbd">R</span>
      </button>
      <div className="speed">
        <span>Speed</span>
        <div className="speed-track" role="group" aria-label="Hastighet">
          {SPEED_PIPS.map((s) => (
            <button
              key={s}
              className={`speed-pip ${speed === s ? 'active' : ''}`}
              onClick={() => onSpeedChange(s)}
              title={`${s}× hastighet`}
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
          title="Visa skanner-svep (X)"
        >
          ⌖ Scan
        </button>
        <button
          className={`fx-toggle ${showTelemetry ? 'on' : ''}`}
          onClick={onToggleTelemetry}
          title="Visa telemetri-logg (T)"
        >
          ⌗ Log
        </button>
      </div>
      <button className="help-btn" onClick={onShowHelp} title="Genvägar (?)">
        ?
      </button>
    </div>
  );
}
