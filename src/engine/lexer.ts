import { KEYWORDS, Token, TokType } from './tokens';

export class LexError extends Error {
  line: number;
  col: number;
  constructor(message: string, line: number, col: number) {
    super(`${message} (line ${line}, col ${col})`);
    this.line = line;
    this.col = col;
  }
}

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const peek = (ahead = 0): string => src[i + ahead] ?? '';
  const advance = (): string => {
    const ch = src[i++];
    if (ch === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  };

  const push = (type: TokType, value: string, startLine: number, startCol: number, num?: number) => {
    const tok: Token = { type, value, line: startLine, col: startCol };
    if (num !== undefined) tok.num = num;
    tokens.push(tok);
  };

  const TWO_CHAR: Record<string, TokType> = {
    '==': TokType.EQ,
    '!=': TokType.NE,
    '<=': TokType.LE,
    '>=': TokType.GE,
    '&&': TokType.AND,
    '||': TokType.OR,
    '<<': TokType.LSHIFT,
    '>>': TokType.RSHIFT,
    '+=': TokType.PLUS_ASSIGN,
    '-=': TokType.MINUS_ASSIGN,
    '*=': TokType.STAR_ASSIGN,
    '/=': TokType.SLASH_ASSIGN,
    '%=': TokType.PERCENT_ASSIGN,
    '&=': TokType.AND_ASSIGN,
    '|=': TokType.OR_ASSIGN,
    '^=': TokType.XOR_ASSIGN,
    '++': TokType.INC,
    '--': TokType.DEC,
  };

  const ONE_CHAR: Record<string, TokType> = {
    '(': TokType.LPAREN,
    ')': TokType.RPAREN,
    '{': TokType.LBRACE,
    '}': TokType.RBRACE,
    ',': TokType.COMMA,
    ';': TokType.SEMI,
    '+': TokType.PLUS,
    '-': TokType.MINUS,
    '*': TokType.STAR,
    '/': TokType.SLASH,
    '%': TokType.PERCENT,
    '&': TokType.BIT_AND,
    '|': TokType.BIT_OR,
    '^': TokType.BIT_XOR,
    '~': TokType.BIT_NOT,
    '!': TokType.NOT,
    '<': TokType.LT,
    '>': TokType.GT,
    '=': TokType.ASSIGN,
  };

  while (i < src.length) {
    const ch = peek();

    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advance();
      continue;
    }

    if (ch === '/' && peek(1) === '*') {
      const startLine = line;
      const startCol = col;
      advance();
      advance();
      let closed = false;
      while (i < src.length) {
        if (peek() === '*' && peek(1) === '/') {
          advance();
          advance();
          closed = true;
          break;
        }
        advance();
      }
      if (!closed) throw new LexError('Unterminated comment', startLine, startCol);
      continue;
    }

    const tokLine = line;
    const tokCol = col;

    if (/[A-Za-z_]/.test(ch)) {
      let s = '';
      while (i < src.length && /[A-Za-z_0-9]/.test(peek())) s += advance();
      const kw = KEYWORDS[s];
      push(kw ?? TokType.IDENT, s, tokLine, tokCol);
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let s = '';
      while (i < src.length && /[0-9]/.test(peek())) s += advance();
      const n = parseInt(s, 10);
      if (!Number.isFinite(n)) throw new LexError(`Invalid number: ${s}`, tokLine, tokCol);
      push(TokType.NUMBER, s, tokLine, tokCol, n);
      continue;
    }

    const three = ch + peek(1) + peek(2);
    if (three === '<<=') {
      advance();
      advance();
      advance();
      push(TokType.LSHIFT_ASSIGN, three, tokLine, tokCol);
      continue;
    }
    if (three === '>>=') {
      advance();
      advance();
      advance();
      push(TokType.RSHIFT_ASSIGN, three, tokLine, tokCol);
      continue;
    }

    const two = ch + peek(1);
    if (two in TWO_CHAR) {
      advance();
      advance();
      push(TWO_CHAR[two], two, tokLine, tokCol);
      continue;
    }

    if (ch in ONE_CHAR) {
      advance();
      push(ONE_CHAR[ch], ch, tokLine, tokCol);
      continue;
    }

    throw new LexError(`Unexpected character '${ch}'`, tokLine, tokCol);
  }

  tokens.push({ type: TokType.EOF, value: '', line, col });
  return tokens;
}
