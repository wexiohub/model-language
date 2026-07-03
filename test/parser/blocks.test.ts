import { describe, expect, it } from 'vitest';
import { foldBlocks } from '../../src/parser/blocks';
import { parseCondition } from '../../src/parser/condition';
import { tokenize } from '../../src/parser/lexer';

const fold = (src: string) => foldBlocks(tokenize(src), src);

describe('foldBlocks', () => {
  it('keeps root text as text', () => {
    expect(fold('hello').nodes).toEqual([{ kind: 'text', value: 'hello' }]);
  });

  it('folds a simple if', () => {
    const { nodes, diagnostics } = fold('{{if a}}X{{/if}}');
    expect(diagnostics).toEqual([]);
    expect(nodes).toEqual([
      {
        kind: 'if',
        branches: [{ condition: parseCondition('a'), body: [{ kind: 'text', value: 'X' }] }],
      },
    ]);
  });

  it('folds if/else', () => {
    expect(fold('{{if a}}X{{else}}Y{{/if}}').nodes).toEqual([
      {
        kind: 'if',
        branches: [
          { condition: parseCondition('a'), body: [{ kind: 'text', value: 'X' }] },
          { condition: null, body: [{ kind: 'text', value: 'Y' }] },
        ],
      },
    ]);
  });

  it('folds if/elseif/else (three branches)', () => {
    const node = fold('{{if a}}X{{elseif b}}Y{{else}}Z{{/if}}').nodes[0];
    expect(node).toMatchObject({ kind: 'if' });
    expect((node as { branches: unknown[] }).branches).toHaveLength(3);
  });

  it('nests ifs', () => {
    expect(fold('{{if a}}{{if b}}X{{/if}}{{/if}}').nodes).toEqual([
      {
        kind: 'if',
        branches: [
          {
            condition: parseCondition('a'),
            body: [
              {
                kind: 'if',
                branches: [
                  { condition: parseCondition('b'), body: [{ kind: 'text', value: 'X' }] },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('keeps interpolation inside a branch', () => {
    expect(fold('{{if a}}Hi {{user.name}}{{/if}}').nodes[0]).toMatchObject({
      kind: 'if',
      branches: [{ body: [{ kind: 'text', value: 'Hi ' }, { kind: 'interpolation' }] }],
    });
  });

  it('reports ML001 for an unclosed if (and counts the line) + closes at EOF', () => {
    const { nodes, diagnostics } = fold('greeting\n{{if a}}X');
    expect(diagnostics.map((d) => d.code)).toEqual(['ML001']);
    expect(diagnostics[0]?.range.startLine).toBe(2);
    expect(nodes).toEqual([
      { kind: 'text', value: 'greeting\n' },
      {
        kind: 'if',
        branches: [{ condition: parseCondition('a'), body: [{ kind: 'text', value: 'X' }] }],
      },
    ]);
  });

  it('keeps a stray /if, else, or elseif as text', () => {
    expect(fold('X{{/if}}').nodes).toEqual([
      { kind: 'text', value: 'X' },
      { kind: 'text', value: '{{/if}}' },
    ]);
    expect(fold('{{else}}').nodes).toEqual([{ kind: 'text', value: '{{else}}' }]);
    expect(fold('{{elseif a}}').nodes).toEqual([{ kind: 'text', value: '{{elseif a}}' }]);
  });

  it('keeps an unknown block (for) as text', () => {
    expect(fold('{{for x in y}}Z{{/for}}').nodes).toEqual([
      { kind: 'text', value: '{{for x in y}}' },
      { kind: 'text', value: 'Z' },
      { kind: 'text', value: '{{/for}}' },
    ]);
  });
});
