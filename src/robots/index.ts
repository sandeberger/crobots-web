import sniper from './sniper.r?raw';
import rabbit from './rabbit.r?raw';
import rook from './rook.r?raw';
import counter from './counter.r?raw';

export interface BuiltinRobot {
  name: string;
  source: string;
  speakable: string;
}

const SPEAKABLE_OVERRIDES: Record<string, string> = {
  sniper: 'Sniper',
  rabbit: 'Rabbit',
  rook: 'Rook',
  counter: 'Counter',
  gnat: 'Nat',
  mrsatan: 'Mister Satan',
  '_cimice_': 'Cimiche',
  '_c_': 'C',
  '_alien': 'Alien',
  '_caos': 'Caos',
  '_dna': 'D N A',
  '_zeus': 'Zeus',
  'qx4': 'Q X four',
  'gijoe': 'G I Joe',
  'jedi12': 'Jedi twelve',
  'jedi14': 'Jedi fourteen',
  'jedi9': 'Jedi nine',
  'ksniper': 'K Sniper',
  'bastrd__': 'Bastard',
};

export function computeSpeakable(name: string): string {
  if (!name) return '';
  const key = name.toLowerCase();
  if (SPEAKABLE_OVERRIDES[key]) return SPEAKABLE_OVERRIDES[key];
  let s = name.replace(/^_+|_+$/g, '');
  if (!s) return name;
  s = s.replace(/_+/g, ' ');
  s = s.replace(/([A-Za-z])(\d)/g, '$1 $2').replace(/(\d)([A-Za-z])/g, '$1 $2');
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export const BUILTIN_ROBOTS: BuiltinRobot[] = [
  { name: 'sniper', source: sniper, speakable: computeSpeakable('sniper') },
  { name: 'rabbit', source: rabbit, speakable: computeSpeakable('rabbit') },
  { name: 'rook', source: rook, speakable: computeSpeakable('rook') },
  { name: 'counter', source: counter, speakable: computeSpeakable('counter') },
];

const lazyRobots = import.meta.glob('./**/*.r', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

export interface RobotIndexEntry {
  name: string;
  category: string;
  path: string;
  speakable: string;
}

function categorize(path: string): { name: string; category: string } {
  const parts = path.replace(/^\.\//, '').split('/');
  const file = parts.pop()!;
  const name = file.replace(/\.r$/, '');
  const category = parts.length === 0 ? 'core' : parts.join(' / ');
  return { name, category };
}

export const ROBOT_INDEX: RobotIndexEntry[] = Object.keys(lazyRobots)
  .map((path) => {
    const { name, category } = categorize(path);
    return { path, name, category, speakable: computeSpeakable(name) };
  })
  .sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

export const ROBOT_CATEGORIES: string[] = Array.from(
  new Set(ROBOT_INDEX.map((r) => r.category)),
).sort();

export async function loadRobotSource(path: string): Promise<string> {
  const loader = lazyRobots[path];
  if (!loader) throw new Error(`Robot not found: ${path}`);
  return loader();
}
