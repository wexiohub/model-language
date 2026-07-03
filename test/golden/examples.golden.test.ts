import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse, render } from '../../src/index';

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../examples/${rel}`, import.meta.url)), 'utf8');

describe('golden — examples render as documented', () => {
  it('welcome.mlt: null name → "there", null language → "English"', () => {
    const text = render(
      parse(read('welcome.mlt')).ast,
      { agent: { name: 'Aria' }, org: { name: 'Acme' }, user: { name: null, language: null } },
      [],
    ).text;
    expect(text).toBe(
      "You are Aria, support for Acme.\nThe user's name is there. Reply in English.\n",
    );
  });
});
