import { readFileSync } from 'node:fs';
import { parse, render } from '../src/index';

// Render any .mlt file against a sample snapshot.
// Run with: pnpm example:run examples/welcome.mlt
const file = process.argv[2];
if (!file) {
  console.error('usage: pnpm example:run <path-to.mlt>');
  process.exit(1);
}

const source = readFileSync(file, 'utf8');
const snapshot = {
  agent: { name: 'Aria' },
  org: { name: 'Acme' },
  user: { name: null, language: null, tags: ['beta', 'vip'] },
};

console.log(`--- input ---\n${source}`);
console.log(`--- output ---\n${render(parse(source).ast, snapshot, []).text}`);
