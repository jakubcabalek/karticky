// Decklists as text: what Moxfield, Archidekt, MTG Arena, MTGO and most sites export
// ("4 Lightning Bolt", "1x Sol Ring (CMM) 400 *F*", sections "Commander" / "Sideboard").
import { addCard, type CardEntry, type CardPrinting, type Deck, type DeckBoard, type Finish } from './cardData';
import type { CardIdentifier } from './scryfall';

export type DeckLine = { quantity: number; name: string; set?: string; number?: string; finish: Finish; board: DeckBoard };

const SECTION = /^(?:\/\/\s*)?(commander|commanders|companion|deck|main|mainboard|main deck|sideboard|side|maybeboard|maybe|considering|tokens?)\b[^a-z0-9]*(?:\(\d+\))?\s*:?\s*$/i;
const LINE = /^(?:(SB:)\s*)?(\d+)?\s*x?\s+(.+?)(?:\s+\(([A-Za-z0-9]{2,6})\)(?:\s+([A-Za-z0-9★-]+))?)?(?:\s+(\*[A-Z]\*))?\s*$/i;

const boardForSection = (section: string): DeckBoard | 'skip' => {
  const s = section.toLowerCase();
  if (s.startsWith('commander') || s === 'companion') return 'commander';
  if (s.startsWith('side')) return 'sideboard';
  if (s.startsWith('maybe') || s === 'considering' || s.startsWith('token')) return 'skip';
  return 'main';
};

/**
 * Reads a pasted decklist. Without section headers, a blank line after the main
 * deck starts the sideboard (the MTG Arena convention), except in Commander.
 */
export const parseDecklist = (text: string, { commander = false } = {}): { lines: DeckLine[]; unreadable: string[] } => {
  const lines: DeckLine[] = [];
  const unreadable: string[] = [];
  const hasSections = text.split(/\r?\n/).some(line => SECTION.test(line.trim()));
  let board: DeckBoard | 'skip' = 'main';
  let seenCards = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      if (!hasSections && !commander && seenCards) board = 'sideboard';
      continue;
    }
    if (line.startsWith('#') || (line.startsWith('//') && !SECTION.test(line))) continue;
    const section = line.match(SECTION);
    if (section) { board = boardForSection(section[1]); continue; }

    // Archidekt and others add categories in brackets: "[Commander{top}]", "[Ramp]".
    const tags = line.match(/\[([^\]]*)\]\s*$/)?.[1] ?? '';
    const withoutTags = line.replace(/\s*\[[^\]]*\]\s*$/, '').replace(/\s*\^[^^]*\^\s*$/, '');
    const match = withoutTags.match(LINE);
    if (!match || !match[2] && !/^[A-Za-z]/.test(withoutTags)) { unreadable.push(line); continue; }
    let lineBoard: DeckBoard | 'skip' = match[1] ? 'sideboard' : board;
    if (/commander/i.test(tags)) lineBoard = 'commander';
    else if (/sideboard/i.test(tags)) lineBoard = 'sideboard';
    else if (/maybeboard/i.test(tags)) lineBoard = 'skip';
    if (lineBoard === 'skip') continue;
    lines.push({
      quantity: Math.max(1, Number(match[2] ?? 1)),
      name: match[3].trim(),
      set: match[4]?.toLowerCase(),
      number: match[5],
      finish: match[6] ? 'foil' : 'nonfoil',
      board: lineBoard,
    });
    seenCards = true;
  }
  return { lines, unreadable };
};

export const identifierFor = (line: DeckLine): CardIdentifier =>
  line.set && line.number ? { set: line.set, collector_number: line.number } : line.set ? { name: line.name, set: line.set } : { name: line.name };

const sameName = (card: CardPrinting, name: string) => {
  const wanted = name.toLowerCase();
  const full = card.name.toLowerCase();
  return full === wanted || full.split(' // ')[0] === wanted.split(' // ')[0];
};

/** Matches looked-up cards back to the lines; lines whose card was not found are returned by name. */
export const linesToEntries = (lines: DeckLine[], cards: CardPrinting[], now: string) => {
  const boards: Record<DeckBoard, CardEntry[]> = { commander: [], main: [], sideboard: [] };
  const missing: string[] = [];
  for (const line of lines) {
    const card = (line.set && line.number
      ? cards.find(c => c.set === line.set && c.collectorNumber.toLowerCase() === line.number?.toLowerCase())
      : undefined) ?? cards.find(c => sameName(c, line.name) && (!line.set || c.set === line.set)) ?? cards.find(c => sameName(c, line.name));
    if (!card) { missing.push(`${line.quantity} ${line.name}`); continue; }
    boards[line.board] = addCard(boards[line.board], card, { quantity: line.quantity, finish: line.finish, now });
  }
  return { boards, missing };
};

/** Reads a decklist and looks the cards up on Scryfall. */
export const importDecklist = async (
  text: string,
  lookup: (identifiers: CardIdentifier[]) => Promise<{ found: CardPrinting[] }>,
  { commander = false, now = new Date().toISOString() } = {},
) => {
  const { lines, unreadable } = parseDecklist(text, { commander });
  const unique = new Map<string, CardIdentifier>();
  for (const line of lines) unique.set(JSON.stringify(identifierFor(line)), identifierFor(line));
  const { found } = lines.length ? await lookup([...unique.values()]) : { found: [] };
  const { boards, missing } = linesToEntries(lines, found, now);
  return { boards, missing: [...missing, ...unreadable] };
};

const lineFor = (entry: CardEntry) =>
  `${entry.quantity} ${entry.card.name} (${entry.card.set.toUpperCase()}) ${entry.card.collectorNumber}${entry.finish === 'foil' ? ' *F*' : ''}`;

/** Text that Moxfield, Archidekt and MTG Arena can import. */
export const deckToText = (deck: Deck) => {
  const parts: string[] = [];
  if (deck.commander.length) parts.push(['Commander', ...deck.commander.map(lineFor)].join('\n'));
  parts.push(['Deck', ...deck.main.map(lineFor)].join('\n'));
  if (deck.sideboard.length) parts.push(['Sideboard', ...deck.sideboard.map(lineFor)].join('\n'));
  return parts.join('\n\n');
};
