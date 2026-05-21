import { Token, TokType } from './tokens';
import { AssignOp, Expr, FuncDef, Program, Stmt } from './ast';

export class ParseError extends Error {
  line: number;
  col: number;
  constructor(message: string, line: number, col: number) {
    super(`${message} (line ${line}, col ${col})`);
    this.line = line;
    this.col = col;
  }
}

const ASSIGN_MAP: Partial<Record<TokType, AssignOp>> = {
  [TokType.ASSIGN]: '=',
  [TokType.PLUS_ASSIGN]: '+=',
  [TokType.MINUS_ASSIGN]: '-=',
  [TokType.STAR_ASSIGN]: '*=',
  [TokType.SLASH_ASSIGN]: '/=',
  [TokType.PERCENT_ASSIGN]: '%=',
  [TokType.AND_ASSIGN]: '&=',
  [TokType.OR_ASSIGN]: '|=',
  [TokType.XOR_ASSIGN]: '^=',
  [TokType.LSHIFT_ASSIGN]: '<<=',
  [TokType.RSHIFT_ASSIGN]: '>>=',
};

class Parser {
  private i = 0;
  constructor(private tokens: Token[]) {}

  parseProgram(): Program {
    const externs: string[] = [];
    const funcs: FuncDef[] = [];
    while (!this.atEnd()) {
      const t = this.peek();
      if (t.type === TokType.KW_INT || t.type === TokType.KW_LONG) {
        const after = this.tokens[this.i + 1];
        const afterAfter = this.tokens[this.i + 2];
        if (after?.type === TokType.IDENT && afterAfter?.type === TokType.LPAREN) {
          funcs.push(this.parseFuncDef());
        } else {
          this.advance();
          externs.push(...this.parseExternNames());
        }
      } else if (t.type === TokType.IDENT) {
        funcs.push(this.parseFuncDef());
      } else {
        throw new ParseError(`Unexpected token '${t.value || t.type}' at file scope`, t.line, t.col);
      }
    }
    return { externs, funcs };
  }

  private parseExternNames(): string[] {
    const names = [this.expect(TokType.IDENT, 'variable name').value];
    while (this.accept(TokType.COMMA)) {
      names.push(this.expect(TokType.IDENT, 'variable name').value);
    }
    this.expect(TokType.SEMI, "';'");
    return names;
  }

  private parseFuncDef(): FuncDef {
    if (this.peek().type === TokType.KW_INT || this.peek().type === TokType.KW_LONG) {
      this.advance();
    }
    const nameTok = this.expect(TokType.IDENT, 'function name');
    this.expect(TokType.LPAREN, "'('");
    const params: string[] = [];
    if (this.peek().type !== TokType.RPAREN) {
      params.push(this.parseParam());
      while (this.accept(TokType.COMMA)) params.push(this.parseParam());
    }
    this.expect(TokType.RPAREN, "')'");

    while (
      this.peek().type === TokType.KW_INT ||
      this.peek().type === TokType.KW_LONG ||
      this.peek().type === TokType.KW_AUTO ||
      this.peek().type === TokType.KW_REGISTER
    ) {
      this.advance();
      this.expect(TokType.IDENT, 'parameter name');
      while (this.accept(TokType.COMMA)) this.expect(TokType.IDENT, 'parameter name');
      this.expect(TokType.SEMI, "';'");
    }

    const body = this.parseBlock();
    return { name: nameTok.value, params, body, line: nameTok.line, col: nameTok.col };
  }

  private parseParam(): string {
    if (
      this.peek().type === TokType.KW_INT ||
      this.peek().type === TokType.KW_LONG ||
      this.peek().type === TokType.KW_AUTO ||
      this.peek().type === TokType.KW_REGISTER
    ) {
      this.advance();
    }
    return this.expect(TokType.IDENT, 'parameter name').value;
  }

  private parseBlock(): Stmt {
    this.expect(TokType.LBRACE, "'{'");
    const body: Stmt[] = [];
    while (!this.check(TokType.RBRACE) && !this.atEnd()) {
      body.push(this.parseStmt());
    }
    this.expect(TokType.RBRACE, "'}'");
    return { kind: 'Block', body };
  }

  private parseStmt(): Stmt {
    const t = this.peek();
    if (t.type === TokType.LBRACE) return this.parseBlock();
    if (t.type === TokType.SEMI) {
      this.advance();
      return { kind: 'Empty' };
    }
    if (
      t.type === TokType.KW_INT ||
      t.type === TokType.KW_LONG ||
      t.type === TokType.KW_AUTO ||
      t.type === TokType.KW_REGISTER
    ) {
      return this.parseVarDecl();
    }
    if (t.type === TokType.KW_IF) return this.parseIf();
    if (t.type === TokType.KW_WHILE) return this.parseWhile();
    if (t.type === TokType.KW_RETURN) return this.parseReturn();
    const expr = this.parseExpr();
    this.expect(TokType.SEMI, "';'");
    return { kind: 'ExprStmt', expr };
  }

