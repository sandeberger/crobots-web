import { CompiledRobot } from './opcodes';
import { VM } from './vm';

export interface Robot {
  id: number;
  name: string;
  color: string;

  x: number;
  y: number;
  heading: number;
  desiredHeading: number;
  speed: number;
  desiredSpeed: number;

  damage: number;
  alive: boolean;

  reload: number;
  missilesInFlight: number;

  compiled: CompiledRobot;
  vm: VM;

  trail: TrailPoint[];
  damageFlash: number;
  lastDamage: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  tick: number;
}

export interface ScanPing {
  robotId: number;
  heading: number;
  resolution: number;
  range: number;
  hit: boolean;
  age: number;
}

export interface Missile {
  id: number;
  ownerId: number;
  x: number;
  y: number;
  heading: number;
  traveled: number;
  maxRange: number;
}

export interface Explosion {
  x: number;
  y: number;
  age: number;
}

export type ArenaEvent =
  | { kind: 'fire'; tick: number; robotId: number; heading: number; range: number }
  | { kind: 'explosion'; tick: number; x: number; y: number }
  | { kind: 'damage'; tick: number; robotId: number; amount: number; cause: 'missile' | 'wall' | 'collision' }
  | { kind: 'death'; tick: number; robotId: number };
