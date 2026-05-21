import { CompiledRobot } from './opcodes';
import { VM } from './vm';

export interface RobotCapabilities {
  drive: boolean;
  cannon: boolean;
  scan: boolean;
  gps: boolean;
  status: boolean;
}

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
  lastAttackerId?: number;

  capabilities: RobotCapabilities;
  lastScanHeading: number;
  lastScanTick: number;
  lastCannonHeading: number;
  lastCannonTick: number;
  travel: number;
}

export interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  size: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  tick: number;
  heading: number;
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
  | {
      kind: 'damage';
      tick: number;
      robotId: number;
      amount: number;
      cause: 'missile' | 'wall' | 'collision';
      attackerId?: number;
    }
  | { kind: 'death'; tick: number; robotId: number; attackerId?: number };
