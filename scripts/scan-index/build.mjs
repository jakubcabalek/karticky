// Builds scan-index-v1.bin: one artwork hash for every unique MTG artwork (and every
// face of double-faced cards), from Scryfall's "unique artwork" bulk data and art crops.
// Usage: node scripts/scan-index/build.mjs <output> [previous index to reuse]
// Artworks already in the previous index are not downloaded again, so weekly runs are quick.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { decodeIndex, encodeIndex, hashRegion, HASH_WORDS, INDEX_RECT } from '../../cardHash.ts';

const [output = 'scan-index-v1.bin', previousPath] = process.argv.slice(2);
const headers = { 'User-Agent': 'Karticky/0.1 (+https://github.com/jakubcabalek/karticky)', Accept: 'application/json' };
const CONCURRENCY = 12;

const json = async url => {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} → ${response.status}`);
  return response.json();
};

const previous = new Map();
if (previousPath) {
  try {
    const index = decodeIndex(await readFile(previousPath));
    for (let n = 0; n < index.count; n += 1) previous.set(`${index.ids[n]}:${index.faces[n]}`, index.hashes.slice(n * HASH_WORDS, (n + 1) * HASH_WORDS));
    console.log(`Previous index: ${index.count} artworks`);
  } catch (error) {
    console.log(`No usable previous index (${error.message}), building from scratch.`);
  }
}

// The list of bulk files; "unique_artwork" is one card per unique artwork.
const bulkList = await json('https://api.scryfall.com/bulk-data');
const bulk = (bulkList.data ?? []).find(item => item.type === 'unique_artwork');
if (!bulk?.download_uri) throw new Error(`Scryfall bulk data "unique_artwork" not found: ${JSON.stringify(bulkList).slice(0, 300)}`);
console.log(`Scryfall unique artwork from ${bulk.updated_at}`);
const cards = await json(bulk.download_uri);

const wanted = [];
for (const card of cards) {
  const faces = card.image_uris ? [card.image_uris] : (card.card_faces ?? []).map(face => face.image_uris);
  faces.forEach((images, face) => { if (images?.art_crop) wanted.push({ id: card.id, face, url: images.art_crop }); });
}
console.log(`${cards.length} cards, ${wanted.length} artworks to index`);

const hashArt = async url => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': headers['User-Agent'] } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
        .resize({ width: 160, height: 120, fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return hashRegion({ width: info.width, height: info.height, data }, INDEX_RECT);
    } catch (error) {
      if (attempt >= 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

const entries = new Array(wanted.length);
let next = 0, reused = 0, downloaded = 0;
const failed = [];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (next < wanted.length) {
    const n = next++;
    const item = wanted[n];
    const known = previous.get(`${item.id}:${item.face}`);
    if (known) { entries[n] = { id: item.id, face: item.face, hash: known }; reused += 1; continue; }
    try {
      entries[n] = { id: item.id, face: item.face, hash: await hashArt(item.url) };
      downloaded += 1;
      if (downloaded % 1000 === 0) console.log(`… ${downloaded} downloaded`);
    } catch (error) {
      failed.push(`${item.id}:${item.face} ${error.message}`);
    }
  }
}));

const done = entries.filter(Boolean);
await writeFile(output, encodeIndex(done));
console.log(`Wrote ${output}: ${done.length} artworks (${reused} reused, ${downloaded} new, ${failed.length} failed)`);
if (failed.length) console.log(failed.slice(0, 20).join('\n'));
if (failed.length > wanted.length * 0.02) {
  console.error('Too many artworks failed, keeping the previous index.');
  process.exit(1);
}
