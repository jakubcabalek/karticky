// Pure data logic for the collection, wishlist and decks. No React, no storage,
// no network: everything here is tested with `node --test`.

export type CardPrices = { eur?: number; eurFoil?: number; usd?: number; usdFoil?: number };

/** One printing of a card (a specific set and collector number), as Scryfall knows it. */
export type CardPrinting = {
  id: string;
  oracleId?: string;
  /** Same artwork in every language and reprint with the same art. */
  illustrationId?: string;
  name: string;
  printedName?: string;
  set: string;
  setName: string;
  collectorNumber: string;
  lang: string;
  rarity: string;
  typeLine: string;
  manaCost: string;
  /** Official English rules text (Oracle); double-faced cards have both faces, separated by "//". */
  oracleText?: string;
  /** Keyword abilities as Scryfall lists them, e.g. ["Flying", "Ward"]. */
  keywords?: string[];
  power?: string;
  toughness?: string;
  imageSmall?: string;
  imageNormal?: string;
  prices: CardPrices;
  cardmarketUrl?: string;
};

export type Finish = 'nonfoil' | 'foil';
export type CardEntry = { key: string; card: CardPrinting; quantity: number; finish: Finish; addedAt: string };
export type DeckBoard = 'main' | 'sideboard';
export type Deck = { id: string; name: string; main: CardEntry[]; sideboard: CardEntry[]; createdAt: string; updatedAt: string };
/**
 * `deleted` remembers what was removed and when (keys "c:…" collection, "w:…" wishlist,
 * "d:…" deck), so syncing with another device does not bring removed cards back.
 */
export type Library = { version: 1; collection: CardEntry[]; wishlist: CardEntry[]; decks: Deck[]; deleted?: Record<string, string> };
export type PriceCurrency = 'eur' | 'usd';

export const emptyLibrary = (): Library => ({ version: 1, collection: [], wishlist: [], decks: [] });

export const entryKey = (cardId: string, finish: Finish) => `${cardId}:${finish}`;

/** Adds copies of a printing; the same printing and finish only raises the count. */
export const addCard = (
  list: CardEntry[],
  card: CardPrinting,
  { quantity = 1, finish = 'nonfoil', now = new Date().toISOString() }: { quantity?: number; finish?: Finish; now?: string } = {},
): CardEntry[] => {
  const key = entryKey(card.id, finish);
  const count = Math.max(1, Math.floor(quantity));
  const existing = list.find(entry => entry.key === key);
  if (existing) return list.map(entry => entry.key === key ? { ...entry, card, quantity: entry.quantity + count } : entry);
  return [...list, { key, card, quantity: count, finish, addedAt: now }];
};

/** Sets the count of one entry; zero or less removes it. */
export const setQuantity = (list: CardEntry[], key: string, quantity: number): CardEntry[] =>
  quantity < 1
    ? list.filter(entry => entry.key !== key)
    : list.map(entry => entry.key === key ? { ...entry, quantity: Math.floor(quantity) } : entry);

export const totalCards = (list: CardEntry[]) => list.reduce((sum, entry) => sum + entry.quantity, 0);

