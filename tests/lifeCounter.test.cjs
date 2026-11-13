const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, plain } = require('./load.cjs');

const life = load('lifeCounter.ts');
const t0 = '2026-11-13T12:00:00.000Z';
const at = ms => new Date(Date.parse(t0) + ms).toISOString();

test('a new game has the chosen players and life; 40 life means Commander by default', () => {
  const game = life.newGame(4, 40, { names: ['Kuba', '', 'Eva'], now: t0 });
  assert.deepEqual(plain(game.players).map(p => [p.name, p.life]), [['Kuba', 40], ['Hráč 2', 40], ['Eva', 40], ['Hráč 4', 40]]);
  assert.equal(game.commander, true);
  assert.equal(life.newGame(2, 20).commander, false);
  assert.equal(life.newGame(9, 20).players.length, 6);
  assert.equal(life.newGame(0, -5).players[0].life, 1);
});

test('life goes below zero and the player is out; undo takes it back', () => {
  let game = life.newGame(2, 20, { now: t0 });
  game = life.changeLife(game, 'p1', -15, at(0));
  game = life.changeLife(game, 'p1', -7, at(100));
  assert.equal(game.players[0].life, -2);
  assert.deepEqual(plain(life.defeat(game, game.players[0])), { out: true, reason: 'Došly životy' });
  assert.equal(life.winner(game).id, 'p2');
  game = life.undo(game);
  assert.equal(game.players[0].life, 5);
  assert.equal(life.winner(game), null);
  assert.equal(game.history.length, 1);
});

test('ten poison counters lose the game, counters never go below zero', () => {
  let game = life.newGame(2, 20);
  game = life.changeCounter(game, 'p2', 'poison', 9);
  assert.equal(life.defeat(game, game.players[1]).out, false);
  game = life.changeCounter(game, 'p2', 'poison', 1);
  assert.match(life.defeat(game, game.players[1]).reason, /10 jedů/);
  game = life.changeCounter(game, 'p1', 'energy', -3);
  assert.equal(game.players[0].counters.energy, 0);
  assert.equal(game.history[0].playerId, 'p2', 'a change that did nothing is not in history');
});

test('commander damage counts per commander, also takes life, and 21 from one commander loses', () => {
  let game = life.newGame(4, 40, { names: ['A', 'B', 'C', 'D'] });
  game = life.changeCommanderDamage(game, 'p1', 'p2', 12);
  game = life.changeCommanderDamage(game, 'p1', 'p3', 12);
  assert.equal(game.players[0].life, 16);
  assert.equal(life.defeat(game, game.players[0]).out, false, '24 in total from two commanders is not enough');
  game = life.changeCommanderDamage(game, 'p1', 'p2', 9);
  assert.match(life.defeat(game, game.players[0]).reason, /21 commander damage od B/);
  game = life.undo(game);
  assert.equal(game.players[0].commanderDamage.p2, 12);
  assert.equal(game.players[0].life, 16);
  game = life.changeCommanderDamage(game, 'p1', 'p2', -50);
  assert.equal(game.players[0].commanderDamage.p2, 0);
  assert.equal(game.players[0].life, 28);
});

test('quick taps add up into one bubble', () => {
  let game = life.newGame(2, 20);
  game = life.changeLife(game, 'p1', -1, at(0));
  game = life.changeLife(game, 'p1', -1, at(400));
  game = life.changeLife(game, 'p2', 5, at(500));
  game = life.changeLife(game, 'p1', -1, at(900));
  assert.equal(life.recentDelta(game, 'p1', Date.parse(at(1000))), -3);
  assert.equal(life.recentDelta(game, 'p1', Date.parse(at(5000))), 0);
});

test('restart keeps names and colours, dice and coin use the random source', () => {
  let game = life.newGame(3, 30, { names: ['A', 'B', 'C'] });
  game = life.renamePlayer(game, 'p2', 'Bára', 'gold');
  game = life.changeLife(game, 'p2', -10);
  const again = life.restartGame(game);
  assert.deepEqual(plain(again.players).map(p => [p.name, p.color, p.life]), [['A', 'blue', 30], ['Bára', 'gold', 30], ['C', 'green', 30]]);
  assert.equal(again.history.length, 0);
  assert.equal(life.rollDie(20, () => 0.999), 20);
  assert.equal(life.rollDie(6, () => 0), 1);
  assert.equal(life.flipCoin(() => 0.7), 'Orel');
  assert.equal(life.pickStartingPlayer(again, () => 0.5).name, 'Bára');
});

test('a broken saved game is ignored, an old one gets missing counters', () => {
  assert.equal(life.normalizeGame(null), null);
  assert.equal(life.normalizeGame({ version: 1, players: [] }), null);
  const saved = life.normalizeGame({ version: 1, startingLife: 20, players: [{ id: 'p1', name: 'A', life: 7, counters: { poison: 2 } }] });
  assert.deepEqual(plain(saved.players[0].counters), { poison: 2, energy: 0, experience: 0, rad: 0, storm: 0 });
});
