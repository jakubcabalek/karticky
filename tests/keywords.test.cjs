const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, plain } = require('./load.cjs');

const { explainCard } = load('keywords.ts');
const terms = card => plain(explainCard(card)).map(e => e.term);

test('keywords are explained in the order they appear on the card', () => {
  const serra = { keywords: ['Flying', 'Vigilance'], oracleText: 'Flying, vigilance' };
  assert.deepEqual(terms(serra), ['Flying', 'Vigilance']);
  assert.match(explainCard(serra)[0].text, /flying nebo reach/);
});

test('abilities granted in the rules text and common terms are explained too', () => {
  const card = { keywords: [], oracleText: 'Sacrifice a creature: Target creature gains flying until end of turn. Create a Treasure token.' };
  assert.deepEqual(terms(card), ['Sacrifice', 'Flying', 'Treasure', 'Token']);
});

test('parametrised keywords and landwalk variants find their entry, unrelated words do not match', () => {
  assert.deepEqual(terms({ keywords: ['Ward'], oracleText: 'Ward {2}' }), ['Ward']);
  assert.deepEqual(terms({ keywords: ['Islandwalk'], oracleText: 'Islandwalk' }), ['Landwalk']);
  assert.deepEqual(terms({ keywords: ['Protection'], oracleText: 'Protection from red' }), ['Protection']);
  assert.deepEqual(terms({ oracleText: 'Draw two cards. Bloodthirsty creatures are fun.' }), []);
  assert.deepEqual(terms({}), []);
});

test('Japanese cards are explained from the English Oracle text Scryfall gives every printing', () => {
  assert.deepEqual(terms({ keywords: ['Deathtouch', 'Lifelink'], oracleText: 'Deathtouch, lifelink' }), ['Deathtouch', 'Lifelink']);
});
