import {
  AssignOp,
  BinOp,
  Expr,
  FuncDef,
  Program,
  Stmt,
  UnOp,
} from './ast';
import {
  BinOpCode,
  CompiledRobot,
  INTRINSIC_INDEX,
  Instr,
  Op,
  UnOpCode,
} from './opcodes';

export class CompileError extends Error {
  line: number;
  col: number;
  constructor(message: string, line = 0, col = 0) {
    super(line > 0 ? `${message} (line ${line}, col ${col})` : message);
    this.line = line;
    this.col = col;
  }
}

const BIN_OP_MAP: Record<BinOp, BinOpCode> = {
  '+': BinOpCode.ADD,
  '-': BinOpCode.SUB,
  '*': BinOpCode.MUL,
  '/': BinOpCode.DIV,
  '%': BinOpCode.MOD,
  '&': BinOpCode.AND,
  '|': BinOpCode.OR,
  '^': BinOpCode.XOR,
  '<<': BinOpCode.SHL,
  '>>': BinOpCode.SHR,
  '&&': BinOpCode.LAND,
  '||': BinOpCode.LOR,
  '<': BinOpCode.LT,
  '>': BinOpCode.GT,
  '<=': BinOpCode.LE,
  '>=': BinOpCode.GE,
  '==': BinOpCode.EQ,
  '!=': BinOpCode.NE,
};

const UN_OP_MAP: Record<UnOp, UnOpCode> = {
  '-': UnOpCode.NEG,
  '+': UnOpCode.POS,
  '!': UnOpCode.NOT,
  '~': UnOpCode.BNOT,
};

const COMPOUND_OP_MAP: Partial<Record<AssignOp, BinOpCode>> = {
  '+=': BinOpCode.ADD,
  '-=': BinOpCode.SUB,
  '*=': BinOpCode.MUL,
  '/=': BinOpCode.DIV,
  '%=': BinOpCode.MOD,
  '&=': BinOpCode.AND,
  '|=': BinOpCode.OR,
  '^=': BinOpCode.XOR,
  '<<=': BinOpCode.SHL,
  '>>=': BinOpCode.SHR,
};

interface Ctx {
  code: Instr[];
  locals: Map<string, number>;
  globals: Map<string, number>;
  funcIdx: Map<string, number>;
  funcLine: number;
  funcName: string;
}

export function compile(program: Program): CompiledRobot {
  const globals = new Map<string, number>();
  for (const n of program.externs) {
    if (globals.has(n)) throw new CompileError(`Duplicate extern '${n}'`);
    globals.set(n, globals.size);
  }

  const funcIdx = new Map<string, number>();
  const functionArgs: number[] = [];
  const functionNames: string[] = [];
  for (const fn of program.funcs) {
    if (funcIdx.has(fn.name)) {
      throw new CompileError(`Duplicate function '${fn.name}'`, fn.line, fn.col);
    }
    funcIdx.set(fn.name, functionArgs.length);
    functionArgs.push(fn.params.length);
    functionNames.push(fn.name);
  }

  const mainIndex = funcIdx.get('main');
  if (mainIndex === undefined) {
    throw new CompileError("Missing 'main()' function", 1, 1);
  }

  const code: Instr[] = [];
  const functionEntries: number[] = new Array(functionArgs.length).fill(-1);
  const functionLocals: number[] = new Array(functionArgs.length).fill(0);

  code.push({ op: Op.CALL, arg: mainIndex, arg2: 0 });
  code.push({ op: Op.HALT, arg: 0 });

  for (const fn of program.funcs) {
    const idx = funcIdx.get(fn.name)!;
    functionEntries[idx] = code.length;
    const locals = collectFuncLocals(fn);
    functionLocals[idx] = locals.size;
    const ctx: Ctx = {
      code,
      locals,
      globals,
      funcIdx,
      funcLine: fn.line,
      funcName: fn.name,
    };
    compileStmt(fn.body, ctx);
    code.push({ op: Op.PUSH_CONST, arg: 0 });
    code.push({ op: Op.RET, arg: 0 });
  }

  return {
    code,
    functionEntries,
    functionLocals,
    functionArgs,
    functionNames,
    globalCount: globals.size,
    globalNames: [...globals.keys()],
    mainIndex,
  };
}

function collectFuncLocals(fn: FuncDef): Map<string, number> {
  const locals = new Map<string, number>();
  for (const p of fn.params) {
    if (locals.has(p)) {
      throw new CompileError(`Duplicate parameter '${p}' in ${fn.name}`, fn.line, fn.col);
    }
    locals.set(p, locals.size);
  }
  collectDecls(fn.body, locals);
  return locals;
}

function collectDecls(s: Stmt, locals: Map<string, number>): void {
  switch (s.kind) {
    case 'Block':
      for (const st of s.body) collectDecls(st, locals);
      break;
    case 'VarDecl':
      for (const n of s.names) {
        if (!locals.has(n)) locals.set(n, locals.size);
      }
      break;
    case 'If':
      collectDecls(s.then, locals);
      if (s.else) collectDecls(s.else, locals);
      break;
    case 'While':
      collectDecls(s.body, locals);
      break;
  }
}

