import type { FilterDef } from '../types';

const defaultFilter: FilterDef = {
  name: 'default',
  apply: (input, args) => {
    const fallback = args[0];
    return input === null || input === undefined || input === '' ? fallback : input;
  },
};

/** Built-in filters seeded into the registry. 0.2 adds string/number/date/array. */
export const BUILTIN_FILTERS: FilterDef[] = [defaultFilter];
