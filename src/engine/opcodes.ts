export enum Op {
  PUSH_CONST = 'PUSH_CONST',
  POP = 'POP',
  DUP = 'DUP',
  LOAD_LOCAL = 'LOAD_LOCAL',
  STORE_LOCAL = 'STORE_LOCAL',
  LOAD_GLOBAL = 'LOAD_GLOBAL',
  STORE_GLOBAL = 'STORE_GLOBAL',
  BINOP = 'BINOP',
  UNOP = 'UNOP',
  CALL = 'CALL',
  ICALL = 'ICALL',
  RET = 'RET',
  JMP = 'JMP',
  JZ = 'JZ',
  JNZ = 'JNZ',
  HALT = 'HALT',
}

export enum BinOpCode {
  ADD,
  SUB,
  MUL,
  DIV,
  MOD,
  AND,
  OR,
  XOR,
  SHL,
  SHR,
  LAND,
  LOR,
  LT,
  GT,
  LE,
  GE,
  EQ,
  NE,
}

export enum UnOpCode {
  NEG,
  POS,
  NOT,
  BNOT,
}

export interface Instr {
  op: Op;
  arg: number;
  arg2?: number;
}

export const INTRINSICS = [
  'scan',
  'cannon',
  'drive',
  'damage',
  'speed',
  'loc_x',
  'loc_y',
  'rand',
  'sqrt',
  'sin',
  'cos',
  'tan',
  'atan',
] as const;

export type IntrinsicName = (typeof INTRINSICS)[number];

export const INTRINSIC_INDEX: Record<string, number> = Object.fromEntries(
  INTRINSICS.map((n, i) => [n, i]),
);

export interface CompiledRobot {
  code: Instr[];
  functionEntries: number[];
  functionLocals: number[];
  functionArgs: number[];
  functionNames: string[];
  globalCount: number;
  globalNames: string[];
  mainIndex: number;
}
