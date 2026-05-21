import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tokenize } from '../lexer';
import { TokType } from '../tokens';

const here = dirname(fileURLToPath(import.meta.url));
const SNIPER = readFileSync(resolve(here, '../../robots/sniper.r'), 'utf-8');
const RABBIT = readFileSync(resolve(here, '../../robots/rabbit.r'), 'utf-8');

describe('lexer', () => {
  it('tokenizes sniper.r and terminates with EOF', () => {
    const toks = tokenize(SNIPER);
    expect(toks.length).toBeGreaterThan(200);
    expect(toks[toks.length - 1].type).toBe(TokType.EOF);
  });

  it('tokenizes rabbit.r', () => {
    const toks = tokenize(RABBIT);
    expect(toks[toks.length - 1].type).toBe(TokType.EOF);
  });

  it('recognizes compound assignment operators', () => {
    const toks = tokenize('x <<= 3;');
    expect(toks.map((t) => t.type)).toContain(TokType.LSHIFT_ASSIGN);
  });

  it('recognizes increment and decrement', () => {
    const toks = tokenize('i++; --j;');
    const types = toks.map((t) => t.type);
    expect(types).toContain(TokType.INC);
    expect(types).toContain(TokType.DEC);
  });

  it('skips block comments', () => {
    const toks = tokenize('/* ignored */ foo');
    expect(toks.length).toBe(2);
    expect(toks[0].type).toBe(TokType.IDENT);
    expect(toks[0].value).toBe('foo');
  });

  it('tracks line and column', () => {
    const toks = tokenize('x\n  y');
    expect(toks[0].line).toBe(1);
    expect(toks[1].line).toBe(2);
    expect(toks[1].col).toBe(3);
  });

  it('distinguishes = from ==', () => {
    const toks = tokenize('a = b == c;');
    expect(toks[1].type).toBe(TokType.ASSIGN);
    expect(toks[3].type).toBe(TokType.EQ);
  });

  it('rejects unterminated comment', () => {
    expect(() => tokenize('/* oops')).toThrow(/Unterminated/);
  });
});
