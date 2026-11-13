// Life counter for a game at the table: 1–6 players, any starting life, poison
// (infect/toxic), commander damage and other counters. Pure logic, tested with node --test.

export type PlayerColor = 'white' | 'blue' | 'black' | 'red' | 'green' | 'gold';
export const PLAYER_COLORS: PlayerColor[] = ['blue', 'red', 'green', 'black', 'white', 'gold'];

export type CounterKind = 'poison' | 'energy' | 'experience' | 'rad' | 'storm';
export const COUNTERS: { kind: CounterKind; label: string; hint: string }[] = [
  { kind: 'poison', label: 'Jed', hint: 'Infect a toxic. 10 jedů = prohra.' },
  { kind: 'energy', label: 'Energie', hint: 'Platíš jí schopnosti s {E}.' },
  { kind: 'experience', label: 'Zkušenosti', hint: 'Experience counters, posilují některé velitele.' },
  { kind: 'rad', label: 'Radiace', hint: 'Rad counters (Fallout): na začátku tahu mleješ a za každou nezemi ztratíš život.' },
  { kind: 'storm', label: 'Storm', hint: 'Počet kouzel zahraných v tomto kole.' },
];

export type Player = {
  id: string;
  name: string;
  color: PlayerColor;
  life: number;
  counters: Record<CounterKind, number>;
  /** Commander damage received, by the id of the player whose commander dealt it. */
  commanderDamage: Record<string, number>;
  /** Manually knocked out (conceded) or back in. */
  conceded: boolean;
};

export type Game = {
  version: 1;
  startingLife: number;
  commander: boolean;
  players: Player[];
  startedAt: string;
  /** Recent changes, newest first, so a mistake can be seen and undone. */
  history: { playerId: string; what: 'life' | CounterKind | 'commander'; from?: string; delta: number; at: string }[];
};

export const LIFE_PRESETS = [20, 25, 30, 40];
export const POISON_TO_LOSE = 10;
export const COMMANDER_DAMAGE_TO_LOSE = 21;
const HISTORY_LENGTH = 50;

const emptyCounters = (): Record<CounterKind, number> => ({ poison: 0, energy: 0, experience: 0, rad: 0, storm: 0 });

/** A new game. Commander is the usual choice with 40 life, but both can be set freely. */
export const newGame = (
  playerCount: number,
  startingLife: number,
  { commander = startingLife >= 40, names = [], now = new Date().toISOString() }: { commander?: boolean; names?: string[]; now?: string } = {},
): Game => {
  const count = Math.min(6, Math.max(1, Math.floor(playerCount)));
  const life = Math.min(999, Math.max(1, Math.floor(startingLife)));
  return {
    version: 1,
    startingLife: life,
    commander,
    startedAt: now,
    history: [],
    players: Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: names[i]?.trim() || `Hráč ${i + 1}`,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      life,
      counters: emptyCounters(),
      commanderDamage: {},
      conceded: false,
    })),
  };
};

/** Same players, names and colours, everything else back to the start. */
export const restartGame = (game: Game, now = new Date().toISOString()): Game => ({
  ...newGame(game.players.length, game.startingLife, { commander: game.commander, names: game.players.map(p => p.name), now }),
  players: game.players.map(player => ({ ...player, life: game.startingLife, counters: emptyCounters(), commanderDamage: {}, conceded: false })),
});

const withPlayer = (game: Game, playerId: string, change: (player: Player) => Player, entry: Game['history'][number] | null): Game => ({
  ...game,
  players: game.players.map(player => player.id === playerId ? change(player) : player),
  history: entry && entry.delta !== 0 ? [entry, ...game.history].slice(0, HISTORY_LENGTH) : game.history,
});

export const changeLife = (game: Game, playerId: string, delta: number, at = new Date().toISOString()): Game =>
  withPlayer(game, playerId, player => ({ ...player, life: player.life + delta }), { playerId, what: 'life', delta, at });

export const changeCounter = (game: Game, playerId: string, kind: CounterKind, delta: number, at = new Date().toISOString()): Game => {
  const player = game.players.find(p => p.id === playerId);
  if (!player) return game;
  const next = Math.max(0, player.counters[kind] + delta);
  const applied = next - player.counters[kind];
  return withPlayer(game, playerId, p => ({ ...p, counters: { ...p.counters, [kind]: next } }), { playerId, what: kind, delta: applied, at });
};

/**
 * Commander damage is combat damage: it is counted per opposing commander and also
 * taken off life (as every life counter app does), so one tap does both.
 */