  private parseVarDecl(): Stmt {
    while (true) {
      const t = this.peek().type;
      if (
        t === TokType.KW_INT ||
        t === TokType.KW_LONG ||
        t === TokType.KW_AUTO ||
        t === TokType.KW_REGISTER
      ) {
        this.advance();
      } else {
        break;
      }
    }
    const names: string[] = [];
    names.push(this.expect(TokType.IDENT, 'variable name').value);
    while (this.accept(TokType.COMMA)) {
      names.push(this.expect(TokType.IDENT, 'variable name').value);
    }
    this.expect(TokType.SEMI, "';'");
    return { kind: 'VarDecl', names };
  }

  private parseIf(): Stmt {
    this.expect(TokType.KW_IF, "'if'");
    this.expect(TokType.LPAREN, "'('");
    const cond = this.parseExpr();
    this.expect(TokType.RPAREN, "')'");
    const then = this.parseStmt();
    let els: Stmt | null = null;
    if (this.accept(TokType.KW_ELSE)) els = this.parseStmt();
    return { kind: 'If', cond, then, else: els };
  }

  private parseWhile(): Stmt {
    this.expect(TokType.KW_WHILE, "'while'");
    this.expect(TokType.LPAREN, "'('");
    const cond = this.parseExpr();
    this.expect(TokType.RPAREN, "')'");
    const body = this.parseStmt();
    return { kind: 'While', cond, body };
  }

  private parseReturn(): Stmt {
    this.expect(TokType.KW_RETURN, "'return'");
    let expr: Expr | null = null;
    if (this.peek().type !== TokType.SEMI) expr = this.parseExpr();
    this.expect(TokType.SEMI, "';'");
    return { kind: 'Return', expr };
  }

  private parseExpr(): Expr {
    return this.parseAssign();
  }

  private parseAssign(): Expr {
    const lhs = this.parseLogicalOr();
    const t = this.peek().type;
    if (t in ASSIGN_MAP) {
      if (lhs.kind !== 'Ident') {
        const pt = this.peek();
        throw new ParseError('Left-hand side of assignment must be a variable', pt.line, pt.col);
      }
      const opTok = this.advance();
      const rhs = this.parseAssign();
      return { kind: 'Assign', op: ASSIGN_MAP[opTok.type]!, target: lhs.name, value: rhs };
    }
    return lhs;
  }

  private parseLogicalOr(): Expr {
    let l = this.parseLogicalAnd();
    while (this.accept(TokType.OR)) l = { kind: 'Binary', op: '||', left: l, right: this.parseLogicalAnd() };
    return l;
  }

  private parseLogicalAnd(): Expr {
    let l = this.parseBitOr();
    while (this.accept(TokType.AND)) l = { kind: 'Binary', op: '&&', left: l, right: this.parseBitOr() };
    return l;
  }

  private parseBitOr(): Expr {
    let l = this.parseBitXor();
    while (this.accept(TokType.BIT_OR)) l = { kind: 'Binary', op: '|', left: l, right: this.parseBitXor() };
    return l;
  }

  private parseBitXor(): Expr {
    let l = this.parseBitAnd();
    while (this.accept(TokType.BIT_XOR)) l = { kind: 'Binary', op: '^', left: l, right: this.parseBitAnd() };
    return l;
  }

  private parseBitAnd(): Expr {
    let l = this.parseEquality();
    while (this.accept(TokType.BIT_AND)) l = { kind: 'Binary', op: '&', left: l, right: this.parseEquality() };
    return l;
  }

  private parseEquality(): Expr {
    let l = this.parseRelational();
    while (true) {
      if (this.accept(TokType.EQ)) l = { kind: 'Binary', op: '==', left: l, right: this.parseRelational() };
      else if (this.accept(TokType.NE)) l = { kind: 'Binary', op: '!=', left: l, right: this.parseRelational() };
      else break;
    }
    return l;
  }

  private parseRelational(): Expr {
    let l = this.parseShift();
    while (true) {
      if (this.accept(TokType.LT)) l = { kind: 'Binary', op: '<', left: l, right: this.parseShift() };
      else if (this.accept(TokType.GT)) l = { kind: 'Binary', op: '>', left: l, right: this.parseShift() };
      else if (this.accept(TokType.LE)) l = { kind: 'Binary', op: '<=', left: l, right: this.parseShift() };
      else if (this.accept(TokType.GE)) l = { kind: 'Binary', op: '>=', left: l, right: this.parseShift() };
      else break;
    }
    return l;
  }

