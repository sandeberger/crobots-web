import { BinOpCode, CompiledRobot, Op, UnOpCode } from './opcodes';

export interface IntrinsicHost {
  callIntrinsic(idx: number, args: number[]): number;
}

interface CallFrame {
  locals: Int32Array;
  retAddr: number;
}

export class VMError extends Error {}

export class VM {
  readonly robot: CompiledRobot;
  private readonly globals: Int32Array;
  private readonly valueStack: number[] = [];
  private readonly callStack: CallFrame[] = [];
  private pc: number;
  private halted = false;

  constructor(robot: CompiledRobot) {
    this.robot = robot;
    this.globals = new Int32Array(robot.globalCount);
    this.pc = 0;
  }

  isHalted(): boolean {
    return this.halted;
  }

  peekTop(): number | undefined {
    return this.valueStack[this.valueStack.length - 1];
  }

  reset(): void {
    this.valueStack.length = 0;
    this.callStack.length = 0;
    this.globals.fill(0);
    this.pc = 0;
    this.halted = false;
  }

  step(host: IntrinsicHost): void {
    if (this.halted) return;
    if (this.pc < 0 || this.pc >= this.robot.code.length) {
      this.halted = true;
      return;
    }
    const instr = this.robot.code[this.pc++];
    switch (instr.op) {
      case Op.PUSH_CONST:
        this.push(instr.arg | 0);
        return;
      case Op.POP:
        this.pop();
        return;
      case Op.DUP:
        this.push(this.peek());
        return;
      case Op.LOAD_LOCAL: {
        const frame = this.topFrame();
        this.push(frame.locals[instr.arg]);
        return;
      }
      case Op.STORE_LOCAL: {
        const frame = this.topFrame();
        frame.locals[instr.arg] = this.pop();
        return;
      }
      case Op.LOAD_GLOBAL:
        this.push(this.globals[instr.arg]);
        return;
      case Op.STORE_GLOBAL:
        this.globals[instr.arg] = this.pop();
        return;
      case Op.BINOP: {
        const b = this.pop();
        const a = this.pop();
        this.push(execBinop(instr.arg as BinOpCode, a, b));
        return;
      }
      case Op.UNOP: {
        const a = this.pop();
        this.push(execUnop(instr.arg as UnOpCode, a));
        return;
      }
      case Op.JMP:
        this.pc = instr.arg;
        return;
      case Op.JZ:
        if (this.pop() === 0) this.pc = instr.arg;
        return;
      case Op.JNZ:
        if (this.pop() !== 0) this.pc = instr.arg;
        return;
      case Op.CALL: {
        const funcIdx = instr.arg;
        const argc = instr.arg2 ?? 0;
        const entry = this.robot.functionEntries[funcIdx];
        const localCount = this.robot.functionLocals[funcIdx];
        const locals = new Int32Array(localCount);
        for (let i = argc - 1; i >= 0; i--) locals[i] = this.pop();
        this.callStack.push({ locals, retAddr: this.pc });
        this.pc = entry;
        return;
      }
      case Op.ICALL: {
        const idx = instr.arg;
        const argc = instr.arg2 ?? 0;
        const args = new Array<number>(argc);
        for (let i = argc - 1; i >= 0; i--) args[i] = this.pop();
        const ret = host.callIntrinsic(idx, args);
        this.push(ret | 0);
        return;
      }
      case Op.RET: {
        const frame = this.callStack.pop();
        if (!frame) {
          this.halted = true;
          return;
        }
        this.pc = frame.retAddr;
        return;
      }
      case Op.HALT:
        this.halted = true;
        return;
    }
  }

  private push(v: number): void {
    this.valueStack.push(v | 0);
  }

  private pop(): number {
    const v = this.valueStack.pop();
    if (v === undefined) {
      this.halted = true;
      throw new VMError('Value stack underflow');
    }
    return v;
  }

  private peek(): number {
    if (this.valueStack.length === 0) {
      this.halted = true;
      throw new VMError('Value stack underflow');
    }
    return this.valueStack[this.valueStack.length - 1];
  }

  private topFrame(): CallFrame {
    const f = this.callStack[this.callStack.length - 1];
    if (!f) {
      this.halted = true;
      throw new VMError('Call stack underflow');
    }
    return f;
  }
}

function execBinop(op: BinOpCode, a: number, b: number): number {
  switch (op) {
    case BinOpCode.ADD:
      return (a + b) | 0;
    case BinOpCode.SUB:
      return (a - b) | 0;
    case BinOpCode.MUL:
      return Math.imul(a, b);
    case BinOpCode.DIV:
      if (b === 0) return 0;
      return (a / b) | 0;
    case BinOpCode.MOD:
      if (b === 0) return 0;
      return (a - ((a / b) | 0) * b) | 0;
    case BinOpCode.AND:
      return (a & b) | 0;
    case BinOpCode.OR:
      return (a | b) | 0;
    case BinOpCode.XOR:
      return (a ^ b) | 0;
    case BinOpCode.SHL:
      return (a << (b & 31)) | 0;
    case BinOpCode.SHR:
      return (a >> (b & 31)) | 0;
    case BinOpCode.LAND:
      return a !== 0 && b !== 0 ? 1 : 0;
    case BinOpCode.LOR:
      return a !== 0 || b !== 0 ? 1 : 0;
    case BinOpCode.LT:
      return a < b ? 1 : 0;
    case BinOpCode.GT:
      return a > b ? 1 : 0;
    case BinOpCode.LE:
      return a <= b ? 1 : 0;
    case BinOpCode.GE:
      return a >= b ? 1 : 0;
    case BinOpCode.EQ:
      return a === b ? 1 : 0;
    case BinOpCode.NE:
      return a !== b ? 1 : 0;
  }
}

function execUnop(op: UnOpCode, a: number): number {
  switch (op) {
    case UnOpCode.NEG:
      return (-a) | 0;
    case UnOpCode.POS:
      return a | 0;
    case UnOpCode.NOT:
      return a === 0 ? 1 : 0;
    case UnOpCode.BNOT:
      return ~a | 0;
  }
}
