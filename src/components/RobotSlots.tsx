import { BUILTIN_ROBOTS } from '../robots';

export interface Slot {
  name: string;
  source: string;
  color: string;
  enabled: boolean;
}

export interface RobotSlotsProps {
  slots: Slot[];
  activeIdx: number;
  errorIdxSet: Set<number>;
  onSelect: (i: number) => void;
  onToggle: (i: number) => void;
  onRename: (i: number, name: string) => void;
  onLoadBuiltin: (i: number, name: string) => void;
}

export function RobotSlots({
  slots,
  activeIdx,
  errorIdxSet,
  onSelect,
  onToggle,
  onRename,
  onLoadBuiltin,
}: RobotSlotsProps) {
  return (
    <div>
      <div className="section-header">Robotslots</div>
      <div className="slots">
        {slots.map((s, i) => {
          const hasError = errorIdxSet.has(i);
          const isActive = activeIdx === i;
          return (
            <div
              key={i}
              className={`slot ${isActive ? 'active' : ''} ${hasError ? 'error' : ''} ${s.enabled ? '' : 'disabled'}`}
              onClick={() => onSelect(i)}
            >
              <span
                className="slot-dot"
                style={{ background: s.color, color: s.color }}
              />
              <input
                type="checkbox"
                checked={s.enabled}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggle(i)}
                title="Inkludera i match"
              />
              <input
                className="slot-name"
                type="text"
                value={s.name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onRename(i, e.target.value)}
              />
              <span className="slot-kbd">{i + 1}</span>
              <select
                className="slot-load"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (e.target.value) {
                    onLoadBuiltin(i, e.target.value);
                    e.currentTarget.value = '';
                  }
                }}
                defaultValue=""
                title="Ladda exempel"
              >
                <option value="">…</option>
                {BUILTIN_ROBOTS.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
