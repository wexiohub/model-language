import { describe, expect, it } from 'vitest';
import { stringifyValue } from '../../src/render/stringify';

describe('stringifyValue', () => {
  it('passes strings through', () => {
    expect(stringifyValue('hi')).toEqual({ text: 'hi', wasEmpty: false, wasObject: false });
  });

  it('stringifies numbers and booleans', () => {
    expect(stringifyValue(500).text).toBe('500');
    expect(stringifyValue(true).text).toBe('true');
  });

  it('joins arrays with ", "', () => {
    expect(stringifyValue(['beta', 'vip']).text).toBe('beta, vip');
  });

  it('flags null and undefined as empty', () => {
    expect(stringifyValue(null)).toEqual({ text: '', wasEmpty: true, wasObject: false });
    expect(stringifyValue(undefined)).toEqual({ text: '', wasEmpty: true, wasObject: false });
  });

  it('flags a plain object as empty + object', () => {
    expect(stringifyValue({ a: 1 })).toEqual({ text: '', wasEmpty: true, wasObject: true });
  });
});
