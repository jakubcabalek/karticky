const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load.cjs');

test('base64 decodes to the same bytes as Node, with and without padding', () => {
  const { decodeBase64 } = load('base64.ts', { globals: { Uint8Array } });
  for (const length of [0, 1, 2, 3, 4, 5, 100, 1000]) {
    const bytes = Buffer.from(Array.from({ length }, (_, i) => (i * 97 + 13) % 256));
    assert.deepEqual([...decodeBase64(bytes.toString('base64'))], [...bytes], `length ${length}`);
    assert.deepEqual([...decodeBase64(bytes.toString('base64').replace(/=+$/, ''))], [...bytes]);
  }
});
