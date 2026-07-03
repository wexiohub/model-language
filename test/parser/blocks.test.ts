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

  it('keeps an unknown block (include) as text', () => {
    expect(fold('{{include "p"}}Z').nodes).toEqual([
      { kind: 'text', value: '{{include "p"}}' },
      { kind: 'text', value: 'Z' },
    ]);
  });
});

describe('foldBlocks — for loops', () => {
  it('folds a simple for', () => {
    expect(fold('{{for item in order.items}}-{{/for}}').nodes).toEqual([
      {
        kind: 'for',
        item: 'item',
        source: parseCondition('order.items'),
        body: [{ kind: 'text', value: '-' }],
      },
    ]);
  });

  it('folds a for with an empty-state else', () => {
    expect(fold('{{for t in xs}}A{{else}}none{{/for}}').nodes).toEqual([
      {
        kind: 'for',
        item: 't',
        source: parseCondition('xs'),
        body: [{ kind: 'text', value: 'A' }],
        elseBody: [{ kind: 'text', value: 'none' }],
      },
    ]);
  });

  it('handles a for header without `in` (recovery)', () => {
    expect(fold('{{for x}}A{{/for}}').nodes[0]).toMatchObject({ kind: 'for', item: 'x' });
  });

  it('captures a source filter pipeline', () => {
    expect(fold('{{for x in items | limit: 3}}-{{/for}}').nodes[0]).toMatchObject({
      kind: 'for',
      item: 'x',
      pipeline: [{ name: 'limit', args: [{ kind: 'literal', value: 3 }] }],
    });
  });
});

describe('foldBlocks — directives', () => {
  it('folds #priority with a body', () => {
    expect(fold('{{#priority high}}urgent{{/priority}}').nodes).toEqual([
      {
        kind: 'directive',
        name: 'priority',
        params: { level: 'high' },
        body: [{ kind: 'text', value: 'urgent' }],
      },
    ]);
  });

  it('folds #mode', () => {
    expect(fold('{{#mode winback}}x{{/mode}}').nodes[0]).toMatchObject({
      kind: 'directive',
      name: 'mode',
      params: { name: 'winback' },
    });
  });

  it('folds a self-closing #block (with + without actions)', () => {
    expect(fold('{{#block actions: ["refund", "cancel"]}}').nodes).toEqual([
      { kind: 'directive', name: 'block', params: { actions: ['refund', 'cancel'] }, body: [] },
    ]);
    expect(fold('{{#block}}').nodes[0]).toMatchObject({ name: 'block', params: { actions: [] } });
  });

  it('reports ML001 for an unclosed directive', () => {
    expect(fold('{{#priority high}}x').diagnostics.map((d) => d.code)).toEqual(['ML001']);
  });

  it('keeps stray / mismatched close directives as text', () => {
    expect(fold('{{/priority}}').nodes).toEqual([{ kind: 'text', value: '{{/priority}}' }]);
    expect(fold('{{for x in y}}{{/mode}}{{/for}}').nodes[0]).toMatchObject({
      kind: 'for',
      body: [{ kind: 'text', value: '{{/mode}}' }],
    });
    expect(fold('{{#priority high}}{{/mode}}{{/priority}}').nodes[0]).toMatchObject({
      kind: 'directive',
      name: 'priority',
      body: [{ kind: 'text', value: '{{/mode}}' }],
    });
  });

  it('reports ML001 for an unclosed for', () => {
    const { nodes, diagnostics } = fold('{{for x in y}}Z');
    expect(diagnostics.map((d) => d.code)).toEqual(['ML001']);
    expect(nodes[0]).toMatchObject({ kind: 'for', item: 'x' });
  });

  it('keeps stray / mismatched block tags as text', () => {
    expect(fold('{{/for}}').nodes).toEqual([{ kind: 'text', value: '{{/for}}' }]);
    expect(fold('{{for x in y}}{{/if}}{{/for}}').nodes[0]).toMatchObject({
      kind: 'for',
      body: [{ kind: 'text', value: '{{/if}}' }],
    });
    expect(fold('{{if a}}{{/for}}{{/if}}').nodes[0]).toMatchObject({
      kind: 'if',
      branches: [{ body: [{ kind: 'text', value: '{{/for}}' }] }],
    });
    expect(fold('{{for x in y}}{{elseif a}}{{/for}}').nodes[0]).toMatchObject({
      kind: 'for',
      body: [{ kind: 'text', value: '{{elseif a}}' }],
    });
  });
});