export const changeCommanderDamage = (game: Game, playerId: string, fromId: string, delta: number, at = new Date().toISOString()): Game => {
  const player = game.players.find(p => p.id === playerId);
  if (!player || !game.players.some(p => p.id === fromId)) return game;
  const current = player.commanderDamage[fromId] ?? 0;
  const next = Math.max(0, current + delta);
  const applied = next - current;
  return withPlayer(game, playerId, p => ({
    ...p,
    life: p.life - applied,
    commanderDamage: { ...p.commanderDamage, [fromId]: next },
  }), { playerId, what: 'commander', from: fromId, delta: applied, at });
};

export const setConceded = (game: Game, playerId: string, conceded: boolean): Game =>
  withPlayer(game, playerId, player => ({ ...player, conceded }), null);

export const renamePlayer = (game: Game, playerId: string, name: string, color?: PlayerColor): Game =>
  withPlayer(game, playerId, player => ({ ...player, name: name.trim() || player.name, color: color ?? player.color }), null);

/** Takes back the newest change. */
export const undo = (game: Game): Game => {
  const [last, ...rest] = game.history;
  if (!last) return game;
  let reverted: Game;
  if (last.what === 'life') reverted = changeLife(game, last.playerId, -last.delta);
  else if (last.what === 'commander' && last.from) reverted = changeCommanderDamage(game, last.playerId, last.from, -last.delta);
  else if (last.what !== 'commander') reverted = changeCounter(game, last.playerId, last.what, -last.delta);
  else reverted = game;
  return { ...reverted, history: rest };
};

export type Defeat = { out: boolean; reason?: string };

/** Why a player has lost: life, poison, 21 commander damage from one commander, or conceding. */
export const defeat = (game: Game, player: Player): Defeat => {
  if (player.conceded) return { out: true, reason: 'Vzdal se' };
  if (player.life <= 0) return { out: true, reason: 'Došly životy' };
  if (player.counters.poison >= POISON_TO_LOSE) return { out: true, reason: `${POISON_TO_LOSE} jedů` };
  if (game.commander) {
    for (const [fromId, damage] of Object.entries(player.commanderDamage)) {
      if (damage >= COMMANDER_DAMAGE_TO_LOSE) {
        const from = game.players.find(p => p.id === fromId);
        return { out: true, reason: `${COMMANDER_DAMAGE_TO_LOSE} commander damage od ${from?.name ?? 'soupeře'}` };
      }
    }
  }
  return { out: false };
};

/** The only player left standing, if any. */
export const winner = (game: Game): Player | null => {
  if (game.players.length < 2) return null;
  const standing = game.players.filter(player => !defeat(game, player).out);
  return standing.length === 1 ? standing[0] : null;
};

/** Changes made within `windowMs` of each other add up to one bubble, e.g. "−3". */
export const recentDelta = (game: Game, playerId: string, now: number, windowMs = 1500): number => {
  let sum = 0;
  let last = now;
  for (const entry of game.history) {
    if (entry.playerId !== playerId || (entry.what !== 'life' && entry.what !== 'commander')) continue;
    const at = Date.parse(entry.at);
    if (last - at > windowMs) break;
    sum += entry.what === 'commander' ? -entry.delta : entry.delta;
    last = at;
  }
  return sum;
};

// ---- Table tools ----

export const rollDie = (sides: number, random: () => number = Math.random) => 1 + Math.floor(random() * sides);
export const flipCoin = (random: () => number = Math.random): 'Panna' | 'Orel' => (random() < 0.5 ? 'Panna' : 'Orel');
export const pickStartingPlayer = (game: Game, random: () => number = Math.random) =>
  game.players[Math.floor(random() * game.players.length)];

/** Saved games from older versions or broken storage start a fresh game instead of crashing. */
export const normalizeGame = (value: unknown): Game | null => {
  if (!value || typeof value !== 'object') return null;
  const game = value as Partial<Game>;
  if (game.version !== 1 || !Array.isArray(game.players) || !game.players.length || typeof game.startingLife !== 'number') return null;
  const ok = game.players.every(p => p && typeof p.id === 'string' && typeof p.life === 'number' && p.counters && typeof p.counters === 'object');
  if (!ok) return null;
  return {
    version: 1,
    startingLife: game.startingLife,
    commander: Boolean(game.commander),
    startedAt: typeof game.startedAt === 'string' ? game.startedAt : '',
    history: Array.isArray(game.history) ? game.history.slice(0, HISTORY_LENGTH) : [],
    players: game.players.map(p => ({ ...p, counters: { ...emptyCounters(), ...p.counters }, commanderDamage: { ...(p.commanderDamage ?? {}) }, conceded: Boolean(p.conceded) })),
  };
};
