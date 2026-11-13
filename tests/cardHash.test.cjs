const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load.cjs');

const hash = load('cardHash.ts', { globals: { Uint32Array, Uint8Array, Float64Array, DataView, ArrayBuffer } });

// Deterministic "paintings": smooth blobs of colour, different for every seed.
const random = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const painting = (seed, width = 300, height = 220) => {
  const rnd = random(seed);
  const blobs = Array.from({ length: 9 }, () => ({ x: rnd() * width, y: rnd() * height, r: 20 + rnd() * 70, c: [rnd() * 255, rnd() * 255, rnd() * 255] }));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let rgb = [40, 40, 40];
    for (const b of blobs) {
      const w = Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (2 * b.r * b.r));
      rgb = rgb.map((v, i) => v * (1 - w) + b.c[i] * w);
    }
    data.set([...rgb.map(Math.round), 255], (y * width + x) * 4);
  }
  return { width, height, data };
};

// A phone photo of a whole card: black border, the art in the modern frame's
// window, a bit off-centre, darker, with sensor noise. Text areas are random.
const photographCard = (art, { offsetX = 0, offsetY = 0, light = 0.8, seed = 1 } = {}) => {
  const width = 244, height = 340, rnd = random(seed);
  const data = new Uint8Array(width * height * 4);
  const win = hash.ART_WINDOWS.modern;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const fx = x / width - offsetX, fy = y / height - offsetY;
    let rgb = [20, 20, 20];
    if (fx > 0.04 && fx < 0.96 && fy > 0.03 && fy < 0.97) rgb = [200 * rnd(), 190, 170];
    if (fx >= win.x && fx < win.x + win.w && fy >= win.y && fy < win.y + win.h) {
      const ax = Math.min(art.width - 1, Math.floor(((fx - win.x) / win.w) * art.width));
      const ay = Math.min(art.height - 1, Math.floor(((fy - win.y) / win.h) * art.height));
      const i = (ay * art.width + ax) * 4;
      rgb = [art.data[i], art.data[i + 1], art.data[i + 2]];
    }
    data.set([...rgb.map(v => Math.max(0, Math.min(255, v * light + (rnd() - 0.5) * 30))), 255], (y * width + x) * 4);
  }
  return { width, height, data };
};

const idFor = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('the index file keeps every hash, id and face', () => {
  const entries = [1, 2, 3].map(n => ({ id: idFor(n), face: n === 3 ? 1 : 0, hash: hash.hashRegion(painting(n), hash.INDEX_RECT) }));
  const index = hash.decodeIndex(hash.encodeIndex(entries));
  assert.equal(index.count, 3);
  assert.deepEqual([...index.ids], entries.map(e => e.id));
  assert.deepEqual([...index.faces], [0, 0, 1]);
  assert.equal(hash.hammingDistance(index.hashes, 2 * hash.HASH_WORDS, entries[2].hash, 0), 0);
  assert.throws(() => hash.decodeIndex(new Uint8Array([1, 2, 3, 4, 0, 0, 0, 0, 16, 0, 0, 0])), /není index/);
});

test('a photo of a card finds its artwork among many, with high confidence', () => {
  const arts = Array.from({ length: 150 }, (_, n) => painting(n + 10));
  const index = hash.decodeIndex(hash.encodeIndex(arts.map((art, n) => ({ id: idFor(n), face: 0, hash: hash.hashRegion(art, hash.INDEX_RECT) }))));
  for (const [n, options] of [[7, {}], [42, { offsetX: 0.012, offsetY: -0.01, light: 0.6 }], [133, { offsetX: -0.015, light: 1.1, seed: 9 }]]) {
    const matches = hash.matchIndex(index, hash.cardHashes(photographCard(arts[n], options)));
    assert.equal(matches[0].id, idFor(n), `card ${n}`);
    assert.equal(hash.matchConfidence(matches), 'high', `card ${n}: ${matches.map(m => m.distance)}`);
  }
});

test('an unknown card is not reported with confidence', () => {
  const arts = Array.from({ length: 60 }, (_, n) => painting(n + 500));
  const index = hash.decodeIndex(hash.encodeIndex(arts.map((art, n) => ({ id: idFor(n), face: 0, hash: hash.hashRegion(art, hash.INDEX_RECT) }))));
  const matches = hash.matchIndex(index, hash.cardHashes(photographCard(painting(9999))));
  assert.notEqual(hash.matchConfidence(matches), 'high');
  assert.equal(new Set(matches.map(m => m.id)).size, matches.length);
});
