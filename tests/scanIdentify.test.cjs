const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, plain } = require('./load.cjs');

const globals = { Uint32Array, Uint8Array, Float64Array, DataView, ArrayBuffer };
const hash = load('cardHash.ts', { globals });
const scryfall = load('scryfall.ts', { globals: { setTimeout, Date } });
const scan = load('scanIdentify.ts', { dependencies: { './cardHash': hash, './scryfall': scryfall }, globals });

const printing = (id, lang, extra = {}) => ({ id, lang, name: 'Liliana', oracleId: 'oracle', illustrationId: 'art-1', set: 'war', collectorNumber: '97', ...extra });
const printings = [printing('en', 'en'), printing('ja', 'ja'), printing('zhs', 'zhs'), printing('alt', 'ja', { illustrationId: 'art-2', set: 'war', collectorNumber: '97★' })];

test('the script on the card suggests its language', () => {
  assert.deepEqual(plain(scan.languagesFromScript('嘆きの女王、リリアナ')), ['ja']);
  assert.deepEqual(plain(scan.languagesFromScript('비탄의 여왕 릴리아나')), ['ko']);
  assert.deepEqual(plain(scan.languagesFromScript('哀伤女王莉莲娜')), ['zhs', 'zht', 'ja']);
  assert.deepEqual(plain(scan.languagesFromScript('Лилиана')), ['ru']);
  assert.deepEqual(plain(scan.languagesFromScript('Liliana, Dreadhorde General')), []);
});

test('the printed collector line gives the exact Japanese printing and the other languages of that art', async () => {
  const result = await scan.identifyCard({ text: 'Liliana\n0097 M\nWAR • JP' }, {
    cardBySetNumber: async (set, number, lang) => printing(lang ?? 'en', lang ?? 'en', { set, collectorNumber: number }),
    allPrintings: async () => printings,
  });
  assert.equal(result.status, 'found');
  assert.equal(result.method, 'collectorLine');
  assert.equal(result.printing.lang, 'ja');
  assert.deepEqual(plain(result.languages), ['en', 'ja', 'zhs']);
  assert.ok(!result.alternatives.some(p => p.illustrationId === 'art-2'), 'a different artwork is a different card');
});

test('without the collector line the artwork finds the card and the writing picks the language', async () => {
  // A one-entry index whose hash is exactly the art region of our "photo".
  const card = { width: 40, height: 56, data: new Uint8Array(40 * 56 * 4).map((_, i) => (i * 37) % 251) };
  const queries = hash.cardHashes(card);
  const index = hash.decodeIndex(hash.encodeIndex([{ id: '11111111-1111-4111-8111-111111111111', face: 0, hash: queries.slice(0, hash.HASH_WORDS) }]));
  const result = await scan.identifyCard({ image: card, text: '嘆きの女王、リリアナ' }, {
    index,
    cardById: async () => printing('en', 'en'),
    allPrintings: async () => printings,
  });
  assert.equal(result.method, 'artwork');
  assert.equal(result.status, 'found');
  assert.equal(result.printing.id, 'ja');

  const korean = await scan.identifyCard({ image: card, text: '' }, { index, preferredLanguage: 'zhs', cardById: async () => printing('en', 'en'), allPrintings: async () => printings });
  assert.equal(korean.printing.id, 'zhs', 'the usual language is used when the card shows nothing readable');
});

test('nothing readable and no index means not found, without asking Scryfall', async () => {
  const result = await scan.identifyCard({ text: 'blurry' }, { cardById: () => assert.fail(), allPrintings: () => assert.fail() });
  assert.equal(result.status, 'notFound');
});
