const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, plain } = require('./load.cjs');

const data = load('cardData.ts');
const stats = load('deckStats.ts', { dependencies: { './cardData': data } });

let n = 0;
const card = (name, typeLine, extra = {}) => ({ id: `id-${n += 1}`, name, typeLine, set: 's', collectorNumber: '1', prices: {}, legalities: { commander: 'legal', modern: 'legal' }, ...extra });
const entry = (c, quantity = 1) => ({ key: `${c.id}:nonfoil`, card: c, quantity, finish: 'nonfoil', addedAt: '' });
const deck = (format, parts) => ({ id: 'd', name: 'D', format, commander: [], main: [], sideboard: [], createdAt: '', updatedAt: '', ...parts });

test('curve, average, types and colours count the commander and main deck, not lands or sideboard', () => {
  const d = deck('commander', {
    commander: [entry(card('Kenrith', 'Legendary Creature — Human Noble', { cmc: 5, colors: ['W', 'U', 'B', 'R', 'G'] }))],
    main: [
      entry(card('Sol Ring', 'Artifact', { cmc: 1, colors: [] })),
      entry(card('Forest', 'Basic Land — Forest', { cmc: 0, colors: [] }), 10),
      entry(card('Craterhoof', 'Creature — Beast', { cmc: 8, colors: ['G'] })),
      entry(card('Old Card', 'Instant')),
    ],
    sideboard: [entry(card('Side', 'Sorcery', { cmc: 2 }), 3)],
  });
  const s = plain(stats.deckStats(d));
  assert.equal(s.total, 14);
  assert.deepEqual(s.curve, [0, 1, 0, 0, 0, 1, 0, 1]);
  assert.equal(s.averageManaValue, 4.67);
  assert.equal(s.unknown, 1);
  assert.deepEqual(s.types.map(t => [t.type, t.count]), [['Creature', 2], ['Instant', 1], ['Artifact', 1], ['Land', 10]]);
  assert.deepEqual(s.colors.find(c => c.color === 'G').count, 2);
  assert.equal(s.colors.find(c => c.color === 'C').count, 1);
});

test('Commander: 100 cards, singleton except basics, legendary commander, colour identity, banned cards', () => {
  const kenrithless = deck('commander', { main: [entry(card('Sol Ring', 'Artifact', { colorIdentity: [] }), 2)] });
  const problems = stats.deckProblems(kenrithless).join('\n');
  assert.match(problems, /Chybí velitel/);
  assert.match(problems, /2 karet i s velitelem/);
  assert.match(problems, /Sol Ring: 2×/);

  const lotus = card('Black Lotus', 'Artifact', { colorIdentity: [], legalities: { commander: 'banned' } });
  const ok = deck('commander', {
    commander: [entry(card('Ghave', 'Legendary Creature — Fungus', { colorIdentity: ['W', 'B', 'G'] }))],
    main: [
      entry(card('Swamp', 'Basic Land — Swamp', { colorIdentity: ['B'] }), 96),
      entry(card('Counterspell', 'Instant', { colorIdentity: ['U'] })),
      entry(card('Relentless Rats', 'Creature — Rat', { colorIdentity: ['B'], oracleText: 'A deck can have any number of cards named Relentless Rats.' }), 1),
      entry(lotus),
    ],
  });
  assert.deepEqual(plain(stats.deckProblems(ok)), ['Counterspell má barvu mimo velitele (Modrá).', 'Black Lotus je v tomto formátu zakázaná.']);
  assert.match(stats.deckProblems(deck('commander', { commander: [entry(card('Llanowar Elves', 'Creature — Elf'))] })).join(), /nemůže být velitel/);
});

test('60-card formats: at least 60, sideboard up to 15, four copies; casual has no rules', () => {
  const d = deck('modern', {
    main: [entry(card('Bolt', 'Instant'), 5), entry(card('Mountain', 'Basic Land — Mountain'), 50)],
    sideboard: [entry(card('Pyro', 'Instant'), 16)],
  });
  assert.deepEqual(plain(stats.deckProblems(d)), [
    'Hlavní balíček má 55 karet, potřebuje aspoň 60.',
    'Sideboard má 16 karet, smí mít nejvýš 15.',
    'Bolt: 5×, smí být nejvýš 4 kusy.',
    'Pyro: 16×, smí být nejvýš 4 kusy.',
  ]);
  assert.deepEqual(plain(stats.deckProblems({ ...d, format: 'casual' })), []);
});
