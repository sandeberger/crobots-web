import { Arena } from './arena';
import { compile, CompileError } from './compiler';
import { CPU_QUANTUM, CYCLE_LIMIT, ROBOT_COLORS } from './constants';
import { makeIntrinsicHost } from './intrinsics';
import { LexError, tokenize } from './lexer';
import { parse, ParseError } from './parser';
import { RNG } from './rng';
import { Robot } from './types';
import { VM } from './vm';

export interface RobotSource {
  name: string;
  source: string;
  color?: string;
}

export interface CompileIssue {
  slotIndex: number;
  name: string;
  message: string;
  line: number;
  col: number;
}

export interface MatchConfig {
  robots: RobotSource[];
  seed?: number;
  cpuQuantum?: number;
}

export interface MatchState {
  arena: Arena;
  cpuCycles: number;
  finished: boolean;
  winner: Robot | null;
  seed: number;
  cpuQuantum: number;
}

export interface PrepareResult {
  state: MatchState | null;
  issues: CompileIssue[];
}

export function prepareMatch(config: MatchConfig): PrepareResult {
  const issues: CompileIssue[] = [];
  const seed = config.seed ?? (Math.floor(Math.random() * 0x7fffffff) | 0);
  const rng = new RNG(seed);
  const arena = new Arena(rng);

  for (let i = 0; i < config.robots.length; i++) {
    const { name, source, color } = config.robots[i];
    try {
      const tokens = tokenize(source);
      const ast = parse(tokens);
      const compiled = compile(ast);
      const vm = new VM(compiled);
      const robot: Robot = {
        id: i,
        name,
        color: color ?? ROBOT_COLORS[i % ROBOT_COLORS.length],
        x: 0,
        y: 0,
        heading: 0,
        desiredHeading: 0,
        speed: 0,
        desiredSpeed: 0,
        damage: 0,
        alive: true,
        reload: 0,
        missilesInFlight: 0,
        compiled,
        vm,
        trail: [],
        damageFlash: 0,
        lastDamage: 0,
      };
      arena.addRobot(robot);
    } catch (e) {
      const err = e as Error;
      const line = (err as LexError | ParseError | CompileError).line ?? 0;
      const col = (err as LexError | ParseError | CompileError).col ?? 0;
      issues.push({
        slotIndex: i,
        name,
        message: err.message,
        line,
        col,
      });
    }
  }

  if (issues.length > 0) {
    return { state: null, issues };
  }

  placeRobots(arena.robots, rng);

  return {
    state: {
      arena,
      cpuCycles: 0,
      finished: false,
      winner: null,
      seed,
      cpuQuantum: config.cpuQuantum ?? CPU_QUANTUM,
    },
    issues: [],
  };
}

export function tickMatch(state: MatchState): void {
  if (state.finished) return;

  for (const r of state.arena.robots) {
    if (!r.alive || r.vm.isHalted()) continue;
    const host = makeIntrinsicHost(state.arena, r, state.arena.rng);
    for (let i = 0; i < state.cpuQuantum; i++) {
      try {
        r.vm.step(host);
      } catch {
        r.vm.reset();
        break;
      }
      state.cpuCycles++;
      if (r.vm.isHalted()) {
        r.vm.reset();
        break;
      }
    }
  }

  state.arena.advance();

  const aliveRobots = state.arena.robots.filter((r) => r.alive);
  const robotCount = state.arena.robots.length;
  const cpuBudget = CYCLE_LIMIT * Math.max(1, robotCount);

  if (aliveRobots.length <= 1 || state.cpuCycles >= cpuBudget) {
    state.finished = true;
    state.winner = aliveRobots.length === 1 ? aliveRobots[0] : null;
  }
}

function placeRobots(robots: Robot[], rng: RNG): void {
  const positions = [
    { x: 100, y: 100 },
    { x: 900, y: 900 },
    { x: 100, y: 900 },
    { x: 900, y: 100 },
  ];
  for (let i = positions.length - 1; i > 0; i--) {
    const j = rng.int(i);
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  for (let i = 0; i < robots.length; i++) {
    const p = positions[i];
    if (p) {
      robots[i].x = p.x;
      robots[i].y = p.y;
    } else {
      robots[i].x = rng.range(50, 950);
      robots[i].y = rng.range(50, 950);
    }
  }
}
