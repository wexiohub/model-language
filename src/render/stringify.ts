export interface Stringified {
  text: string;
  wasEmpty: boolean;
  wasObject: boolean;
}

/**
 * Convert a value to its interpolation string (language ref §3.4). Strings pass
 * through; numbers/booleans stringify; arrays join with ", "; `null`/`undefined`
 * become empty (`wasEmpty`); plain objects become empty (`wasObject`).
 */
export function stringifyValue(value: unknown): Stringified {
  if (value === null || value === undefined) {
    return { text: '', wasEmpty: true, wasObject: false };
  }
  if (Array.isArray(value)) {
    return { text: value.map((v) => String(v)).join(', '), wasEmpty: false, wasObject: false };
  }
  if (typeof value === 'object') {
    return { text: '', wasEmpty: true, wasObject: true };
  }
  return { text: String(value), wasEmpty: false, wasObject: false };
}
