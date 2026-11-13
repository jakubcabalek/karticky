// Card data from Scryfall (https://scryfall.com/docs/api): free, works from the
// browser and the phone. Scryfall asks for 50–100 ms between requests and updates
// prices once a day, so requests are paced and nothing is polled.
import type { CardPrinting } from './cardData';

const API = 'https://api.scryfall.com';
const PACE_MS = 100;

type Fetch = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

let lastRequest = 0;
const paced = async (fetchImpl: Fetch, url: string) => {
  const wait = lastRequest + PACE_MS - Date.now();
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  lastRequest = Date.now();
  return fetchImpl(url, { headers: { Accept: 'application/json' } });
};

const defaultFetch: Fetch = (url, init) => fetch(url, init);

const text = (value: unknown) => typeof value === 'string' ? value : '';
const price = (value: unknown) => {
  const number = typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) ? number : undefined;
};
const record = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};

/** Turns a Scryfall card object into our printing. Double-faced cards use the front face's image. */
export const parseCard = (raw: unknown): CardPrinting => {
  const card = record(raw);
  const faces = Array.isArray(card.card_faces) ? card.card_faces.map(record) : [];
  const images = record(card.image_uris ?? faces[0]?.image_uris);
  const prices = record(card.prices);
  return {
    id: text(card.id),
    oracleId: text(card.oracle_id) || undefined,
    name: text(card.name),
    printedName: text(card.printed_name) || undefined,
    set: text(card.set),
    setName: text(card.set_name),
    collectorNumber: text(card.collector_number),
    lang: text(card.lang) || 'en',
    rarity: text(card.rarity),
    typeLine: text(card.type_line) || text(faces[0]?.type_line),
    manaCost: text(card.mana_cost) || text(faces[0]?.mana_cost),
    imageSmall: text(images.small) || undefined,
    imageNormal: text(images.normal) || undefined,
    prices: { eur: price(prices.eur), eurFoil: price(prices.eur_foil), usd: price(prices.usd), usdFoil: price(prices.usd_foil) },
    cardmarketUrl: text(record(card.purchase_uris).cardmarket) || undefined,
  };
};

export class ScryfallError extends Error {}

/** Full-text card search; 404 from Scryfall means "nothing found", not an error. */
export const searchCards = async (query: string, fetchImpl: Fetch = defaultFetch): Promise<CardPrinting[]> => {
  const q = query.trim();
  if (!q) return [];
  const response = await paced(fetchImpl, `${API}/cards/search?q=${encodeURIComponent(q)}&unique=prints&order=released`);
  if (response.status === 404) return [];
  if (!response.ok) throw new ScryfallError(`Scryfall odpověděl ${response.status}.`);
  const body = record(await response.json());
  return Array.isArray(body.data) ? body.data.map(parseCard) : [];
};

/** One exact printing by set code and collector number, e.g. what a scan reads off the card. */
export const cardBySetNumber = async (set: string, number: string, lang = '', fetchImpl: Fetch = defaultFetch): Promise<CardPrinting | null> => {
  const path = [set.toLowerCase(), number, lang.toLowerCase()].filter(Boolean).map(encodeURIComponent).join('/');
  const response = await paced(fetchImpl, `${API}/cards/${path}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new ScryfallError(`Scryfall odpověděl ${response.status}.`);
  return parseCard(await response.json());
};

/**
 * Reads set and collector number from the small print at the bottom left of a
 * modern card (since 2020), e.g. "0123 R" over "MH3 • EN". This is what the
 * scanner will look for: it identifies the exact printing, unlike the name.
 */
export const parseCollectorLine = (ocrText: string): { set: string; number: string; lang?: string } | null => {
  const lines = ocrText.toUpperCase().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i += 1) {
    const numberMatch = lines[i].match(/^(\d{1,4}[A-Z]?)(?:\/\d{1,4})?\s+[CURMSLTP]\b/);
    const setMatch = (lines[i + 1] ?? '').match(/^([A-Z0-9]{3,5})\s*[•·*.-]\s*([A-Z]{2})\b/);
    if (numberMatch && setMatch) {
      return { set: setMatch[1].toLowerCase(), number: numberMatch[1].replace(/^0+(?=\d)/, '').toLowerCase(), lang: setMatch[2].toLowerCase() };
    }
  }
  return null;
};
