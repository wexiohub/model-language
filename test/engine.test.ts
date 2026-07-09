import { describe, expect, it } from 'vitest';
import { validate } from '../src/engine';
import type { DirectiveSpec, FieldSchema } from '../src/types';

describe('validate', () => {
  it('parses + typechecks; clean text yields no diagnostics', () => {
    const result = validate('Hi {{user.name}}', [{ path: 'user.name', type: 'string' }]);
    expect(result.diagnostics).toEqual([]);
    expect(result.maxTokenEstimate).toBeGreaterThan(0);
    expect(result.ast.length).toBeGreaterThan(0);
  });
});

const DIRS: DirectiveSpec[] = [
  {
    name: 'verify_before',
    hasBody: false,
    arg: { kind: 'scalar', type: 'enum', values: ['payments', 'calendar'] },
  },
  {
    name: 'identity',
    hasBody: false,
    arg: {
      kind: 'comparison',
      type: 'field',
      comparison: { operators: ['=='], operandType: 'field' },
    },
  },
  { name: 'assignedToMaxCount', hasBody: false, arg: { kind: 'scalar', type: 'number' } },
];
const SCHEMA: FieldSchema = [{ path: 'contact.email', type: 'string' }];

describe('validate — directives', () => {
  const codes = (src: string) =>
    validate(src, SCHEMA, { directives: DIRS }).diagnostics.map((d) => d.code);

  it('accepts a valid directive', () =>
    expect(codes('{{verify_before: calendar}}')).not.toContain('ML240'));
  it('unknown directive → ML240', () => expect(codes('{{teleport: now}}')).toContain('ML240'));
  it('enum value not allowed → ML243', () =>
    expect(codes('{{verify_before: billing}}')).toContain('ML243'));
  it('identity without comparison → ML241', () =>
    expect(codes('{{identity: contact.email}}')).toContain('ML241'));
  it('maxCount non-number → ML242', () =>
    expect(codes('{{assignedToMaxCount: ten}}')).toContain('ML242'));
  it('identity or-chain → ML244', () =>
    expect(codes('{{identity: contact.email == a or contact.phone == b}}')).toContain('ML244'));
  it('identity left field unknown → ML101', () =>
    expect(codes('{{identity: contact.emial == payment.email}}')).toContain('ML101'));

  it('validates inside a not-taken {{if}} branch', () =>
    expect(codes('{{if contact.email == "x"}}{{verify_before: billing}}{{/if}}')).toContain(
      'ML243',
    ));

  it('validates inside an {{if/else}} else branch', () =>
    expect(
      codes('{{if contact.email == "x"}}ok{{else}}{{verify_before: billing}}{{/if}}'),
    ).toContain('ML243'));

  it('no directives option → directive names NOT validated (back-compat)', () =>
    expect(validate('{{teleport: now}}', SCHEMA).diagnostics.map((d) => d.code)).not.toContain(
      'ML240',
    ));

  it('validates inside a {{for}} body', () =>
    expect(codes('{{for t in items}}{{verify_before: billing}}{{/for}}')).toContain('ML243'));

  it('validates inside a {{for}} else body', () =>
    expect(codes('{{for t in items}}ok{{else}}{{verify_before: billing}}{{/for}}')).toContain(
      'ML243',
    ));

  it('validates inside a block {{#priority}} body', () =>
    expect(codes('{{#priority high}}{{verify_before: billing}}{{/priority}}')).toContain('ML243'));
});

describe('validate — ML213 prompt budget', () => {
  const schema = [{ path: 'user.name', type: 'string' as const }];

  it('reports maxTokenEstimate but no ML213 when no budget is set', () => {
    const result = validate('Hi {{user.name}}', schema);
    expect(result.maxTokenEstimate).toBeGreaterThan(0);
    expect(result.diagnostics.map((d) => d.code)).not.toContain('ML213');
  });

  it('stays silent when the estimate fits the budget', () => {
    const result = validate('Hi {{user.name}}', schema, { maxTokenEstimate: 1000 });
    expect(result.diagnostics.map((d) => d.code)).not.toContain('ML213');
  });

  it('raises ML213 (warning) when the estimate exceeds the budget', () => {
    const result = validate('Hi {{user.name}}', schema, { maxTokenEstimate: 1 });
    const ml213 = result.diagnostics.find((d) => d.code === 'ML213');
    expect(ml213?.severity).toBe('warning');
    expect(ml213?.message).toContain('budget');
  });
});
