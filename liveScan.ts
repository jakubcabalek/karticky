// Scanning without taking a photo: the camera looks at the card several times a
// second, and a card is "read" once the same card is recognised in a row
// (2 frames when sure, 3 when fairly sure). The same card is not read again
// until it leaves the camera for a moment, so a stack can be scanned one by one.
import { cardHashes, matchConfidence, matchIndex, type Pixels, type ScanIndex } from './cardHash';
import { parseCollectorLine } from './scryfall';

export type LiveState = { candidate: string | null; hits: number; accepted: string | null; lastSeen: number };
export type Strength = 'high' | 'medium' | 'low';

export const initialLiveState = (): LiveState => ({ candidate: null, hits: 0, accepted: null, lastSeen: 0 });

/** Gone for this long, the same card can be read again (a second copy). */
export const GONE_MS = 1200;

export const liveStep = (state: LiveState, key: string | null, strength: Strength, now: number): { state: LiveState; accept: boolean } => {
  if (!key || strength === 'low') {
    const accepted = now - state.lastSeen > GONE_MS ? null : state.accepted;
    return { state: { ...state, candidate: null, hits: 0, accepted }, accept: false };
  }
  const hits = key === state.candidate ? state.hits + 1 : 1;
  const accept = hits >= (strength === 'high' ? 2 : 3) && key !== state.accepted;
  return { state: { candidate: key, hits, accepted: accept ? key : state.accepted, lastSeen: now }, accept };
};

/** What one camera frame shows: the printed collector line is surest, then the artwork. */
export const recogniseFrame = (frame: { image?: Pixels | null; text?: string }, index: ScanIndex | null | undefined): { key: string | null; strength: Strength } => {
  const line = frame.text ? parseCollectorLine(frame.text) : null;
  if (line) return { key: `line:${line.set}:${line.number}:${line.lang ?? ''}`, strength: 'high' };
  if (!frame.image || !index) return { key: null, strength: 'low' };
  const matches = matchIndex(index, cardHashes(frame.image), 3);
  return { key: matches[0] ? `art:${matches[0].id}` : null, strength: matchConfidence(matches) };
};
