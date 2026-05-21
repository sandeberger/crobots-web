import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { prepareMatch, tickMatch } from '../match';

const here = dirname(fileURLToPath(import.meta.url));
const SNIPER = readFileSync(resolve(here, '../../robots/sniper.r'), 'utf-8');
const RABBIT = readFileSync(resolve(here, '../../robots/rabbit.r'), 'utf-8');
const ROOK = readFileSync(resolve(here, '../../robots/rook.r'), 'utf-8');
const COUNTER = readFileSync(resolve(here, '../../robots/counter.r'), 'utf-8');

describe('match', () => {
  it('prepares a 2-robot match successfully', () => {
    const { state, issues } = prepareMatch({
      robots: [
        { name: 'sniper', source: SNIPER },
        { name: 'rabbit', source: RABBIT },
      ],
      seed: 42,
    });
    expect(issues).toEqual([]);
    expect(state).not.toBeNull();
    expect(state!.arena.robots.length).toBe(2);
  });

  it('reports compile issues and returns null state', () => {
    const { state, issues } = prepareMatch({
      robots: [
        { name: 'sniper', source: SNIPER },
        { name: 'broken', source: 'main() { foo(' },
      ],
    });
    expect(state).toBeNull();
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].slotIndex).toBe(1);
  });

  it('runs 100 ticks without crashing', () => {
    const { state } = prepareMatch({
      robots: [
        { name: 'sniper', source: SNIPER },
        { name: 'rabbit', source: RABBIT },
      ],
      seed: 42,
    });
    for (let i = 0; i < 100 && !state!.finished; i++) tickMatch(state!);
    expect(state!.arena.tick).toBeGreaterThan(0);
  });

  it('sniper vs rabbit eventually ends', () => {
    const { state } = prepareMatch({
      robots: [
        { name: 'sniper', source: SNIPER },
        { name: 'rabbit', source: RABBIT },
      ],
      seed: 7,
    });
    let ticks = 0;
    while (!state!.finished && ticks < 50_000) {
      tickMatch(state!);
      ticks++;
    }
    expect(state!.finished).toBe(true);
  }, 30000);

  it('all 4 example robots compile together', () => {
    const { state, issues } = prepareMatch({
      robots: [
        { name: 'sniper', source: SNIPER },
        { name: 'rabbit', source: RABBIT },
        { name: 'rook', source: ROOK },
        { name: 'counter', source: COUNTER },
      ],
      seed: 99,
    });
    expect(issues).toEqual([]);
    expect(state!.arena.robots.length).toBe(4);
  });
});
