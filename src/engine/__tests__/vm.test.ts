import { describe, expect, it } from 'vitest';
import { compile } from '../compiler';
import { tokenize } from '../lexer';
import { parse } from '../parser';
import { IntrinsicHost, VM } from '../vm';

function runToHalt(src: string, host?: IntrinsicHost, maxSteps = 10000): { vm: VM; steps: number } {
  const compiled = compile(parse(tokenize(src)));
  const vm = new VM(compiled);
  const h: IntrinsicHost = host ?? { callIntrinsic: () => 0 };
  let steps = 0;
  while (!vm.isHalted() && steps < maxSteps) {
    vm.step(h);
    steps++;
  }
  return { vm, steps };
}

describe('vm', () => {
  it('returns a constant', () => {
    const { vm } = runToHalt('main() { return 42; }');
    expect(vm.isHalted()).toBe(true);
    expect(vm.peekTop()).toBe(42);
  });

  it('respects operator precedence', () => {
    const { vm } = runToHalt('main() { return 1 + 2 * 3; }');
    expect(vm.peekTop()).toBe(7);
  });

  it('handles parentheses', () => {
    const { vm } = runToHalt('main() { return (1 + 2) * 3; }');
    expect(vm.peekTop()).toBe(9);
  });

  it('handles integer division and modulo', () => {
    const a = runToHalt('main() { return 17 / 5; }').vm;
    expect(a.peekTop()).toBe(3);
    const b = runToHalt('main() { return 17 % 5; }').vm;
    expect(b.peekTop()).toBe(2);
  });

  it('runs a while loop', () => {
    const { vm } = runToHalt('main() { int i; i = 0; while (i < 10) i = i + 1; return i; }');
    expect(vm.peekTop()).toBe(10);
  });

  it('evaluates if/else', () => {
    const { vm } = runToHalt('main() { if (2 > 1) return 100; else return 200; }');
    expect(vm.peekTop()).toBe(100);
  });

  it('calls user functions with arguments', () => {
    const src = `
      add(a, b) int a; int b; { return a + b; }
      main() { return add(3, 4); }
    `;
    const { vm } = runToHalt(src);
    expect(vm.peekTop()).toBe(7);
  });

  it('supports recursion', () => {
    const src = `
      fact(n) int n; { if (n <= 1) return 1; return n * fact(n - 1); }
      main() { return fact(5); }
    `;
    const { vm } = runToHalt(src, undefined, 100000);
    expect(vm.peekTop()).toBe(120);
  });

  it('compound assignment produces correct value', () => {
    const { vm } = runToHalt('main() { int a; a = 10; a += 5; a *= 2; return a; }');
    expect(vm.peekTop()).toBe(30);
  });

  it('prefix increment updates and returns new value', () => {
    const { vm } = runToHalt('main() { int a; a = 5; return ++a; }');
    expect(vm.peekTop()).toBe(6);
  });

  it('dispatches intrinsic with argument', () => {
    const calls: Array<{ idx: number; args: number[] }> = [];
    const host: IntrinsicHost = {
      callIntrinsic(idx, args) {
        calls.push({ idx, args });
        return idx === 7 ? 42 : 0;
      },
    };
    const { vm } = runToHalt('main() { return rand(100); }', host);
    expect(vm.peekTop()).toBe(42);
    expect(calls).toEqual([{ idx: 7, args: [100] }]);
  });
});
