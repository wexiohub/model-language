import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse, render } from '../../src/index';

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../examples/${rel}`, import.meta.url)), 'utf8');

describe('golden — examples render as documented', () => {
  it('welcome.mlt: null name → "there", null language → "English"', () => {
    const text = render(
      parse(read('welcome/welcome.mlt')).ast,
      { agent: { name: 'Aria' }, org: { name: 'Acme' }, user: { name: null, language: null } },
      [],
    ).text;
    expect(text).toBe(
      "You are Aria, support for Acme.\nThe user's name is there. Reply in English.\n",
    );
  });

  it('support-router.mlt renders the active branches with no leaked syntax', () => {
    const text = render(
      parse(read('support-router/support-router.mlt')).ast,
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

  const renders = (rel: string, data: Record<string, unknown>) =>
    render(parse(read(rel)).ast, data, []).text;

  it('saas-churn.mlt: high-risk paid account → retention branch', () => {
    const text = renders('saas-churn/saas-churn.mlt', {
      user: { churn_risk: 'high', plan: 'pro', last_active_days: 31, csm_name: null, mrr: 450 },
    });
    expect(text).toContain('Retention mode.');
    expect(text).toContain('a call with our team');
    expect(text).toContain('up to 20% for 3 months');
    expect(text).not.toContain('{{');
  });

  it('ecommerce-returns.mlt: loyal signals → instant-refund branch', () => {
    const text = renders('ecommerce-returns/ecommerce-returns.mlt', {
      user: { fraud_score: 0.1, has_active_dispute: false, orders_count: 8, return_rate: 0.1 },
    });
    expect(text).toContain('Loyal customer.');
    expect(text).not.toContain('{{');
  });

  it('role-scoping.mlt: analyst role + datasets', () => {
    const text = renders('role-scoping/role-scoping.mlt', {
      org: { name: 'Acme Analytics' },
      user: { name: 'Sam', role: 'analyst', datasets: ['orders', 'sessions'] },
    });
    expect(text).toContain('User: Sam · Role: analyst · Workspace: Acme Analytics');
    expect(text).toContain('Scope: queries, reports, and dashboards.');
    expect(text).toContain('orders, sessions');
    expect(text).not.toContain('{{');
  });

  it('support-triage.mlt: all three blocks fire', () => {
    const text = renders('support-triage/support-triage.mlt', {
      user: { priority: ['urgent'], category: 'technical', chat_status: ['open', 'waiting_reply'] },
    });
    expect(text).toContain('Acknowledge the urgency');
    expect(text).toContain('Technical topic');
    expect(text).toContain('waiting for a reply');
    expect(text).not.toContain('{{');
  });

  it('appointment-reminder.mlt: booking exists + prep + out-of-hours', () => {
    const text = renders('appointment-reminder/appointment-reminder.mlt', {
      booking: { provider: 'Dr. Lee', needs_prep: true },
      ctx: { is_business_hours: false },
      org: { business_hours: 'Mon–Fri 9–5' },
    });
    expect(text).toContain('appointment with Dr. Lee');
    expect(text).toContain('intake form');
    expect(text).toContain('Mon–Fri 9–5');
    expect(text).not.toContain('{{');
  });
});
