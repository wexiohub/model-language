import { describe, expect, it } from 'vitest';
import { parse, render, serialize, validate } from '../src/index';

describe('scaffold smoke', () => {
  it('parses plain text into a single text node', () => {
    const { ast, diagnostics } = parse('Hello, world');
    expect(diagnostics).toHaveLength(0);
    expect(ast).toEqual([{ kind: 'text', value: 'Hello, world' }]);
  });

  it('parses an empty string into an empty AST', () => {
    expect(parse('').ast).toEqual([]);
  });

  it('render never throws and returns the text (prime directive)', () => {
    const { ast } = parse('Just text.');
    const out = render(ast, {}, []);
    expect(out.text).toBe('Just text.');
    expect(out.warnings).toEqual([]);
    expect(out.tokenEstimate).toBeGreaterThan(0);
  });

  it('serialize round-trips plain text', () => {
    const src = 'plain content';
    expect(serialize(parse(src).ast)).toBe(src);
  });

  it('validate returns the parse result with no diagnostics yet', () => {
    const result = validate('Hello', []);
    expect(result.diagnostics).toEqual([]);
    expect(result.maxTokenEstimate).toBeNull();
  });
});