  private parseShift(): Expr {
    let l = this.parseAdditive();
    while (true) {
      if (this.accept(TokType.LSHIFT)) l = { kind: 'Binary', op: '<<', left: l, right: this.parseAdditive() };
      else if (this.accept(TokType.RSHIFT)) l = { kind: 'Binary', op: '>>', left: l, right: this.parseAdditive() };
      else break;
    }
    return l;
  }

  private parseAdditive(): Expr {
    let l = this.parseMul();
    while (true) {
      if (this.accept(TokType.PLUS)) l = { kind: 'Binary', op: '+', left: l, right: this.parseMul() };
      else if (this.accept(TokType.MINUS)) l = { kind: 'Binary', op: '-', left: l, right: this.parseMul() };
      else break;
    }
    return l;
  }

  private parseMul(): Expr {
    let l = this.parseUnary();
    while (true) {
      if (this.accept(TokType.STAR)) l = { kind: 'Binary', op: '*', left: l, right: this.parseUnary() };
      else if (this.accept(TokType.SLASH)) l = { kind: 'Binary', op: '/', left: l, right: this.parseUnary() };
      else if (this.accept(TokType.PERCENT)) l = { kind: 'Binary', op: '%', left: l, right: this.parseUnary() };
      else break;
    }
    return l;
  }

  private parseUnary(): Expr {
    if (this.accept(TokType.MINUS)) return { kind: 'Unary', op: '-', expr: this.parseUnary() };
    if (this.accept(TokType.PLUS)) return { kind: 'Unary', op: '+', expr: this.parseUnary() };
    if (this.accept(TokType.NOT)) return { kind: 'Unary', op: '!', expr: this.parseUnary() };
    if (this.accept(TokType.BIT_NOT)) return { kind: 'Unary', op: '~', expr: this.parseUnary() };
    if (this.accept(TokType.INC)) {
      const e = this.parseUnary();
      if (e.kind !== 'Ident') {
        const t = this.peek();
        throw new ParseError("'++' requires a variable", t.line, t.col);
      }
      return { kind: 'IncDec', op: '++', target: e.name };
    }
    if (this.accept(TokType.DEC)) {
      const e = this.parseUnary();
      if (e.kind !== 'Ident') {
        const t = this.peek();
        throw new ParseError("'--' requires a variable", t.line, t.col);
      }
      return { kind: 'IncDec', op: '--', target: e.name };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Expr {
    let e = this.parsePrimary();
    while (true) {
      if (this.accept(TokType.INC)) {
        if (e.kind !== 'Ident') {
          const t = this.peek();
          throw new ParseError("'++' requires a variable", t.line, t.col);
        }
        e = { kind: 'IncDec', op: '++', target: e.name };
      } else if (this.accept(TokType.DEC)) {
        if (e.kind !== 'Ident') {
          const t = this.peek();
          throw new ParseError("'--' requires a variable", t.line, t.col);
        }
        e = { kind: 'IncDec', op: '--', target: e.name };
      } else {
        break;
      }
    }
    return e;
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    if (t.type === TokType.NUMBER) {
      this.advance();
      return { kind: 'Num', value: t.num! };
    }
    if (t.type === TokType.LPAREN) {
      this.advance();
      const e = this.parseExpr();
      this.expect(TokType.RPAREN, "')'");
      return e;
    }
    if (t.type === TokType.IDENT) {
      this.advance();
      if (this.accept(TokType.LPAREN)) {
        const args: Expr[] = [];
        if (this.peek().type !== TokType.RPAREN) {
          args.push(this.parseExpr());
          while (this.accept(TokType.COMMA)) args.push(this.parseExpr());
        }
        this.expect(TokType.RPAREN, "')'");
        return { kind: 'Call', name: t.value, args };
      }
      return { kind: 'Ident', name: t.value };
    }
    throw new ParseError(`Unexpected token '${t.value || t.type}'`, t.line, t.col);
  }

  private peek(ahead = 0): Token {
    return this.tokens[this.i + ahead];
  }

  private advance(): Token {
    return this.tokens[this.i++];
  }

  private atEnd(): boolean {
    return this.peek().type === TokType.EOF;
  }

  private check(type: TokType): boolean {
    return this.peek().type === type;
  }

  private accept(type: TokType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: TokType, what: string): Token {
    if (!this.check(type)) {
      const t = this.peek();
      throw new ParseError(`Expected ${what}, got '${t.value || t.type}'`, t.line, t.col);
    }
    return this.advance();
  }
}

export function parse(tokens: Token[]): Program {
  return new Parser(tokens).parseProgram();
}
