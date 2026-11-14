// "Každá obrazovka je karta": the look of Kartičky. Every screen sits in a card frame
// whose colour says what the screen is for (blue = knowledge, gold = decks, …).
// The frame is our own design inspired by how a card is built; no official frames,
// mana symbols or fonts of Wizards of the Coast are used.
import { Platform } from 'react-native';

export type FrameColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'M' | 'C';

export type Frame = {
  /** Main frame colour, with a lighter top edge and darker bottom edge for a bevel. */
  base: string; light: string; dark: string;
  /** Name and type bars. */
  bar: string; barEdge: string; ink: string;
  /** Small text printed on the frame (collector line). */
  text: string;
  /** Glow behind icons and art placeholders. */
  glow: string;
};

export const FRAMES: Record<FrameColor, Frame> = {
  W: { base: '#C2AE84', light: '#E4D8BC', dark: '#8A7552', bar: '#F3EBD6', barEdge: '#7C6744', ink: '#2B2014', text: '#2B2014', glow: '#FFF4D6' },
  U: { base: '#3E6681', light: '#6E97B3', dark: '#24394A', bar: '#D6E5EE', barEdge: '#1E3240', ink: '#14222C', text: '#EEF3F5', glow: '#BFD9EA' },
  B: { base: '#352C25', light: '#5B4E44', dark: '#1A1512', bar: '#D8CCBA', barEdge: '#0E0B09', ink: '#1A1410', text: '#ECE5DA', glow: '#9C8C78' },
  R: { base: '#A2482A', light: '#D07A4C', dark: '#5E2412', bar: '#F3D8C4', barEdge: '#4A1A0A', ink: '#2A1208', text: '#F8EDE4', glow: '#F2B48A' },
  G: { base: '#5A7136', light: '#87A05A', dark: '#2E3A1A', bar: '#E2E9C9', barEdge: '#1E2610', ink: '#1A2010', text: '#F1F4E6', glow: '#C9DB9C' },
  M: { base: '#B98D40', light: '#E2BE72', dark: '#7A5823', bar: '#F5E6BF', barEdge: '#5A3F14', ink: '#2B1D0C', text: '#2B1D0C', glow: '#FFE6A8' },
  C: { base: '#857A6A', light: '#B6AC9C', dark: '#4F473C', bar: '#E8E2D6', barEdge: '#2E2922', ink: '#211C16', text: '#F3EFE8', glow: '#E3DACA' },
};

/** Mana "stones": our own simple coloured circles, not the official symbols. */
export const MANA: Record<'W' | 'U' | 'B' | 'R' | 'G' | 'C', { fill: string; ring: string; ink: string; name: string }> = {
  W: { fill: '#EFE3C4', ring: '#8A6A35', ink: '#2B2014', name: 'Bílá' },
  U: { fill: '#5C8FB3', ring: '#2E4A5E', ink: '#FFFFFF', name: 'Modrá' },
  B: { fill: '#3E342D', ring: '#C99A45', ink: '#FFFFFF', name: 'Černá' },
  R: { fill: '#C4623A', ring: '#7A3518', ink: '#FFFFFF', name: 'Červená' },
  G: { fill: '#6B8A40', ring: '#3A4A22', ink: '#FFFFFF', name: 'Zelená' },
  C: { fill: '#B8AE9C', ring: '#5A4F40', ink: '#2B2014', name: 'Bezbarvá' },
};

export const RARITY: Record<string, string> = { common: '#3A3A38', uncommon: '#8FA9BA', rare: '#C99A45', mythic: '#D9652E' };

/** Colour of a card or deck frame from its colours (two or more = gold). */
export const frameFor = (colors: string[] | undefined): FrameColor => {
  const known = (colors ?? []).filter((c): c is 'W' | 'U' | 'B' | 'R' | 'G' => 'WUBRG'.includes(c));
  if (known.length === 0) return 'C';
  if (known.length > 1) return 'M';
  return known[0];
};

export const ink = {
  table: '#0B0806',
  parchment: '#EFE3C6',
  parchmentEdge: '#E0CFA8',
  text: '#24190E',
  muted: '#5A4430',
  brass: '#C99A45',
  brassLight: '#F3D9A4',
  leather: '#2B1D0C',
};

// Web loads Alegreya from Google Fonts (public/index.html); iPhone uses Palatino,
// a bookish serif every iPhone has, until the Alegreya files are bundled.
const web = Platform.OS === 'web';
export const fonts = {
  title: web ? "'Alegreya SC', Palatino, 'Book Antiqua', serif" : 'Palatino',
  serif: web ? "Alegreya, Palatino, 'Book Antiqua', serif" : 'Palatino',
  serifItalic: web ? "Alegreya, Palatino, serif" : 'Palatino-Italic',
  sans: web ? "'Alegreya Sans', system-ui, sans-serif" : undefined,
};
