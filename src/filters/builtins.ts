import { compareValues } from '../render/eval';
import type { FilterDef } from '../types';

const MS_PER_DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const asNumber = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const asArray = (v: unknown): unknown[] | undefined => (Array.isArray(v) ? v : undefined);

/** A field of an object item, or the item itself when it isn't an object. */
const pick = (item: unknown, field: string): unknown =>
  item && typeof item === 'object' ? (item as Record<string, unknown>)[field] : item;

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

const where: FilterDef = {
  name: 'where',
  apply: (input, args) => {
    const a = asArray(input);
    const field = asString(args[0]);
    const op = asString(args[1]);
    if (a === undefined || field === undefined || op === undefined) return input;
    return a.filter((item) => compareValues(op, pick(item, field), args[2]));
  },
};

const sort: FilterDef = {
  name: 'sort',
  apply: (input, args) => {
    const a = asArray(input);
    const field = asString(args[0]);
    if (a === undefined || field === undefined) return input;
    const dir = asString(args[1]) === 'desc' ? -1 : 1;
    return [...a].sort((x, y) => {
      const xv = pick(x, field);
      const yv = pick(y, field);
      if (xv === yv) return 0;
      return ((xv as number) < (yv as number) ? -1 : 1) * dir;
    });
  },
};

const sum: FilterDef = {
  name: 'sum',
  apply: (input, args) => {
    const a = asArray(input);
    if (a === undefined) return input;
    const field = asString(args[0]);
    return a.reduce((acc: number, item) => {
      const v = field === undefined ? item : pick(item, field);
      return acc + (typeof v === 'number' ? v : 0);
    }, 0);
  },
};

function aggregate(input: unknown, args: unknown[], fn: (...n: number[]) => number): unknown {
  const a = asArray(input);
  if (a === undefined) return input;
  const field = asString(args[0]);
  const nums = a
    .map((item) => (field === undefined ? item : pick(item, field)))
    .filter((v): v is number => typeof v === 'number');
  return nums.length === 0 ? undefined : fn(...nums);
}

const max: FilterDef = { name: 'max', apply: (input, args) => aggregate(input, args, Math.max) };
const min: FilterDef = { name: 'min', apply: (input, args) => aggregate(input, args, Math.min) };

// ── Datetime ─────────────────────────────────────────────────────────────────
function toDate(v: unknown): Date | undefined {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function formatDate(d: Date, fmt: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return fmt.replace(/YYYY|MMM|MM|DD|D|M/g, (tok) => {
    switch (tok) {
      case 'YYYY':
        return String(d.getUTCFullYear());
      case 'MMM':
        return MONTHS[d.getUTCMonth()] as string;
      case 'MM':
        return pad(d.getUTCMonth() + 1);
      case 'DD':
        return pad(d.getUTCDate());
      case 'D':
        return String(d.getUTCDate());
      default:
        return String(d.getUTCMonth() + 1); // 'M'
    }
  });
}

const dateFilter: FilterDef = {
  name: 'date',
  apply: (input, args) => {
    const d = toDate(input);
    const fmt = asString(args[0]);
    return d === undefined || fmt === undefined ? input : formatDate(d, fmt);
  },
};

const daysAgo: FilterDef = {
  name: 'days_ago',
  apply: (input, _args, ctx) => {
    const d = toDate(input);
    return d === undefined || ctx === undefined
      ? input
      : Math.floor((ctx.now - d.getTime()) / MS_PER_DAY);
  },
};

const daysUntil: FilterDef = {
  name: 'days_until',
  apply: (input, _args, ctx) => {
    const d = toDate(input);
    return d === undefined || ctx === undefined
      ? input
      : Math.floor((d.getTime() - ctx.now) / MS_PER_DAY);
  },
};

const isPast: FilterDef = {
  name: 'is_past',
  apply: (input, _args, ctx) => {
    const d = toDate(input);
    return d === undefined || ctx === undefined ? input : d.getTime() < ctx.now;
  },
};

const isFuture: FilterDef = {
  name: 'is_future',
  apply: (input, _args, ctx) => {
    const d = toDate(input);
    return d === undefined || ctx === undefined ? input : d.getTime() > ctx.now;
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
  where,
  sort,
  sum,
  max,
  min,
  dateFilter,
  daysAgo,
  daysUntil,
  isPast,
  isFuture,
];
