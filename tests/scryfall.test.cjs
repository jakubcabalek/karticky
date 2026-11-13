const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, plain } = require('./load.cjs');

const scryfall = load('scryfall.ts', { globals: { setTimeout, Date } });
const response = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('a double-faced card takes its image and type from the front face; prices become numbers', () => {
  const card = plain(scryfall.parseCard({
    id: 'id1', oracle_id: 'o1', name: 'Delver of Secrets // Insectile Aberration', set: 'isd', set_name: 'Innistrad',
    collector_number: '51', lang: 'en', rarity: 'common',
    card_faces: [{ type_line: 'Creature — Human Wizard', mana_cost: '{U}', image_uris: { small: 's.jpg', normal: 'n.jpg' } }, {}],
    prices: { eur: '0.25', eur_foil: null, usd: '0.31', usd_foil: 'not a number' },
    purchase_uris: { cardmarket: 'https://www.cardmarket.com/x' },
  }));
  assert.equal(card.imageNormal, 'n.jpg');
  assert.equal(card.typeLine, 'Creature — Human Wizard');
  assert.deepEqual(card.prices, { eur: 0.25, usd: 0.31 });
  assert.equal(card.cardmarketUrl, 'https://www.cardmarket.com/x');
});

test('search asks for every printing, treats 404 as nothing found and reports other failures', async () => {
  let asked;
  const found = await scryfall.searchCards(' lightning bolt ', async url => { asked = url; return response(200, { data: [{ id: '1', name: 'Lightning Bolt' }] }); });
  assert.match(asked, /\/cards\/search\?q=lightning%20bolt&unique=prints/);
  assert.equal(found[0].name, 'Lightning Bolt');
  assert.deepEqual(plain(await scryfall.searchCards('zzzz', async () => response(404, {}))), []);
  assert.deepEqual(plain(await scryfall.searchCards('   ', () => assert.fail('Empty search must not call Scryfall'))), []);
  await assert.rejects(scryfall.searchCards('x', async () => response(500, {})), /500/);
});

test('an exact printing is found by set, collector number and language', async () => {
  let asked;
  await scryfall.cardBySetNumber('MH3', '123', 'EN', async url => { asked = url; return response(200, { id: 'x', name: 'X' }); });
  assert.equal(asked, 'https://api.scryfall.com/cards/mh3/123/en');
  assert.equal(await scryfall.cardBySetNumber('mh3', '9999', '', async () => response(404, {})), null);
});

test('the collector line at the bottom of a card gives set, number and language', () => {
  assert.deepEqual(plain(scryfall.parseCollectorLine('Illus. Someone\n0123 R\nMH3 • EN')), { set: 'mh3', number: '123', lang: 'en' });
  assert.deepEqual(plain(scryfall.parseCollectorLine('045/274 U\nwoe · de')), { set: 'woe', number: '45', lang: 'de' });
  assert.equal(scryfall.parseCollectorLine('Lightning Bolt\nInstant'), null);
});

test('Japanese, Chinese and Korean cards print their language as JP, CS/CT and KO', () => {
  assert.deepEqual(plain(scryfall.parseCollectorLine('0281 M\nWAR • JP')), { set: 'war', number: '281', lang: 'ja' });
  assert.equal(scryfall.parseCollectorLine('012 C\nNEO • CS').lang, 'zhs');
  assert.equal(scryfall.parseCollectorLine('012 C\nNEO • CT').lang, 'zht');
  assert.equal(scryfall.parseCollectorLine('012 C\nNEO • KO').lang, 'ko');
});

test('all printings follow every result page and ask for every language', async () => {
  const asked = [];
  const pages = [
    { data: [{ id: 'a', name: 'X', lang: 'en' }], has_more: true, next_page: 'https://api.scryfall.com/next' },
    { data: [{ id: 'b', name: 'X', lang: 'ja', illustration_id: 'ill' }], has_more: false },
  ];
  const printings = await scryfall.allPrintings('oracle-1', async url => { asked.push(url); return response(200, pages[asked.length - 1]); });
  assert.match(decodeURIComponent(asked[0]), /oracleid:oracle-1 lang:any/);
  assert.deepEqual(plain(printings).map(p => [p.id, p.lang, p.illustrationId ?? null]), [['a', 'en', null], ['b', 'ja', 'ill']]);
});
