// Base64 to bytes without relying on atob (not everywhere in React Native).
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Uint8Array(128);
for (let i = 0; i < ALPHABET.length; i += 1) LOOKUP[ALPHABET.charCodeAt(i)] = i;

export const decodeBase64 = (text: string): Uint8Array => {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let byte = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = LOOKUP[clean.charCodeAt(i)], b = LOOKUP[clean.charCodeAt(i + 1)];
    const c = LOOKUP[clean.charCodeAt(i + 2)], d = LOOKUP[clean.charCodeAt(i + 3)];
    bytes[byte++] = (a << 2) | (b >> 4);
    if (i + 2 < clean.length) bytes[byte++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < clean.length) bytes[byte++] = ((c & 3) << 6) | d;
  }
  return bytes;
};
