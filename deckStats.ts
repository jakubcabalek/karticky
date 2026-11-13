// Deck statistics and format rules: mana curve, card types, colours, and what makes
// the deck not legal in its format (Commander, Standard, Modern …).
import { deckEntries, type CardEntry, type Deck } from './cardData';

export const CARD_TYPES = ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Planeswalker', 'Battle', 'Land'] as const;
export const TYPE_NAMES: Record<string, string> = {
  Creature: 'Tvorové', Instant: 'Instanty', Sorcery: 'Sorcery', Artifact: 'Artefakty',
  Enchantment: 'Očarování', Planeswalker: 'Planeswalkeři', Battle: 'Bitvy', Land: 'Země',
};
export const COLOR_NAMES: Record<string, string> = { W: 'Bílá', U: 'Modrá', B: 'Černá', R: 'Červená', G: 'Zelená', C: 'Bezbarvá' };

const count = (entries: CardEntry[]) => entries.reduce((sum, entry) => sum + entry.quantity, 0);
const frontType = (entry: CardEntry) => entry.card.typeLine.split(' // ')[0];
const isLand = (entry: CardEntry) => /\bLand\b/.test(frontType(entry));

export type DeckStats = {
  total: number;
  /** Non-land cards by mana value 0–7 (7 = seven or more). */
  curve: number[];
  averageManaValue: number | null;
  types: { type: string; count: number }[];
  colors: { color: string; count: number }[];
  /** Cards saved before Kartičky kept mana value and legality; refresh card data to count them. */
  unknown: number;
};

/** Stats of the main deck plus commander (the cards you play with, not the sideboard). */
export const deckStats = (deck: Deck): DeckStats => {
  const played = [...deck.commander, ...deck.main];
  const curve = Array.from({ length: 8 }, () => 0);
  let manaSum = 0;
  let spells = 0;
  let unknown = 0;
  for (const entry of played) {
    if (isLand(entry)) continue;
    if (entry.card.cmc === undefined) { unknown += entry.quantity; continue; }
    curve[Math.min(7, Math.floor(entry.card.cmc))] += entry.quantity;
    manaSum += entry.card.cmc * entry.quantity;
    spells += entry.quantity;
  }
  const types = CARD_TYPES
    .map(type => ({ type, count: count(played.filter(entry => new RegExp(`\\b${type}\\b`).test(frontType(entry)))) }))
    .filter(item => item.count > 0);
  const colorCounts = new Map<string, number>();
  for (const entry of played) {
    if (isLand(entry) || !entry.card.colors) continue;
    const colors = entry.card.colors.length ? entry.card.colors : ['C'];
    for (const color of colors) colorCounts.set(color, (colorCounts.get(color) ?? 0) + entry.quantity);
  }
  return {
    total: count(played),
    curve,
    averageManaValue: spells ? Math.round((manaSum / spells) * 100) / 100 : null,
    types,
    colors: ['W', 'U', 'B', 'R', 'G', 'C'].filter(c => colorCounts.has(c)).map(color => ({ color, count: colorCounts.get(color) ?? 0 })),
    unknown,
  };
};

// Basic lands and cards that say so may be in a deck in any number.
const anyNumberAllowed = (entry: CardEntry) =>
  /^Basic\b/.test(frontType(entry)) || /A deck can have any number of cards named/i.test(entry.card.oracleText ?? '')
  || /A deck can have up to (?:seven|nine)/i.test(entry.card.oracleText ?? '');

const byName = (entries: CardEntry[]) => {
  const names = new Map<string, { entry: CardEntry; quantity: number }>();
  for (const entry of entries) {
    const current = names.get(entry.card.name);
    names.set(entry.card.name, { entry, quantity: (current?.quantity ?? 0) + entry.quantity });
  }
  return [...names.values()];
};

/** Problems that make the deck not legal in its format, in Czech; empty = all fine. */
export const deckProblems = (deck: Deck): string[] => {
  if (deck.format === 'casual') return [];
  const problems: string[] = [];
  const mainCount = count(deck.main);
  const sideCount = count(deck.sideboard);

  if (deck.format === 'commander') {
    const commanders = deck.commander;
    const total = count(commanders) + mainCount;
    if (!commanders.length) problems.push('Chybí velitel. Přidej ho do části Commander.');
    if (count(commanders) > 2) problems.push('Velitelé můžou být nejvýš dva (partner, background).');
    for (const entry of commanders) {
      const type = frontType(entry);
      if (!/Legendary/.test(type) || !/Creature/.test(type)) {
        if (!/can be your commander/i.test(entry.card.oracleText ?? '')) problems.push(`${entry.card.name} nemůže být velitel (musí to být legendární tvor).`);
      }
    }
    if (total !== 100) problems.push(`Balíček má ${total} karet i s velitelem, Commander jich potřebuje přesně 100.`);
    for (const { entry, quantity } of byName([...commanders, ...deck.main])) {
      if (quantity > 1 && !anyNumberAllowed(entry)) problems.push(`${entry.card.name}: ${quantity}×, v Commanderu smí být každá karta jen jednou.`);
    }
    const identity = new Set(commanders.flatMap(entry => entry.card.colorIdentity ?? []));
    if (commanders.length && commanders.every(entry => entry.card.colorIdentity)) {
      for (const entry of deck.main) {
        const outside = (entry.card.colorIdentity ?? []).filter(color => !identity.has(color));
        if (outside.length) problems.push(`${entry.card.name} má barvu mimo velitele (${outside.map(c => COLOR_NAMES[c] ?? c).join(', ')}).`);
      }
    }
  } else {
    if (mainCount < 60) problems.push(`Hlavní balíček má ${mainCount} karet, potřebuje aspoň 60.`);
    if (sideCount > 15) problems.push(`Sideboard má ${sideCount} karet, smí mít nejvýš 15.`);
    for (const { entry, quantity } of byName([...deck.main, ...deck.sideboard])) {
      if (quantity > 4 && !anyNumberAllowed(entry)) problems.push(`${entry.card.name}: ${quantity}×, smí být nejvýš 4 kusy.`);
      if (deck.format === 'vintage' && entry.card.legalities?.vintage === 'restricted' && quantity > 1) {
        problems.push(`${entry.card.name} je ve Vintage restricted, smí být jen 1 kus.`);
      }
    }
  }

  for (const entry of deckEntries(deck)) {
    const status = entry.card.legalities?.[deck.format];
    if (status === 'banned') problems.push(`${entry.card.name} je v tomto formátu zakázaná.`);
    else if (status === 'not_legal') problems.push(`${entry.card.name} v tomto formátu není povolená.`);
  }
  return [...new Set(problems)];
};
