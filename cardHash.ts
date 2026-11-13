// Recognises a card by its artwork, not its text. The illustration is the same in
// every language (English, Japanese, Chinese, Korean, Russian …), so a photo of a
// Japanese card finds the same artwork as the English one; the language is then
// chosen from what was read on the card or what the person picks.
//
// The same code builds the index (scripts/scan-index, from Scryfall's art crops)
// and hashes the photo, so both sides compute exactly the same numbers.
// Pure TypeScript with erasable syntax only: Node runs it directly in the index script.

/** RGBA pixels, row by row (what a canvas or the iPhone scanner gives). */
export type Pixels = { width: number; height: number; data: ArrayLike<number> };
/** A rectangle in fractions of the image (0–1). */
export type Rect = { x: number; y: number; w: number; h: number };

/** 512-bit hash: 256 bits of horizontal and 256 bits of vertical brightness gradients. */
export const HASH_WORDS = 16;
export const HASH_BITS = HASH_WORDS * 32;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Average brightness of `columns` × `rows` cells covering `rect` (box filter, so any photo size works). */
export const sampleGray = (image: Pixels, rect: Rect, columns: number, rows: number): Float64Array => {
  const out = new Float64Array(columns * rows);
  const left = clamp(rect.x, 0, 1) * image.width;
  const top = clamp(rect.y, 0, 1) * image.height;
  const width = clamp(rect.w, 0, 1 - clamp(rect.x, 0, 1)) * image.width;
  const height = clamp(rect.h, 0, 1 - clamp(rect.y, 0, 1)) * image.height;
  for (let row = 0; row < rows; row += 1) {
    const y0 = Math.floor(top + (row * height) / rows);
    const y1 = Math.max(y0 + 1, Math.min(image.height, Math.floor(top + ((row + 1) * height) / rows)));
    for (let column = 0; column < columns; column += 1) {
      const x0 = Math.floor(left + (column * width) / columns);
      const x1 = Math.max(x0 + 1, Math.min(image.width, Math.floor(left + ((column + 1) * width) / columns)));
      let sum = 0;
      let count = 0;
      for (let y = Math.min(y0, image.height - 1); y < y1; y += 1) {
        for (let x = Math.min(x0, image.width - 1); x < x1; x += 1) {
          const i = (y * image.width + x) * 4;
          sum += 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];
          count += 1;
        }
      }
      out[row * columns + column] = count ? sum / count : 0;
    }
  }
  return out;
};

/** Difference hash of one region: robust to brightness, contrast, blur and small shifts. */
export const hashRegion = (image: Pixels, rect: Rect): Uint32Array => {
  const hash = new Uint32Array(HASH_WORDS);
  const setBit = (bit: number) => { hash[bit >>> 5] |= 1 << (bit & 31); };
  const horizontal = sampleGray(image, rect, 17, 16);
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) if (horizontal[y * 17 + x] < horizontal[y * 17 + x + 1]) setBit(y * 16 + x);
  }
  const vertical = sampleGray(image, rect, 16, 17);
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) if (vertical[y * 16 + x] < vertical[(y + 1) * 16 + x]) setBit(256 + y * 16 + x);
  }
  return hash;
};

