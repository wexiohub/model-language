import { expect, it } from 'vitest';
import { parse, render, validate } from '../../src';
import type { DirectiveSpec, FieldSchema } from '../../src/types';

const DIRECTIVES: DirectiveSpec[] = [
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
  { name: 'assignedTo', hasBody: false, arg: { kind: 'list', type: 'id' } },
];
const SCHEMA: FieldSchema = [
  { path: 'contact.email', type: 'string' },
  { path: 'contact.first_name', type: 'string' },
];

it('README example: validate + render a skill prompt', () => {
  const src =
    'Help with billing.\n{{verify_before: payments}}\n{{identity: contact.email == payment.email}}\nGreet {{contact.first_name | default: "there"}}.';
  expect(
    validate(src, SCHEMA, { directives: DIRECTIVES }).diagnostics.filter(
      (d) => d.severity === 'error',
    ),
  ).toEqual([]);
  const r = render(parse(src).ast, { contact: { first_name: 'Vasyl' } }, SCHEMA);
  expect(r.text).toBe('Help with billing.\n\nGreet Vasyl.');
  expect(r.directives.map((d) => d.name)).toEqual(['verify_before', 'identity']);
});
