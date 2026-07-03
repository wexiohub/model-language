import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      // Non-negotiable: 100% across the board. The engine is small, pure, and
      // critical — every line, branch, function, and statement is exercised by
      // a test. A gap fails CI. See CLAUDE.md "Testing discipline".
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