const popcount = (value: number) => {
  let v = value - ((value >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};

/** Number of differing bits between hash `a` (at word offset ai) and `b` (at bi). */
export const hammingDistance = (a: Uint32Array, ai: number, b: Uint32Array, bi: number) => {
  let distance = 0;
  for (let i = 0; i < HASH_WORDS; i += 1) distance += popcount(a[ai + i] ^ b[bi + i]);
  return distance;
};

// Only the inside of the artwork is compared: frames, borders and the edge of
// Scryfall's crop differ between printings, the middle of the painting does not.
const innerPart = (rect: Rect): Rect => ({ x: rect.x + rect.w * 0.1, y: rect.y + rect.h * 0.1, w: rect.w * 0.8, h: rect.h * 0.8 });

/** Region hashed in Scryfall's art crop when building the index. */
export const INDEX_RECT: Rect = innerPart({ x: 0, y: 0, w: 1, h: 1 });

/**
 * Where the artwork sits on a straightened card (fractions of the whole card),
 * by frame family. A photo is tried against all of them.
 */
export const ART_WINDOWS: Record<'modern' | 'classic' | 'tall', Rect> = {
  modern: { x: 0.08, y: 0.112, w: 0.84, h: 0.445 }, // 2003 and 2015 frames
  classic: { x: 0.1, y: 0.088, w: 0.8, h: 0.4 }, // 1993–2003 frame with the wide border
  tall: { x: 0.06, y: 0.08, w: 0.88, h: 0.54 }, // borderless, showcase, extended and full art
};

const SHIFTS = [-0.015, 0, 0.015];

/** Hashes to compare for a straightened photo of a whole card: every frame, slightly shifted. */
export const cardHashes = (card: Pixels): Uint32Array => {
  const hashes: Uint32Array[] = [];
  for (const window of Object.values(ART_WINDOWS)) {
    for (const dy of SHIFTS) {
      for (const dx of SHIFTS) hashes.push(hashRegion(card, innerPart({ ...window, x: window.x + dx, y: window.y + dy })));
    }
  }
  const all = new Uint32Array(hashes.length * HASH_WORDS);
  hashes.forEach((hash, i) => all.set(hash, i * HASH_WORDS));
  return all;
};

// ---- Index file: "KSI1", count (u32), words per hash (u16), reserved (u16),
// then all hashes (count × 64 bytes, little endian), Scryfall ids (count × 16 bytes)
// and card faces (count × 1 byte; 0 = front, 1 = back of a double-faced card).

export type IndexEntry = { id: string; face: number; hash: Uint32Array };
export type ScanIndex = { count: number; hashes: Uint32Array; ids: string[]; faces: Uint8Array };

const HEADER = 12;
const MAGIC = [0x4b, 0x53, 0x49, 0x31]; // KSI1

const uuidToBytes = (id: string, out: Uint8Array, offset: number) => {
  const hex = id.replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error(`Neplatné id karty: ${id}`);
  for (let i = 0; i < 16; i += 1) out[offset + i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
};

const bytesToUuid = (bytes: Uint8Array, offset: number) => {
  let hex = '';
  for (let i = 0; i < 16; i += 1) hex += bytes[offset + i].toString(16).padStart(2, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const encodeIndex = (entries: IndexEntry[]): Uint8Array => {
  const count = entries.length;
  const bytes = new Uint8Array(HEADER + count * (HASH_WORDS * 4 + 17));
  const view = new DataView(bytes.buffer);
  MAGIC.forEach((value, i) => { bytes[i] = value; });
  view.setUint32(4, count, true);
  view.setUint16(8, HASH_WORDS, true);
  const idsAt = HEADER + count * HASH_WORDS * 4;
  const facesAt = idsAt + count * 16;
  entries.forEach((entry, n) => {
    for (let w = 0; w < HASH_WORDS; w += 1) view.setUint32(HEADER + (n * HASH_WORDS + w) * 4, entry.hash[w], true);
    uuidToBytes(entry.id, bytes, idsAt + n * 16);
    bytes[facesAt + n] = entry.face;
  });
  return bytes;
};

export const decodeIndex = (data: ArrayBuffer | Uint8Array): ScanIndex => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < HEADER || MAGIC.some((value, i) => bytes[i] !== value)) throw new Error('Soubor není index karet.');
  const count = view.getUint32(4, true);
  if (view.getUint16(8, true) !== HASH_WORDS || bytes.length !== HEADER + count * (HASH_WORDS * 4 + 17)) {
    throw new Error('Index karet má jiný formát, aktualizuj aplikaci.');
  }
  const hashes = new Uint32Array(count * HASH_WORDS);
  for (let i = 0; i < hashes.length; i += 1) hashes[i] = view.getUint32(HEADER + i * 4, true);
  const idsAt = HEADER + count * HASH_WORDS * 4;
  const ids = Array.from({ length: count }, (_, n) => bytesToUuid(bytes, idsAt + n * 16));
  return { count, hashes, ids, faces: bytes.slice(idsAt + count * 16, idsAt + count * 17) };
};

export type IndexMatch = { id: string; face: number; distance: number };

/** The closest artworks to any of the query hashes, best first, one result per card. */
export const matchIndex = (index: ScanIndex, queries: Uint32Array, top = 5): IndexMatch[] => {
  const queryCount = queries.length / HASH_WORDS;
  const best: IndexMatch[] = [];
  for (let n = 0; n < index.count; n += 1) {
    let distance = HASH_BITS;
    for (let q = 0; q < queryCount; q += 1) {
      const d = hammingDistance(index.hashes, n * HASH_WORDS, queries, q * HASH_WORDS);
      if (d < distance) distance = d;
    }
    if (best.length < top || distance < best[best.length - 1].distance) {
      const existing = best.findIndex(match => match.id === index.ids[n]);
      if (existing >= 0) {
        if (best[existing].distance <= distance) continue;
        best.splice(existing, 1);
      }
      best.push({ id: index.ids[n], face: index.faces[n], distance });
      best.sort((a, b) => a.distance - b.distance);
      if (best.length > top) best.pop();
    }
  }
  return best;
};

/**
 * How sure the match is. Unrelated pictures differ in about half the bits (≈256),
 * the same artwork photographed differs in far fewer.
 */
export const matchConfidence = (matches: IndexMatch[]): 'high' | 'medium' | 'low' => {
  const [first, second] = matches;
  if (!first) return 'low';
  const gap = (second?.distance ?? HASH_BITS / 2) - first.distance;
  if (first.distance <= 110 && gap >= 40) return 'high';
  if (first.distance <= 150 && gap >= 20) return 'medium';
  return 'low';
};