function compileStmt(s: Stmt, ctx: Ctx): void {
  switch (s.kind) {
    case 'Block':
      for (const st of s.body) compileStmt(st, ctx);
      break;
    case 'VarDecl':
      break;
    case 'Empty':
      break;
    case 'ExprStmt':
      compileExpr(s.expr, ctx);
      ctx.code.push({ op: Op.POP, arg: 0 });
      break;
    case 'If': {
      compileExpr(s.cond, ctx);
      const jzIdx = ctx.code.length;
      ctx.code.push({ op: Op.JZ, arg: -1 });
      compileStmt(s.then, ctx);
      if (s.else) {
        const jmpIdx = ctx.code.length;
        ctx.code.push({ op: Op.JMP, arg: -1 });
        ctx.code[jzIdx].arg = ctx.code.length;
        compileStmt(s.else, ctx);
        ctx.code[jmpIdx].arg = ctx.code.length;
      } else {
        ctx.code[jzIdx].arg = ctx.code.length;
      }
      break;
    }
    case 'While': {
      const top = ctx.code.length;
      compileExpr(s.cond, ctx);
      const jzIdx = ctx.code.length;
      ctx.code.push({ op: Op.JZ, arg: -1 });
      compileStmt(s.body, ctx);
      ctx.code.push({ op: Op.JMP, arg: top });
      ctx.code[jzIdx].arg = ctx.code.length;
      break;
    }
    case 'Return': {
      if (s.expr) compileExpr(s.expr, ctx);
      else ctx.code.push({ op: Op.PUSH_CONST, arg: 0 });
      ctx.code.push({ op: Op.RET, arg: 0 });
      break;
    }
  }
}

function compileExpr(e: Expr, ctx: Ctx): void {
  switch (e.kind) {
    case 'Num':
      ctx.code.push({ op: Op.PUSH_CONST, arg: e.value | 0 });
      break;
    case 'Ident':
      emitLoad(e.name, ctx);
      break;
    case 'Binary':
      compileExpr(e.left, ctx);
      compileExpr(e.right, ctx);
      ctx.code.push({ op: Op.BINOP, arg: BIN_OP_MAP[e.op] });
      break;
    case 'Unary':
      compileExpr(e.expr, ctx);
      ctx.code.push({ op: Op.UNOP, arg: UN_OP_MAP[e.op] });
      break;
    case 'Assign': {
      if (e.op === '=') {
        compileExpr(e.value, ctx);
        ctx.code.push({ op: Op.DUP, arg: 0 });
        emitStore(e.target, ctx);
      } else {
        emitLoad(e.target, ctx);
        compileExpr(e.value, ctx);
        const b = COMPOUND_OP_MAP[e.op];
        if (b === undefined) throw new CompileError(`Unsupported compound op ${e.op}`);
        ctx.code.push({ op: Op.BINOP, arg: b });
        ctx.code.push({ op: Op.DUP, arg: 0 });
        emitStore(e.target, ctx);
      }
      break;
    }
    case 'IncDec':
      emitLoad(e.target, ctx);
      ctx.code.push({ op: Op.PUSH_CONST, arg: 1 });
      ctx.code.push({
        op: Op.BINOP,
        arg: e.op === '++' ? BinOpCode.ADD : BinOpCode.SUB,
      });
      ctx.code.push({ op: Op.DUP, arg: 0 });
      emitStore(e.target, ctx);
      break;
    case 'Call': {
      const intrIdx = INTRINSIC_INDEX[e.name];
      if (intrIdx !== undefined) {
        for (const a of e.args) compileExpr(a, ctx);
        ctx.code.push({ op: Op.ICALL, arg: intrIdx, arg2: e.args.length });
        return;
      }
      const fidx = ctx.funcIdx.get(e.name);
      if (fidx === undefined) {
        throw new CompileError(
          `Undefined function '${e.name}' (in ${ctx.funcName})`,
          ctx.funcLine,
          0,
        );
      }
      for (const a of e.args) compileExpr(a, ctx);
      ctx.code.push({ op: Op.CALL, arg: fidx, arg2: e.args.length });
      break;
    }
  }
}

function emitLoad(name: string, ctx: Ctx): void {
  const li = ctx.locals.get(name);
  if (li !== undefined) {
    ctx.code.push({ op: Op.LOAD_LOCAL, arg: li });
    return;
  }
  const gi = ctx.globals.get(name);
  if (gi !== undefined) {
    ctx.code.push({ op: Op.LOAD_GLOBAL, arg: gi });
    return;
  }
  throw new CompileError(`Undefined variable '${name}' (in ${ctx.funcName})`, ctx.funcLine, 0);
}

function emitStore(name: string, ctx: Ctx): void {
  const li = ctx.locals.get(name);
  if (li !== undefined) {
    ctx.code.push({ op: Op.STORE_LOCAL, arg: li });
    return;
  }
  const gi = ctx.globals.get(name);
  if (gi !== undefined) {
    ctx.code.push({ op: Op.STORE_GLOBAL, arg: gi });
    return;
  }
  throw new CompileError(`Undefined variable '${name}' (in ${ctx.funcName})`, ctx.funcLine, 0);
}