/** Price of one copy in the entry's finish, or null when Scryfall has none. */
export const entryPrice = (entry: CardEntry, currency: PriceCurrency): number | null => {
  const { prices } = entry.card;
  const value = currency === 'eur'
    ? entry.finish === 'foil' ? prices.eurFoil : prices.eur
    : entry.finish === 'foil' ? prices.usdFoil : prices.usd;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

/** Total value of a list; `unpriced` counts copies that have no price and are left out. */
export const listValue = (list: CardEntry[], currency: PriceCurrency) => list.reduce(
  (sum, entry) => {
    const price = entryPrice(entry, currency);
    return price === null
      ? { ...sum, unpriced: sum.unpriced + entry.quantity }
      : { ...sum, total: Math.round((sum.total + price * entry.quantity) * 100) / 100 };
  },
  { total: 0, unpriced: 0 },
);

// Cards are matched across printings by Oracle id (the same card in any set),
// falling back to the English name for cards saved without it.
const cardIdentity = (card: CardPrinting) => card.oracleId ?? card.name.toLowerCase();

/** How many copies of this card (any printing, any finish) are in the list. */
export const copiesOf = (list: CardEntry[], card: CardPrinting) =>
  list.filter(entry => cardIdentity(entry.card) === cardIdentity(card)).reduce((sum, entry) => sum + entry.quantity, 0);

export const createDeck = (library: Library, name: string, { id, now }: { id: string; now: string }): Library => ({
  ...library,
  decks: [...library.decks, { id, name: name.trim() || 'Nový balíček', main: [], sideboard: [], createdAt: now, updatedAt: now }],
});

export const updateDeck = (library: Library, deckId: string, change: (deck: Deck) => Partial<Deck>, now: string): Library => ({
  ...library,
  decks: library.decks.map(deck => deck.id === deckId ? { ...deck, ...change(deck), updatedAt: now } : deck),
});

export const deleteDeck = (library: Library, deckId: string): Library => ({
  ...library,
  decks: library.decks.filter(deck => deck.id !== deckId),
});

/**
 * Cards the deck needs that the collection does not have, with the missing count.
 * A card in both main deck and sideboard is counted once for both.
 */
export const missingForDeck = (deck: Deck, collection: CardEntry[]): { card: CardPrinting; missing: number }[] => {
  const needed = new Map<string, { card: CardPrinting; count: number }>();
  for (const entry of [...deck.main, ...deck.sideboard]) {
    const id = cardIdentity(entry.card);
    const current = needed.get(id);
    needed.set(id, { card: current?.card ?? entry.card, count: (current?.count ?? 0) + entry.quantity });
  }
  return [...needed.values()]
    .map(({ card, count }) => ({ card, missing: count - copiesOf(collection, card) }))
    .filter(item => item.missing > 0);
};

/** Puts what the deck is missing on the wishlist, without doubling what is already wished for. */
export const wishMissingCards = (library: Library, deckId: string, now: string): Library => {
  const deck = library.decks.find(item => item.id === deckId);
  if (!deck) return library;
  let wishlist = library.wishlist;
  for (const { card, missing } of missingForDeck(deck, library.collection)) {
    const toAdd = missing - copiesOf(wishlist, card);
    if (toAdd > 0) wishlist = addCard(wishlist, card, { quantity: toAdd, now });
  }
  return { ...library, wishlist };
};

/** Moves a wished card into the collection (bought or traded). */
export const markWishAcquired = (library: Library, key: string, now: string): Library => {
  const entry = library.wishlist.find(item => item.key === key);
  if (!entry) return library;
  return {
    ...library,
    wishlist: library.wishlist.filter(item => item.key !== key),
    collection: addCard(library.collection, entry.card, { quantity: entry.quantity, finish: entry.finish, now }),
  };
};

// Loading saved data must never crash the app: anything malformed is dropped.
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isEntry = (value: unknown): value is CardEntry =>
  isRecord(value) && typeof value.key === 'string' && typeof value.quantity === 'number' && value.quantity > 0
  && (value.finish === 'nonfoil' || value.finish === 'foil')
  && isRecord(value.card) && typeof value.card.id === 'string' && typeof value.card.name === 'string';
const entries = (value: unknown) => Array.isArray(value) ? value.filter(isEntry) : [];

export const normalizeLibrary = (value: unknown): Library => {
  if (!isRecord(value)) return emptyLibrary();
  const decks = Array.isArray(value.decks) ? value.decks.filter(isRecord).filter(deck => typeof deck.id === 'string').map(deck => ({
    id: deck.id as string,
    name: typeof deck.name === 'string' ? deck.name : 'Balíček',
    main: entries(deck.main),
    sideboard: entries(deck.sideboard),
    createdAt: typeof deck.createdAt === 'string' ? deck.createdAt : '',
    updatedAt: typeof deck.updatedAt === 'string' ? deck.updatedAt : '',
  })) : [];
  const deleted: Record<string, string> = {};
  if (isRecord(value.deleted)) for (const [key, at] of Object.entries(value.deleted)) if (typeof at === 'string') deleted[key] = at;
  return { version: 1, collection: entries(value.collection), wishlist: entries(value.wishlist), decks, deleted };
};

const TOMBSTONE_DAYS = 120;

/** Notes what disappeared between two versions of the library, for syncing. */
export const recordDeletions = (before: Library, after: Library, now: string): Library => {
  const deleted = { ...(after.deleted ?? before.deleted ?? {}) };
  const gone = (prefix: string, old: { key: string }[], current: { key: string }[]) => {
    const kept = new Set(current.map(item => item.key));
    for (const item of old) if (!kept.has(item.key)) deleted[`${prefix}:${item.key}`] = now;
  };
  gone('c', before.collection, after.collection);
  gone('w', before.wishlist, after.wishlist);
  gone('d', before.decks.map(deck => ({ key: deck.id })), after.decks.map(deck => ({ key: deck.id })));
  const oldest = Date.parse(now) - TOMBSTONE_DAYS * 86_400_000;
  for (const [key, at] of Object.entries(deleted)) if (Date.parse(at) < oldest) delete deleted[key];
  return { ...after, deleted };
};

/**
 * Combines this device's library with the one from the account. Cards and decks
 * from both are kept; for the same card this device's count wins, for the same deck
 * the more recently changed one. Something removed on either side stays removed,
 * unless it was added again after the removal.
 */
export const mergeLibraries = (local: Library, remote: Library): Library => {
  const deleted: Record<string, string> = { ...(remote.deleted ?? {}) };
  for (const [key, at] of Object.entries(local.deleted ?? {})) if (!deleted[key] || deleted[key] < at) deleted[key] = at;
  const alive = (key: string, changedAt: string) => !deleted[key] || deleted[key] < changedAt;
  const mergeList = (prefix: string, mine: CardEntry[], theirs: CardEntry[]) => {
    const byKey = new Map<string, CardEntry>();
    for (const entry of [...theirs, ...mine]) byKey.set(entry.key, entry);
    return [...byKey.values()].filter(entry => alive(`${prefix}:${entry.key}`, entry.addedAt));
  };
  const decks = new Map<string, Deck>();
  for (const deck of [...remote.decks, ...local.decks]) {
    const other = decks.get(deck.id);
    if (!other || other.updatedAt <= deck.updatedAt) decks.set(deck.id, deck);
  }
  return {
    version: 1,
    collection: mergeList('c', local.collection, remote.collection),
    wishlist: mergeList('w', local.wishlist, remote.wishlist),
    decks: [...decks.values()].filter(deck => alive(`d:${deck.id}`, deck.updatedAt)),
    deleted,
  };
};

/** Same content, ignoring order: nothing to upload. */
export const sameLibrary = (a: Library, b: Library) => JSON.stringify(normalizeLibrary(a)) === JSON.stringify(normalizeLibrary(b));

export const formatPrice = (value: number, currency: PriceCurrency) =>
  new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: currency.toUpperCase() }).format(value);
