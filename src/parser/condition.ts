import type { Expr } from '../types';

/**
 * Condition expression parser — tokenizer + recursive-descent parser turning a
 * condition string (`user.plan == "pro" and not user.blocked`) into an `Expr`.
 * Precedence low→high: `or` → `and` → `not` → comparison → primary. Never
 * throws; a malformed tail parses as far as it can.
 */

const COMPARE_OPS = ['==', '!=', '<=', '>='];
const WORD_OPS = [
  'in',
  'contains',
  'contains_any',
  'contains_all',
  'is_empty',
  'startsWith',
  'endsWith',
  'matches',
  'exists',
];
const UNARY_OPS = new Set(['exists', 'is_empty']);
const PUNCT = '()[],';

interface Tok {
  t: 'op' | 'word' | 'punc' | 'value';
  v: string;
}

function isSpace(c: string): boolean {
  return /\s/.test(c);
}

/** A word (path / bare identifier / keyword) char — anything that isn't a
 *  delimiter, operator char, or quote. */
function isWordChar(c: string): boolean {
  return !/[\s()[\],=<>!"']/.test(c);
}

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i] as string;
    if (isSpace(c)) {
      i += 1;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += 1;
      toks.push({ t: 'value', v: src.slice(i, j + 1) });
      i = j + 1;
    } else if (PUNCT.includes(c)) {
      toks.push({ t: 'punc', v: c });
      i += 1;
    } else if (COMPARE_OPS.includes(src.slice(i, i + 2))) {
      toks.push({ t: 'op', v: src.slice(i, i + 2) });
      i += 2;
    } else if (c === '<' || c === '>') {
      toks.push({ t: 'op', v: c });
      i += 1;
    } else {
      let j = i;
      while (j < src.length && isWordChar(src[j] as string)) j += 1;
      if (j === i) {
        // A stray delimiter/operator char we don't tokenize (e.g. a lone `=`) —
        // skip it so we never loop forever on malformed input.
        i += 1;
      } else {
        const word = src.slice(i, j);
        const isKeyword =
          word === 'and' || word === 'or' || word === 'not' || WORD_OPS.includes(word);
        toks.push({ t: isKeyword ? 'word' : 'value', v: word });
        i = j;
      }
    }
  }
  return toks;
}

function valueExpr(raw: string): Expr {
  const t = raw.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return { kind: 'literal', value: t.slice(1, -1) };
  }
  if (t === 'true' || t === 'false') return { kind: 'literal', value: t === 'true' };
  if (t === 'null') return { kind: 'literal', value: null };
  if (t === 'undefined') return { kind: 'literal', value: undefined };
  if (/^-?\d+(\.\d+)?$/.test(t)) return { kind: 'literal', value: Number(t) };
  return { kind: 'path', path: t };
}

class Parser {
  private pos = 0;
  constructor(private readonly toks: Tok[]) {}

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }

  private next(): Tok | undefined {
    const t = this.toks[this.pos];
    this.pos += 1;
    return t;
  }

  parse(): Expr {
    return this.or();
  }

  private or(): Expr {
    let left = this.and();
    while (this.peek()?.v === 'or') {
      this.next();
      left = { kind: 'logical', op: 'or', left, right: this.and() };
    }
    return left;
  }

  private and(): Expr {
    let left = this.notExpr();
    while (this.peek()?.v === 'and') {
      this.next();
      left = { kind: 'logical', op: 'and', left, right: this.notExpr() };
    }
    return left;
  }

  private notExpr(): Expr {
    if (this.peek()?.v === 'not') {
      this.next();
      return { kind: 'not', expr: this.notExpr() };
    }
    return this.comparison();
  }

  private comparison(): Expr {
    const left = this.primary();
    const op = this.peek();
    if (op && (op.t === 'op' || (op.t === 'word' && WORD_OPS.includes(op.v)))) {
      this.next();
      if (UNARY_OPS.has(op.v)) {
        return { kind: 'binary', op: op.v, left, right: { kind: 'literal', value: null } };
      }
      return { kind: 'binary', op: op.v, left, right: this.primary() };
    }
    return left;
  }

  private primary(): Expr {
    const t = this.next();
    if (!t) return { kind: 'literal', value: undefined };
    if (t.v === '(') {
      const inner = this.or();
      if (this.peek()?.v === ')') this.next();
      return inner;
    }
    if (t.v === '[') {
      const items: unknown[] = [];
      while (this.peek() && this.peek()?.v !== ']') {
        const el = this.next() as Tok;
        if (el.v !== ',') {
          const parsed = valueExpr(el.v);
          items.push(parsed.kind === 'literal' ? parsed.value : el.v);
        }
      }
      if (this.peek()?.v === ']') this.next();
      return { kind: 'literal', value: items };
    }
    return valueExpr(t.v);
  }
}

/** Parse a condition string into an Expr. Never throws. */
export function parseCondition(src: string): Expr {
  return new Parser(tokenize(src)).parse();
}
