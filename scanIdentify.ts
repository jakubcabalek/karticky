// Turns one scanned card into an exact printing (set, number, language).
// 1. The small print at the bottom ("0123 R / MH3 • JP") names the printing exactly.
// 2. Otherwise the artwork is matched against the scan index: it is the same in
//    every language, so Japanese, Chinese or Korean cards are found too.
// 3. The language comes from the small print, else from the script of the text read
//    on the card (kana, hangul, Chinese characters, Cyrillic), else the person's usual language.
import type { CardPrinting } from './cardData';
import { cardHashes, matchConfidence, matchIndex, type Pixels, type ScanIndex } from './cardHash';
import { allPrintings, cardById, cardBySetNumber, parseCollectorLine } from './scryfall';

export type ScanInput = { image?: Pixels; text?: string };
export type ScanResult = {
  status: 'found' | 'uncertain' | 'notFound';
  method: 'collectorLine' | 'artwork' | 'none';
  printing?: CardPrinting;
  /** Same card in other sets or languages, then other cards that looked similar. */
  alternatives: CardPrinting[];
  /** Languages this artwork was printed in, for a quick switch. */
  languages: string[];
};

type Lookup = {
  index?: ScanIndex | null;
  preferredLanguage?: string;
  cardById?: typeof cardById;
  cardBySetNumber?: typeof cardBySetNumber;
  allPrintings?: typeof allPrintings;
};

/** Languages suggested by the writing on the card. Chinese characters alone may also be Japanese. */
export const languagesFromScript = (text: string): string[] => {
  if (/[぀-ヿ]/.test(text)) return ['ja'];
  if (/[가-힯ᄀ-ᇿ]/.test(text)) return ['ko'];
  if (/[一-鿿]/.test(text)) return ['zhs', 'zht', 'ja'];
  if (/[Ѐ-ӿ]/.test(text)) return ['ru'];
  return [];
};

/** The printing in the first wanted language that exists, newest first; English as the fallback. */
export const choosePrinting = (printings: CardPrinting[], languages: string[]): CardPrinting | undefined => {
  for (const lang of [...languages, 'en']) {
    const found = printings.find(printing => printing.lang === lang);
    if (found) return found;
  }
  return printings[0];
};

const uniqueById = (cards: CardPrinting[]) => cards.filter((card, i) => cards.findIndex(other => other.id === card.id) === i);
const languagesOf = (printings: CardPrinting[]) => [...new Set(printings.map(printing => printing.lang))];

const sameArtwork = async (card: CardPrinting, lookup: Required<Pick<Lookup, 'allPrintings'>>) => {
  if (!card.oracleId) return [card];
  const printings = await lookup.allPrintings(card.oracleId);
  const same = card.illustrationId ? printings.filter(printing => printing.illustrationId === card.illustrationId) : printings;
  return same.length ? same : [card];
};

export const identifyCard = async (input: ScanInput, lookup: Lookup = {}): Promise<ScanResult> => {
  const byId = lookup.cardById ?? cardById;
  const bySetNumber = lookup.cardBySetNumber ?? cardBySetNumber;
  const printingsOf = { allPrintings: lookup.allPrintings ?? allPrintings };
  const text = input.text ?? '';
  const line = text ? parseCollectorLine(text) : null;
  const wanted = [line?.lang, ...languagesFromScript(text), lookup.preferredLanguage].filter((lang): lang is string => Boolean(lang));

  if (line) {
    const exact = (line.lang ? await bySetNumber(line.set, line.number, line.lang) : null) ?? await bySetNumber(line.set, line.number);
    if (exact) {
      const printings = await sameArtwork(exact, printingsOf);
      const printing = line.lang ? printings.find(p => p.set === exact.set && p.collectorNumber === exact.collectorNumber && p.lang === line.lang) ?? exact : exact;
      return {
        status: 'found',
        method: 'collectorLine',
        printing,
        alternatives: printings.filter(p => p.id !== printing.id),
        languages: languagesOf(printings),
      };
    }
  }

  if (input.image && lookup.index) {
    const matches = matchIndex(lookup.index, cardHashes(input.image), 4);
    const confidence = matchConfidence(matches);
    const best = matches[0] ? await byId(matches[0].id) : null;
    if (best) {
      const printings = await sameArtwork(best, printingsOf);
      const printing = choosePrinting(printings, wanted) ?? best;
      const others: CardPrinting[] = [];
      if (confidence !== 'high') {
        for (const match of matches.slice(1, 3)) {
          const other = await byId(match.id);
          if (other) others.push(other);
        }
      }
      return {
        status: confidence === 'high' ? 'found' : 'uncertain',
        method: 'artwork',
        printing,
        alternatives: uniqueById([...printings.filter(p => p.id !== printing.id), ...others]),
        languages: languagesOf(printings),
      };
    }
  }

  return { status: 'notFound', method: 'none', alternatives: [], languages: [] };
};
