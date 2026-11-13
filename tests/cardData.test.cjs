const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, plain } = require('./load.cjs');

const data = load('cardData.ts');
const card = (id, name, prices = {}, oracleId = `oracle-${name}`) => ({
  id, oracleId, name, set: 'mh3', setName: 'Modern Horizons 3', collectorNumber: '1', lang: 'en',
  rarity: 'rare', typeLine: 'Creature', manaCost: '{G}', prices,
});
const now = '2026-11-13T12:00:00.000Z';

test('adding the same printing and finish raises the count, foil is a separate entry', () => {
  let list = data.addCard([], card('a', 'Llanowar Elves'), { now });
  list = data.addCard(list, card('a', 'Llanowar Elves'), { quantity: 3, now });
  list = data.addCard(list, card('a', 'Llanowar Elves'), { finish: 'foil', now });
  assert.deepEqual(plain(list).map(e => [e.key, e.quantity]), [['a:nonfoil', 4], ['a:foil', 1]]);
  assert.equal(data.totalCards(list), 5);
  assert.equal(data.setQuantity(list, 'a:foil', 0).length, 1);
});

test('value uses the finish price and counts copies without a price separately', () => {
  let list = data.addCard([], card('a', 'Bolt', { eur: 1.5, eurFoil: 4 }), { quantity: 2, now });
  list = data.addCard(list, card('a', 'Bolt', { eur: 1.5, eurFoil: 4 }), { finish: 'foil', now });
  list = data.addCard(list, card('b', 'Token'), { now });
  assert.deepEqual(plain(data.listValue(list, 'eur')), { total: 7, unpriced: 1 });
  assert.deepEqual(plain(data.listValue(list, 'usd')), { total: 0, unpriced: 4 });
});

test('a deck knows what is missing across printings and fills the wishlist once', () => {
  let library = data.createDeck(data.emptyLibrary(), '  ', { id: 'd1', now });
  assert.equal(library.decks[0].name, 'Nový balíček');
  library = data.updateDeck(library, 'd1', deck => ({
    main: data.addCard(deck.main, card('bolt-m10', 'Bolt'), { quantity: 4, now }),
    sideboard: data.addCard(deck.sideboard, card('bolt-2x2', 'Bolt'), { quantity: 1, now }),
  }), now);
  library = { ...library, collection: data.addCard([], card('bolt-other', 'Bolt'), { quantity: 2, now }) };
  assert.deepEqual(plain(data.missingForDeck(library.decks[0], library.collection)).map(m => m.missing), [3]);
  library = data.wishMissingCards(library, 'd1', now);
  library = data.wishMissingCards(library, 'd1', now);
  assert.equal(data.totalCards(library.wishlist), 3);
  library = data.markWishAcquired(library, library.wishlist[0].key, now);
  assert.equal(library.wishlist.length, 0);
  assert.equal(data.missingForDeck(library.decks[0], library.collection).length, 0);
});

test('malformed saved data loads as a safe, empty-ish library', () => {
  assert.deepEqual(plain(data.normalizeLibrary(null)), plain(data.emptyLibrary()));
  const loaded = data.normalizeLibrary({
    collection: [{ key: 'x', quantity: 1, finish: 'nonfoil', card: { id: 'x', name: 'X' } }, { key: 'bad', quantity: -1 }, 'nonsense'],
    decks: [{ id: 'd', main: 'nope' }, { name: 'no id' }],
  });
  assert.equal(loaded.collection.length, 1);
  assert.equal(loaded.wishlist.length, 0);
  assert.deepEqual(plain(loaded.decks).map(d => [d.id, d.name, d.main.length]), [['d', 'Balíček', 0]]);
});

test('deletions are remembered and survive a merge with another device', () => {
  let phone = data.addCard([], card('a', 'Bolt'), { now: '2026-11-01T00:00:00.000Z' });
  phone = data.addCard(phone, card('b', 'Elves'), { now: '2026-11-01T00:00:00.000Z' });
  const before = { ...data.emptyLibrary(), collection: phone };
  const after = data.recordDeletions(before, { ...before, collection: data.setQuantity(phone, 'a:nonfoil', 0) }, '2026-11-02T00:00:00.000Z');
  assert.equal(after.deleted['c:a:nonfoil'], '2026-11-02T00:00:00.000Z');

  // The computer still has Bolt, plus a new Wishlist card; the phone deleted Bolt.
  const computer = { ...before, wishlist: data.addCard([], card('c', 'Sol Ring'), { now: '2026-11-03T00:00:00.000Z' }) };
  const merged = data.mergeLibraries(after, computer);
  assert.deepEqual(plain(merged.collection).map(e => e.key), ['b:nonfoil']);
  assert.deepEqual(plain(merged.wishlist).map(e => e.key), ['c:nonfoil']);

  // Added again after deleting: it stays.
  const readded = { ...after, collection: data.addCard(after.collection, card('a', 'Bolt'), { now: '2026-11-04T00:00:00.000Z' }) };
  assert.equal(data.mergeLibraries(readded, computer).collection.length, 2);
});

test('merging decks keeps the newer version and drops deleted decks', () => {
  const now = '2026-11-01T00:00:00.000Z';
  const base = data.createDeck(data.createDeck(data.emptyLibrary(), 'Elfové', { id: 'd1', now }), 'Goblini', { id: 'd2', now });
  const renamed = data.updateDeck(base, 'd1', () => ({ name: 'Elfové 2' }), '2026-11-05T00:00:00.000Z');
  const deletedGoblins = data.recordDeletions(base, data.deleteDeck(base, 'd2'), '2026-11-06T00:00:00.000Z');
  const merged = data.mergeLibraries(deletedGoblins, renamed);
  assert.deepEqual(plain(merged.decks).map(d => d.name), ['Elfové 2']);
  assert.equal(data.sameLibrary(merged, data.mergeLibraries(merged, merged)), true);
});
