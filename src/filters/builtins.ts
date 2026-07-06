import { compareValues } from '../render/eval';
import type { FilterDef } from '../types';

const MS_PER_DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

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

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

const currency: FilterDef = {
  name: 'currency',
  apply: (input, args) => {
    const n = asNumber(input);
    const code = asString(args[0]);
    if (n === undefined || code === undefined) return input;
    const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
    const fixed = roundHalfAway(Math.abs(n), 2).toFixed(2);
    const dot = fixed.indexOf('.');
    const grouped = fixed.slice(0, dot).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${n < 0 ? '-' : ''}${symbol}${grouped}.${fixed.slice(dot + 1)}`;
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

// Named presets → token patterns, so both the Intl (timezone) and the UTC
// fallback paths format them uniformly.
const DATE_PRESETS: Record<string, string> = {
  date: 'MM/DD/YYYY',
  time: 'HH:mm',
  datetime: 'MM/DD/YYYY HH:mm',
  long: 'MMMM D, YYYY',
  weekday: 'dddd',
  month: 'MMMM',
};

const HAS_INTL = typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function';

interface DateParts {
  y: number;
  mo: number; // 1-12
  d: number;
  h: number; // 0-23
  mi: number;
  s: number;
}

/**
 * Wall-clock parts of `ms` in `timeZone`, via Intl (host must have it). Month
 * and weekday NAMES are never taken from Intl — only the numbers — so output
 * stays deterministic (English name arrays) regardless of the host's ICU data.
 */
function partsInZone(ms: number, timeZone: string): DateParts | undefined {
  try {
    const m: Record<string, string> = {};
    for (const p of new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(ms)) {
      if (p.type !== 'literal') m[p.type] = p.value;
    }
    return {
      y: Number(m.year),
      mo: Number(m.month),
      d: Number(m.day),
      h: Number(m.hour) % 24,
      mi: Number(m.minute),
      s: Number(m.second),
    };
  } catch {
    return undefined; // bad timezone → caller falls back to UTC
  }
}

function partsUtc(ms: number): DateParts {
  const dt = new Date(ms);
  return {
    y: dt.getUTCFullYear(),
    mo: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
    h: dt.getUTCHours(),
    mi: dt.getUTCMinutes(),
    s: dt.getUTCSeconds(),
  };
}

/**
 * Format `ms` with a token pattern, in `timeZone` when given (needs host Intl;
 * falls back to UTC otherwise). Accepts BOTH moment/Day.js and Unicode casing:
 * year `YYYY`/`yyyy` `YY`/`yy` · month `MMMM MMM MM M` · day `DD`/`dd` `D`/`d` ·
 * weekday `dddd`/`EEEE` `ddd`/`EEE` · 24h `HH H` · 12h `hh h` · minute `mm m` ·
 * second `ss s` · `A`/`a` (AM/PM). Wrap literal letters in `[...]`.
 */
function formatDate(ms: number, pattern: string, timeZone?: string): string {
  const p = timeZone && HAS_INTL ? (partsInZone(ms, timeZone) ?? partsUtc(ms)) : partsUtc(ms);
  // Weekday of the (possibly tz-shifted) calendar date — tz-independent.
  const wd = new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay(); // 0=Sun
  const pad = (n: number) => String(n).padStart(2, '0');
  const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
  const ampm = p.h < 12 ? 'AM' : 'PM';
  const year4 = String(p.y);

  const map: Record<string, string> = {
    YYYY: year4,
    yyyy: year4,
    YY: year4.slice(-2),
    yy: year4.slice(-2),
    MMMM: MONTHS_LONG[p.mo - 1] as string,
    MMM: MONTHS[p.mo - 1] as string,
    MM: pad(p.mo),
    M: String(p.mo),
    dddd: WEEKDAYS_LONG[wd] as string,
    EEEE: WEEKDAYS_LONG[wd] as string,
    ddd: WEEKDAYS[wd] as string,
    EEE: WEEKDAYS[wd] as string,
    DD: pad(p.d),
    dd: pad(p.d),
    D: String(p.d),
    d: String(p.d),
    HH: pad(p.h),
    H: String(p.h),
    hh: pad(h12),
    h: String(h12),
    mm: pad(p.mi),
    m: String(p.mi),
    ss: pad(p.s),
    s: String(p.s),
    A: ampm,
    a: ampm.toLowerCase(),
  };

  const RE =
    /\[([^\]]*)\]|(YYYY|yyyy|YY|yy|MMMM|MMM|MM|M|dddd|EEEE|ddd|EEE|DD|dd|D|d|HH|H|hh|h|mm|m|ss|s|A|a)/g;
  return pattern.replace(RE, (_full, lit, tok) => (lit !== undefined ? lit : (map[tok] as string)));
}

/**
 * `date: "<preset|pattern>", "<timezone?>"`. `arg0` is a NAMED preset
 * (`date` `time` `datetime` `long` `weekday` `month` `iso`) or a token format
 * string (see {@link formatDate}). Timezone (IANA) applies when the host has
 * `Intl`; otherwise the result is UTC.
 */
const dateFilter: FilterDef = {
  name: 'date',
  apply: (input, args) => {
    const d = toDate(input);
    const spec = asString(args[0]);
    if (d === undefined || spec === undefined) return input;
    const ms = d.getTime();
    if (spec === 'iso') return new Date(ms).toISOString();
    const timeZone = asString(args[1]);
    return formatDate(ms, DATE_PRESETS[spec] ?? spec, timeZone);
  },
};

const timeAgo: FilterDef = {
  name: 'time_ago',
  apply: (input, _args, ctx) => {
    const d = toDate(input);
    if (d === undefined || ctx === undefined) return input;
    const diff = Math.round((d.getTime() - ctx.now) / 1000); // signed seconds
    const abs = Math.abs(diff);
    const units: Array<[string, number]> = [
      ['year', 31536000],
      ['month', 2592000],
      ['week', 604800],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
      ['second', 1],
    ];
    for (const [unit, sec] of units) {
      if (abs >= sec || unit === 'second') {
        const n = Math.round(diff / sec);
        if (n === 0) return 'just now';
        const label = Math.abs(n) === 1 ? unit : `${unit}s`;
        return n < 0 ? `${-n} ${label} ago` : `in ${n} ${label}`;
      }
    }
    return input;
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
  currency,
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
  timeAgo,
  daysAgo,
  daysUntil,
  isPast,
  isFuture,
];
