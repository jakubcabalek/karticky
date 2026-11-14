const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load.cjs');

const globals = { Uint32Array, Uint8Array, Float64Array, DataView, ArrayBuffer };
const hash = load('cardHash.ts', { globals });
const scryfall = load('scryfall.ts', { globals: { setTimeout, Date } });
const live = load('liveScan.ts', { dependencies: { './cardHash': hash, './scryfall': scryfall }, globals });

const run = frames => {
  let state = live.initialLiveState();
  const read = [];
  for (const [key, strength, at] of frames) {
    const step = live.liveStep(state, key, strength, at);
    state = step.state;
    if (step.accept) read.push(`${key}@${at}`);
  }
  return read;
};

test('a card is read after two sure frames in a row, once, while it stays in view', () => {
  assert.deepEqual(run([['a', 'high', 0], ['a', 'high', 400], ['a', 'high', 800], ['a', 'high', 1200]]), ['a@400']);
});

test('fairly sure needs three frames; a flicker to another card restarts the count', () => {
  assert.deepEqual(run([['a', 'medium', 0], ['a', 'medium', 400], ['b', 'medium', 800], ['a', 'medium', 1200], ['a', 'medium', 1600], ['a', 'medium', 2000]]), ['a@2000']);
});

test('the next card in a stack is read right away; the same card again only after it left the camera', () => {
  assert.deepEqual(run([
    ['a', 'high', 0], ['a', 'high', 400],
    ['b', 'high', 800], ['b', 'high', 1200],
    [null, 'low', 1600], ['b', 'high', 2000], ['b', 'high', 2400],
    [null, 'low', 3000], [null, 'low', 4000], ['b', 'high', 4400], ['b', 'high', 4800],
  ]), ['a@400', 'b@1200', 'b@4800']);
});

test('a frame with the printed collector line is sure; without an index only the line counts', () => {
  assert.deepEqual({ ...live.recogniseFrame({ text: 'x\n0123 R\nMH3 • JP' }, null) }, { key: 'line:mh3:123:ja', strength: 'high' });
  assert.deepEqual({ ...live.recogniseFrame({ text: 'blurry' }, null) }, { key: null, strength: 'low' });
});
