import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { flowDiagnostics } from '../../src/typecheck/flow';

const codes = (src: string) => flowDiagnostics(parse(src).ast).map((d) => d.code);

describe('flow — ML212 self-contradiction', () => {
  it('flags a field required to equal two values', () => {
    expect(codes('{{if p == "a" and p == "b"}}x{{/if}}')).toEqual(['ML212']);
  });

  it('flags a path required truthy and falsy (truthy then falsy)', () => {
    expect(codes('{{if p and not p}}x{{/if}}')).toEqual(['ML212']);
  });

  it('flags a path required falsy and truthy (falsy then truthy)', () => {
    expect(codes('{{if not p and p}}x{{/if}}')).toEqual(['ML212']);
  });
});

describe('flow — ML211 unreachable branch', () => {
  it('flags a nested branch an enclosing condition already rules out', () => {
    expect(codes('{{if p == "pro"}}{{if p == "free"}}x{{/if}}{{/if}}')).toEqual(['ML211']);
  });

  it('flags a branch that repeats an earlier condition in the chain', () => {
    expect(codes('{{if a}}x{{elseif a}}y{{/if}}')).toEqual(['ML211']);
  });
});

describe('flow — no false positives', () => {
  it('accepts a normal enum chain (with an else)', () => {
    expect(codes('{{if p == "a"}}x{{elseif p == "b"}}y{{else}}z{{/if}}')).toEqual([]);
  });

  it('derives nothing from an `or`', () => {
    expect(codes('{{if p == "a" or p == "b"}}x{{/if}}')).toEqual([]);
  });

  it('ignores a non-equality comparison', () => {
    expect(codes('{{if p > 5}}x{{/if}}')).toEqual([]);
  });

  it('ignores `==` whose left side is not a path', () => {
    expect(codes('{{if "a" == p}}x{{/if}}')).toEqual([]);
  });

  it('ignores `==` whose right side is not a literal', () => {
    expect(codes('{{if p == q}}x{{/if}}')).toEqual([]);
  });

  it('ignores `==` whose right side is not a string', () => {
    expect(codes('{{if p == 5}}x{{/if}}')).toEqual([]);
  });

  it('ignores `not` of a non-path', () => {
    expect(codes('{{if not (a and b)}}x{{/if}}')).toEqual([]);
  });

  it('ignores a literal condition', () => {
    expect(codes('{{if true}}x{{/if}}')).toEqual([]);
  });

  it('accepts a repeated-but-consistent equality (redundant, not contradictory)', () => {
    expect(codes('{{if p == "a" and p == "a"}}x{{/if}}')).toEqual([]);
  });
});

describe('flow — recurses into containers', () => {
  it('checks conditions inside a for body (no else)', () => {
    expect(codes('{{for i in xs}}{{if p == "a" and p == "b"}}x{{/if}}{{/for}}')).toEqual(['ML212']);
  });

  it('checks conditions inside a for-else body', () => {
    expect(codes('{{for i in xs}}x{{else}}{{if p and not p}}y{{/if}}{{/for}}')).toEqual(['ML212']);
  });

  it('checks conditions inside a directive body', () => {
    expect(codes('{{#priority high}}{{if p == "a" and p == "b"}}x{{/if}}{{/priority}}')).toEqual([
      'ML212',
    ]);
  });

  it('ignores plain text / non-container nodes', () => {
    expect(codes('just text {{ p }}')).toEqual([]);
  });
});
