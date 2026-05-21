import { describe, expect, it } from 'vitest';
import { compile, CompileError } from '../compiler';
import { tokenize } from '../lexer';
import { Op } from '../opcodes';
import { parse } from '../parser';

function compileSrc(src: string) {
  return compile(parse(tokenize(src)));
}

describe('compiler', () => {
  it('registers main as function 0 and emits bootstrap', () => {
    const c = compileSrc('main() { return 42; }');
    expect(c.functionNames[c.mainIndex]).toBe('main');
    expect(c.code[0].op).toBe(Op.CALL);
    expect(c.code[1].op).toBe(Op.HALT);
  });

  it('compiles an arithmetic expression', () => {
    const c = compileSrc('main() { return 1 + 2 * 3; }');
    const ops = c.code.map((i) => i.op);
    expect(ops).toContain(Op.PUSH_CONST);
    expect(ops).toContain(Op.BINOP);
    expect(ops).toContain(Op.RET);
  });

  it('compiles local variables', () => {
    const c = compileSrc('main() { int x, y; x = 5; y = x + 1; return y; }');
    expect(c.functionLocals[c.mainIndex]).toBeGreaterThanOrEqual(2);
  });

  it('throws on undefined function', () => {
    expect(() => compileSrc('main() { bogus(); return 0; }')).toThrow(CompileError);
  });

  it('throws on undefined variable', () => {
    expect(() => compileSrc('main() { return not_defined; }')).toThrow(CompileError);
  });

  it('requires main()', () => {
    expect(() => compileSrc('foo() { return 1; }')).toThrow(/main/);
  });

  it('supports intrinsic calls', () => {
    const c = compileSrc('main() { drive(0, 100); return damage(); }');
    const ops = c.code.map((i) => i.op);
    expect(ops).toContain(Op.ICALL);
  });
});
