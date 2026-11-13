const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, plain } = require('./load.cjs');

const data = load('cardData.ts');
const deckText = load('deckText.ts', { dependencies: { './cardData': data } });
const parse = (text, options) => plain(deckText.parseDecklist(text, options));

test('Moxfield/Archidekt style lines with sets, numbers, foil and sections', () => {
  const { lines, unreadable } = parse(`Commander
1 Atraxa, Praetors' Voice (2X2) 190 *F*

Deck
1x Sol Ring (CMM) 400
4 Llanowar Elves
1 Delver of Secrets // Insectile Aberration

Sideboard (2)
2 Pyroblast
Maybeboard
1 Black Lotus`);
  assert.deepEqual(lines.map(l => [l.board, l.quantity, l.name, l.set ?? null, l.number ?? null, l.finish]), [
    ['commander', 1, "Atraxa, Praetors' Voice", '2x2', '190', 'foil'],
    ['main', 1, 'Sol Ring', 'cmm', '400', 'nonfoil'],
    ['main', 4, 'Llanowar Elves', null, null, 'nonfoil'],
    ['main', 1, 'Delver of Secrets // Insectile Aberration', null, null, 'nonfoil'],
    ['sideboard', 2, 'Pyroblast', null, null, 'nonfoil'],
  ]);
  assert.deepEqual(unreadable, []);
});

test('MTG Arena: a blank line starts the sideboard, but not in Commander; SB: and Archidekt tags work', () => {
  const arena = '4 Lightning Bolt\n20 Mountain\n\n2 Smash to Smithereens';
  assert.deepEqual(parse(arena).lines.map(l => l.board), ['main', 'main', 'sideboard']);
  assert.deepEqual(parse(arena, { commander: true }).lines.map(l => l.board), ['main', 'main', 'main']);
  assert.deepEqual(parse('SB: 1 Duress\n1x Kenrith (ELD) 303 [Commander{top}]\n1 Island [Maybeboard]').lines.map(l => [l.board, l.name]), [['sideboard', 'Duress'], ['commander', 'Kenrith']]);
});

test('import looks cards up and reports what was not found; export reads back the same deck', async () => {
  const card = (id, name, set, number) => ({ id, name, set, collectorNumber: number, prices: {} });
  const lookups = [];
  const result = await deckText.importDecklist('Commander\n1 Kenrith (ELD) 303\nDeck\n2 Sol Ring\n1 Nonexistent Card\n2 Sol Ring', async ids => {
    lookups.push(ids);
    return { found: [card('k', 'Kenrith, the Returned King', 'eld', '303'), card('s', 'Sol Ring', 'c21', '263')] };
  }, { commander: true, now: '2026-11-13T00:00:00.000Z' });
  assert.equal(lookups[0].length, 3, 'the same card is asked for once');
  assert.deepEqual(plain(result.boards.main).map(e => [e.card.name, e.quantity]), [['Sol Ring', 4]]);
  assert.equal(result.boards.commander[0].card.id, 'k');
  assert.deepEqual(plain(result.missing), ['1 Nonexistent Card']);

  const deck = { id: 'd', name: 'X', format: 'commander', commander: result.boards.commander, main: result.boards.main, sideboard: [], createdAt: '', updatedAt: '' };
  const text = deckText.deckToText(deck);
  assert.equal(text, 'Commander\n1 Kenrith, the Returned King (ELD) 303\n\nDeck\n4 Sol Ring (C21) 263');
  assert.deepEqual(parse(text).lines.map(l => [l.board, l.quantity, l.set, l.number]), [['commander', 1, 'eld', '303'], ['main', 4, 'c21', '263']]);
});
