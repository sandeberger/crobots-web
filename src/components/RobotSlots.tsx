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
  onOpenPicker: (i: number) => void;
  onRandomizeAll: () => void;
}

export function RobotSlots({
  slots,
  activeIdx,
  errorIdxSet,
  onSelect,
  onToggle,
  onRename,
  onOpenPicker,
  onRandomizeAll,
}: RobotSlotsProps) {
  return (
    <div>
      <div className="section-header">
        <span className="section-title">Robotslots</span>
        <button
          className="section-action"
          onClick={onRandomizeAll}
          title="Slumpa fram 4 nya robotar"
          aria-label="Randomize"
        >
          ⤳
        </button>
      </div>
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
              <button
                className="slot-load"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPicker(i);
                }}
                title="Välj robot från bibliotek"
              >
                ⌕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
