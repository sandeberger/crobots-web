import {
  ARENA_MAX,
  DAMAGE_COLL,
  DAMAGE_DIRECT,
  DAMAGE_FAR,
  DAMAGE_NEAR,
  DMG_DIRECT_RADIUS,
  DMG_FAR_RADIUS,
  DMG_NEAR_RADIUS,
  MIS_METERS_PER_TICK,
  MIS_PER_ROBOT,
  MIS_RANGE,
  RELOAD,
  ROBOT_ACCEL,
  ROBOT_COLLISION_RADIUS,
  ROBOT_DECEL,
  ROBOT_MPS,
  ROBOT_TURN_MAX_SPEED,
  SCAN_MAX_RESOLUTION,
} from './constants';
import { RNG } from './rng';
import { ArenaEvent, Explosion, Missile, Robot, ScanPing } from './types';

const TRAIL_MAX = 28;
const SCAN_PING_MAX_AGE = 8;

export class Arena {
  tick = 0;
  robots: Robot[] = [];
  missiles: Missile[] = [];
  explosions: Explosion[] = [];
  scans: ScanPing[] = [];
  events: ArenaEvent[] = [];
  rng: RNG;
  private nextMissileId = 1;
  private eventBudget = 100;

  constructor(rng: RNG) {
    this.rng = rng;
  }

  addRobot(robot: Robot): void {
    this.robots.push(robot);
  }

  scan(me: Robot, rawDeg: number, rawRes: number): number {
    const deg = normDeg(rawDeg);
    const res = Math.max(0, Math.min(SCAN_MAX_RESOLUTION, Math.abs(rawRes | 0)));
    let best = 0;
    for (const r of this.robots) {
      if (r === me || !r.alive) continue;
      const dx = r.x - me.x;
      const dy = r.y - me.y;
      const dist = Math.hypot(dx, dy);
      const angle = normDeg((Math.atan2(dy, dx) * 180) / Math.PI);
      let diff = Math.abs(angle - deg);
      if (diff > 180) diff = 360 - diff;
      if (diff <= res) {
        const d = Math.floor(dist);
        if (best === 0 || d < best) best = d;
      }
    }
    this.scans.push({
      robotId: me.id,
      heading: deg,
      resolution: res,
      range: best > 0 ? best : 700,
      hit: best > 0,
      age: 0,
    });
    return best;
  }

  cannon(me: Robot, rawDeg: number, rawRange: number): number {
    if (me.reload > 0) return 0;
    if (me.missilesInFlight >= MIS_PER_ROBOT) return 0;
    const heading = normDeg(rawDeg);
    const range = Math.max(0, Math.min(MIS_RANGE, rawRange | 0));
    if (range === 0) return 0;
    this.missiles.push({
      id: this.nextMissileId++,
      ownerId: me.id,
      x: me.x,
      y: me.y,
      heading,
      traveled: 0,
      maxRange: range,
    });
    me.missilesInFlight++;
    me.reload = RELOAD;
    this.log({ kind: 'fire', tick: this.tick, robotId: me.id, heading, range });
    return 1;
  }

  drive(me: Robot, rawDeg: number, rawSpeed: number): void {
    me.desiredHeading = normDeg(rawDeg);
    me.desiredSpeed = Math.max(0, Math.min(100, rawSpeed | 0));
  }

