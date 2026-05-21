export type BinOp =
  | '+' | '-' | '*' | '/' | '%'
  | '&' | '|' | '^' | '<<' | '>>'
  | '&&' | '||'
  | '<' | '>' | '<=' | '>=' | '==' | '!=';

export type UnOp = '-' | '+' | '!' | '~';

export type AssignOp =
  | '=' | '+=' | '-=' | '*=' | '/=' | '%='
  | '&=' | '|=' | '^=' | '<<=' | '>>=';

export type Expr =
  | { kind: 'Num'; value: number }
  | { kind: 'Ident'; name: string }
  | { kind: 'Binary'; op: BinOp; left: Expr; right: Expr }
  | { kind: 'Unary'; op: UnOp; expr: Expr }
  | { kind: 'Assign'; op: AssignOp; target: string; value: Expr }
  | { kind: 'IncDec'; op: '++' | '--'; target: string }
  | { kind: 'Call'; name: string; args: Expr[] };

export type Stmt =
  | { kind: 'Block'; body: Stmt[] }
  | { kind: 'VarDecl'; names: string[] }
  | { kind: 'ExprStmt'; expr: Expr }
  | { kind: 'If'; cond: Expr; then: Stmt; else: Stmt | null }
  | { kind: 'While'; cond: Expr; body: Stmt }
  | { kind: 'Return'; expr: Expr | null }
  | { kind: 'Empty' };

export interface FuncDef {
  name: string;
  params: string[];
  body: Stmt;
  line: number;
  col: number;
}

export interface Program {
  externs: string[];
  funcs: FuncDef[];
}
