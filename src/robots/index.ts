import sniper from './sniper.r?raw';
import rabbit from './rabbit.r?raw';
import rook from './rook.r?raw';
import counter from './counter.r?raw';

export interface BuiltinRobot {
  name: string;
  source: string;
}

export const BUILTIN_ROBOTS: BuiltinRobot[] = [
  { name: 'sniper', source: sniper },
  { name: 'rabbit', source: rabbit },
  { name: 'rook', source: rook },
  { name: 'counter', source: counter },
];
