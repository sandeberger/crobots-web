export enum TokType {
  NUMBER = 'NUMBER',
  IDENT = 'IDENT',

  KW_INT = 'KW_INT',
  KW_LONG = 'KW_LONG',
  KW_AUTO = 'KW_AUTO',
  KW_REGISTER = 'KW_REGISTER',
  KW_IF = 'KW_IF',
  KW_ELSE = 'KW_ELSE',
  KW_WHILE = 'KW_WHILE',
  KW_RETURN = 'KW_RETURN',

  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  COMMA = 'COMMA',
  SEMI = 'SEMI',

  ASSIGN = 'ASSIGN',
  PLUS_ASSIGN = 'PLUS_ASSIGN',
  MINUS_ASSIGN = 'MINUS_ASSIGN',
  STAR_ASSIGN = 'STAR_ASSIGN',
  SLASH_ASSIGN = 'SLASH_ASSIGN',
  PERCENT_ASSIGN = 'PERCENT_ASSIGN',
  AND_ASSIGN = 'AND_ASSIGN',
  OR_ASSIGN = 'OR_ASSIGN',
  XOR_ASSIGN = 'XOR_ASSIGN',
  LSHIFT_ASSIGN = 'LSHIFT_ASSIGN',
  RSHIFT_ASSIGN = 'RSHIFT_ASSIGN',

  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  INC = 'INC',
  DEC = 'DEC',

  BIT_AND = 'BIT_AND',
  BIT_OR = 'BIT_OR',
  BIT_XOR = 'BIT_XOR',
  BIT_NOT = 'BIT_NOT',
  LSHIFT = 'LSHIFT',
  RSHIFT = 'RSHIFT',

  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',

  LT = 'LT',
  GT = 'GT',
  LE = 'LE',
  GE = 'GE',
  EQ = 'EQ',
  NE = 'NE',

  EOF = 'EOF',
}

export interface Token {
  type: TokType;
  value: string;
  num?: number;
  line: number;
  col: number;
}

export const KEYWORDS: Record<string, TokType> = {
  int: TokType.KW_INT,
  long: TokType.KW_LONG,
  auto: TokType.KW_AUTO,
  register: TokType.KW_REGISTER,
  if: TokType.KW_IF,
  else: TokType.KW_ELSE,
  while: TokType.KW_WHILE,
  return: TokType.KW_RETURN,
};
