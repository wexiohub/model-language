import { parse, render } from '../src/index';

// A minimal input → engine → output demo. Run with: pnpm example
const source = 'Hi {{user.name | default: "there"}}! You have {{user.tags}} tags.';
const snapshot = { user: { name: null, tags: ['beta', 'vip'] } };

console.log('--- input ---');
console.log(source);
console.log('--- output ---');
console.log(render(parse(source).ast, snapshot, []).text);
