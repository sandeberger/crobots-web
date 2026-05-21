import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tokenize } from '../lexer';
import { parse } from '../parser';

const here = dirname(fileURLToPath(import.meta.url));
const SNIPER = readFileSync(resolve(here, '../../robots/sniper.r'), 'utf-8');
const RABBIT = readFileSync(resolve(here, '../../robots/rabbit.r'), 'utf-8');

describe('parser', () => {
  it('parses sniper.r with externs and all functions', () => {
    const prog = parse(tokenize(SNIPER));
    expect(prog.externs).toContain('corner');
    expect(prog.externs).toContain('sc');
    const names = prog.funcs.map((f) => f.name);
    expect(names).toContain('main');
    expect(names).toContain('new_corner');
    expect(names).toContain('distance');
    expect(names).toContain('plot_course');
  });

  it('parses rabbit.r with K&R-style parameters', () => {
    const prog = parse(tokenize(RABBIT));
    const go = prog.funcs.find((f) => f.name === 'go');
    expect(go?.params).toEqual(['dest_x', 'dest_y']);
    const distance = prog.funcs.find((f) => f.name === 'distance');
    expect(distance?.params).toEqual(['x1', 'y1', 'x2', 'y2']);
  });

  it('parses an empty while body', () => {
    const prog = parse(tokenize('main() { while (0) ; }'));
    const main = prog.funcs[0];
    expect(main.name).toBe('main');
  });

  it('parses if/else chains', () => {
    const prog = parse(tokenize('main() { if (1) return 1; else if (2) return 2; else return 3; }'));
    expect(prog.funcs.length).toBe(1);
  });

  it('supports compound assignment', () => {
    const prog = parse(tokenize('main() { int a; a = 0; a += 5; a -= 1; return a; }'));
    expect(prog.funcs[0].name).toBe('main');
  });

  it('reports missing semicolon with position', () => {
    expect(() => parse(tokenize('main() { int x\n}'))).toThrow(/line 2/);
  });
});
