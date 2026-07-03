import { describe, expect, it } from 'vitest';
import { tokenize } from '../src/parser/lexer';

const raws = (source: string) => tokenize(source).map((seg) => [seg.type, seg.raw]);

describe('tokenize', () => {
  it('empty source → no segments', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('plain text → one text segment', () => {
    expect(raws('abc')).toEqual([['text', 'abc']]);
  });

  it('a bare tag → one tag segment, no leading text', () => {
    expect(raws('{{x}}')).toEqual([['tag', '{{x}}']]);
  });

  it('text around a tag → text, tag, text', () => {
    expect(raws('a{{x}}b')).toEqual([
      ['text', 'a'],
      ['tag', '{{x}}'],
      ['text', 'b'],
    ]);
  });

  it('adjacent tags → two tag segments', () => {
    expect(raws('{{a}}{{b}}')).toEqual([
      ['tag', '{{a}}'],
      ['tag', '{{b}}'],
    ]);
  });

  it('unclosed tag → kept verbatim as text (never mangled)', () => {
    expect(raws('{{x')).toEqual([['text', '{{x']]);
  });

  it('text then unclosed tag → text, then verbatim text', () => {
    expect(raws('a {{x')).toEqual([
      ['text', 'a '],
      ['text', '{{x'],
    ]);
  });

  it('reports exact source offsets', () => {
    expect(tokenize('a{{x}}')).toEqual([
      { type: 'text', raw: 'a', start: 0, end: 1 },
      { type: 'tag', raw: '{{x}}', start: 1, end: 6 },
    ]);
  });
});
