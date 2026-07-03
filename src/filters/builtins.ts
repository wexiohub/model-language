import type { FilterDef } from '../types';

const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const asNumber = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const asArray = (v: unknown): unknown[] | undefined => (Array.isArray(v) ? v : undefined);

/** Round half away from zero ("school" rounding): 2.5 → 3, -2.5 → -3. */
function roundHalfAway(x: number, digits: number): number {
  const f = 10 ** digits;
  return (Math.sign(x) * Math.round(Math.abs(x) * f)) / f;
}

// ── Universal ────────────────────────────────────────────────────────────────
const defaultFilter: FilterDef = {
  name: 'default',
  apply: (input, args) => (input === null || input === undefined || input === '' ? args[0] : input),
};

// ── String ───────────────────────────────────────────────────────────────────
const upper: FilterDef = {
  name: 'upper',
  apply: (input) => {
    const s = asString(input);
    return s === undefined ? input : s.toUpperCase();
  },
};

const lower: FilterDef = {
  name: 'lower',
  apply: (input) => {
    const s = asString(input);
    return s === undefined ? input : s.toLowerCase();
  },
};

const trim: FilterDef = {
  name: 'trim',
  apply: (input) => {
    const s = asString(input);
    return s === undefined ? input : s.trim();
  },
};

const capitalize: FilterDef = {
  name: 'capitalize',
  apply: (input) => {
    const s = asString(input);
    return s === undefined ? input : s.charAt(0).toUpperCase() + s.slice(1);
  },
};

const truncate: FilterDef = {
  name: 'truncate',
  apply: (input, args) => {
    const s = asString(input);
    const n = asNumber(args[0]);
    if (s === undefined || n === undefined) return input;
    return s.length > n ? `${s.slice(0, n)}…` : s;
  },
};

const replace: FilterDef = {
  name: 'replace',
  apply: (input, args) => {
    const s = asString(input);
    const from = asString(args[0]);
    const to = asString(args[1]);
    if (s === undefined || from === undefined || to === undefined) return input;
    return s.split(from).join(to);
  },
};

// ── Number ───────────────────────────────────────────────────────────────────
const round: FilterDef = {
  name: 'round',
  apply: (input, args) => {
    const n = asNumber(input);
    return n === undefined ? input : roundHalfAway(n, asNumber(args[0]) ?? 0);
  },
};

const floor: FilterDef = {
  name: 'floor',
  apply: (input) => {
    const n = asNumber(input);
    return n === undefined ? input : Math.floor(n);
  },
};

const ceil: FilterDef = {
  name: 'ceil',
  apply: (input) => {
    const n = asNumber(input);
    return n === undefined ? input : Math.ceil(n);
  },
};

const abs: FilterDef = {
  name: 'abs',
  apply: (input) => {
    const n = asNumber(input);
    return n === undefined ? input : Math.abs(n);
  },
};

const percent: FilterDef = {
  name: 'percent',
  apply: (input) => {
    const n = asNumber(input);
    return n === undefined ? input : `${roundHalfAway(n * 100, 0)}%`;
  },
};

// ── Array ────────────────────────────────────────────────────────────────────
const count: FilterDef = {
  name: 'count',
  apply: (input) => {
    const a = asArray(input);
    return a === undefined ? input : a.length;
  },
};

const join: FilterDef = {
  name: 'join',
  apply: (input, args) => {
    const a = asArray(input);
    const sep = asString(args[0]) ?? ', ';
    return a === undefined ? input : a.map((x) => String(x)).join(sep);
  },
};

const first: FilterDef = {
  name: 'first',
  apply: (input) => {
    const a = asArray(input);
    return a === undefined ? input : a[0];
  },
};

const last: FilterDef = {
  name: 'last',
  apply: (input) => {
    const a = asArray(input);
    return a === undefined ? input : a[a.length - 1];
  },
};

const limit: FilterDef = {
  name: 'limit',
  apply: (input, args) => {
    const a = asArray(input);
    const n = asNumber(args[0]);
    return a === undefined || n === undefined ? input : a.slice(0, n);
  },
};

const pluck: FilterDef = {
  name: 'pluck',
  apply: (input, args) => {
    const a = asArray(input);
    const field = asString(args[0]);
    if (a === undefined || field === undefined) return input;
    return a.map((item) =>
      item && typeof item === 'object' ? (item as Record<string, unknown>)[field] : undefined,
    );
  },
};

/** Built-in filters seeded into the registry. Datetime + currency: next slice. */
export const BUILTIN_FILTERS: FilterDef[] = [
  defaultFilter,
  upper,
  lower,
  trim,
  capitalize,
  truncate,
  replace,
  round,
  floor,
  ceil,
  abs,
  percent,
  count,
  join,
  first,
  last,
  limit,
  pluck,
];
