import { useEffect, useMemo, useRef, useState } from 'react';
import { ROBOT_INDEX, RobotIndexEntry, loadRobotSource } from '../robots';

export interface RobotPickerProps {
  open: boolean;
  slotIdx: number | null;
  onClose: () => void;
  onSelect: (name: string, source: string) => void;
}

const PAGE_LIMIT = 240;

export function RobotPicker({ open, slotIdx, onClose, onSelect }: RobotPickerProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setCategory(null);
      setLoadingPath(null);
      setError(null);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of ROBOT_INDEX) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ROBOT_INDEX.filter((r) => {
      if (category && r.category !== category) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    });
  }, [search, category]);

  const visible = filtered.slice(0, PAGE_LIMIT);
  const truncated = filtered.length > PAGE_LIMIT;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pick = async (r: RobotIndexEntry) => {
    setLoadingPath(r.path);
    setError(null);
    try {
      const src = await loadRobotSource(r.path);
      onSelect(r.name, src);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingPath(null);
    }
  };

  return (
    <div className="picker-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="picker-card" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <div>
            <h2>Välj robot</h2>
            <span className="picker-sub">
              {slotIdx !== null && `→ Slot ${slotIdx + 1}  ·  `}
              {filtered.length} av {ROBOT_INDEX.length}
            </span>
          </div>
          <button className="picker-close" onClick={onClose} aria-label="Stäng">
            ×
          </button>
        </div>

        <div className="picker-search">
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök robot eller kategori…"
            type="search"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="picker-cats">
          <button
            className={`picker-cat-pill ${category === null ? 'active' : ''}`}
            onClick={() => setCategory(null)}
          >
            Alla
            <span className="picker-cat-count">{ROBOT_INDEX.length}</span>
          </button>
          {categories.map(([cat, n]) => (
            <button
              key={cat}
              className={`picker-cat-pill ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(category === cat ? null : cat)}
            >
              {cat}
              <span className="picker-cat-count">{n}</span>
            </button>
          ))}
        </div>

        <div className="picker-body">
          {visible.length === 0 ? (
            <div className="picker-empty">Inga träffar</div>
          ) : (
            <div className="picker-grid">
              {visible.map((r) => (
                <button
                  key={r.path}
                  className={`picker-item ${loadingPath === r.path ? 'loading' : ''}`}
                  onClick={() => pick(r)}
                  disabled={loadingPath !== null}
                  title={`${r.category} / ${r.name}.r`}
                >
                  <span className="picker-item-name">{r.name}</span>
                  <span className="picker-item-cat">{r.category}</span>
                </button>
              ))}
            </div>
          )}
          {truncated && (
            <div className="picker-truncated">
              Visar första {PAGE_LIMIT} av {filtered.length}. Förfina sökningen för fler träffar.
            </div>
          )}
        </div>

        {error && <div className="picker-error">⚠ {error}</div>}
      </div>
    </div>
  );
}
