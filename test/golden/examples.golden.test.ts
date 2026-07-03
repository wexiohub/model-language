import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse, render } from '../../src/index';

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../examples/${rel}`, import.meta.url)), 'utf8');

describe('golden — examples render as documented', () => {
  it('welcome.mlt: null name → "there", null language → "English"', () => {
    const text = render(
      parse(read('small/welcome.mlt')).ast,
      { agent: { name: 'Aria' }, org: { name: 'Acme' }, user: { name: null, language: null } },
      [],
    ).text;
    expect(text).toBe(
      "You are Aria, support for Acme.\nThe user's name is there. Reply in English.\n",
    );
  });

  it('support-router.mlt renders the active branches with no leaked syntax', () => {
    const text = render(
      parse(read('large/support-router.mlt')).ast,
      {
        agent: { name: 'Aria' },
        org: { name: 'Acme' },
        user: {
          is_blocked: false,
          language: null,
          priority: ['urgent'],
          channel: 'whatsapp',
          lead_status: ['qualified'],
        },
      },
      [],
    ).text;
    expect(text).toContain('You are Aria, support for Acme. Reply in English.');
    expect(text).toContain('Acknowledge the urgency');
    expect(text).toContain('messenger chat');
    expect(text).toContain('qualified lead');
    expect(text).not.toContain('{{');
  });
});