  advance(): void {
    this.tick++;

    for (const r of this.robots) {
      if (r.alive && r.reload > 0) r.reload--;
    }

    const survivingMissiles: Missile[] = [];
    for (const m of this.missiles) {
      const rad = (m.heading * Math.PI) / 180;
      m.x += MIS_METERS_PER_TICK * Math.cos(rad);
      m.y += MIS_METERS_PER_TICK * Math.sin(rad);
      m.traveled += MIS_METERS_PER_TICK;
      const oob = m.x < 0 || m.x > ARENA_MAX || m.y < 0 || m.y > ARENA_MAX;
      if (oob || m.traveled >= m.maxRange || m.traveled >= MIS_RANGE) {
        this.explodeMissile(m);
      } else {
        survivingMissiles.push(m);
      }
    }
    this.missiles = survivingMissiles;

    for (const e of this.explosions) e.age++;
    this.explosions = this.explosions.filter((e) => e.age < 8);

    for (const s of this.scans) s.age++;
    this.scans = this.scans.filter((s) => s.age < SCAN_PING_MAX_AGE);

    for (const r of this.robots) {
      if (!r.alive) continue;

      if (r.damageFlash > 0) r.damageFlash--;

      if (r.desiredHeading !== r.heading) {
        if (r.speed > ROBOT_TURN_MAX_SPEED) {
          r.speed = Math.max(0, r.speed - ROBOT_DECEL);
        } else {
          r.heading = r.desiredHeading;
          if (r.speed < r.desiredSpeed) {
            r.speed = Math.min(r.desiredSpeed, r.speed + ROBOT_ACCEL);
          }
        }
      } else {
        if (r.speed < r.desiredSpeed) {
          r.speed = Math.min(r.desiredSpeed, r.speed + ROBOT_ACCEL);
        } else if (r.speed > r.desiredSpeed) {
          r.speed = Math.max(r.desiredSpeed, r.speed - ROBOT_DECEL);
        }
      }

      if (r.speed > 0) {
        const rad = (r.heading * Math.PI) / 180;
        const step = (r.speed / 100) * ROBOT_MPS;
        const nx = r.x + step * Math.cos(rad);
        const ny = r.y + step * Math.sin(rad);
        if (nx < 0 || nx > ARENA_MAX || ny < 0 || ny > ARENA_MAX) {
          r.x = Math.max(0, Math.min(ARENA_MAX, nx));
          r.y = Math.max(0, Math.min(ARENA_MAX, ny));
          r.speed = 0;
          r.desiredSpeed = 0;
          this.applyDamage(r, DAMAGE_COLL, 'wall');
        } else {
          r.x = nx;
          r.y = ny;
        }
      }

      const last = r.trail[r.trail.length - 1];
      if (!last || Math.hypot(r.x - last.x, r.y - last.y) > 1.5) {
        r.trail.push({ x: r.x, y: r.y, tick: this.tick });
        if (r.trail.length > TRAIL_MAX) r.trail.shift();
      }
    }

    for (let i = 0; i < this.robots.length; i++) {
      for (let j = i + 1; j < this.robots.length; j++) {
        const a = this.robots[i];
        const b = this.robots[j];
        if (!a.alive || !b.alive) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < ROBOT_COLLISION_RADIUS) {
          a.speed = 0;
          b.speed = 0;
          this.applyDamage(a, DAMAGE_COLL, 'collision');
          this.applyDamage(b, DAMAGE_COLL, 'collision');
        }
      }
    }

    for (const r of this.robots) {
      if (r.alive && r.damage >= 100) {
        r.alive = false;
        r.damage = 100;
        r.speed = 0;
        r.desiredSpeed = 0;
        this.log({ kind: 'death', tick: this.tick, robotId: r.id });
      }
    }
  }

  private explodeMissile(m: Missile): void {
    this.explosions.push({ x: m.x, y: m.y, age: 0 });
    this.log({ kind: 'explosion', tick: this.tick, x: m.x, y: m.y });
    for (const r of this.robots) {
      if (!r.alive) continue;
      const d = Math.hypot(r.x - m.x, r.y - m.y);
      let amount = 0;
      if (d <= DMG_DIRECT_RADIUS) amount = DAMAGE_DIRECT;
      else if (d <= DMG_NEAR_RADIUS) amount = DAMAGE_NEAR;
      else if (d <= DMG_FAR_RADIUS) amount = DAMAGE_FAR;
      if (amount > 0) this.applyDamage(r, amount, 'missile');
    }
    const owner = this.robots.find((r) => r.id === m.ownerId);
    if (owner) owner.missilesInFlight = Math.max(0, owner.missilesInFlight - 1);
  }

  private applyDamage(r: Robot, amount: number, cause: 'missile' | 'wall' | 'collision'): void {
    r.damage = Math.min(100, r.damage + amount);
    r.lastDamage = amount;
    r.damageFlash = 6;
    this.log({ kind: 'damage', tick: this.tick, robotId: r.id, amount, cause });
  }

  private log(e: ArenaEvent): void {
    this.events.push(e);
    if (this.events.length > this.eventBudget) {
      this.events.splice(0, this.events.length - this.eventBudget);
    }
  }

  aliveCount(): number {
    let n = 0;
    for (const r of this.robots) if (r.alive) n++;
    return n;
  }
}

export function normDeg(d: number): number {
  let v = d | 0;
  v = v % 360;
  if (v < 0) v += 360;
  return v;
}
