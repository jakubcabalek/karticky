// The card frame every screen lives in: name bar with "mana cost", art window,
// type line with the Kartičky set symbol, parchment text box, power/toughness box
// for the screen's main numbers, and the collector line at the bottom.
import React, { createContext, useContext } from 'react';
import { Image, Pressable, ScrollView, Text, View, StyleSheet, type ImageSourcePropType } from 'react-native';
import { FRAMES, MANA, RARITY, fonts, ink, type FrameColor } from './theme';

/** Lets a frame open the menu ("your hand") without every screen knowing about navigation. */
export const MenuContext = createContext<{ openMenu: (() => void) | null }>({ openMenu: null });

export function ManaPip({ color, size = 22 }: { color: keyof typeof MANA; size?: number }) {
  const mana = MANA[color];
  return (
    <View
      accessibilityLabel={mana.name}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: mana.fill, borderWidth: 1.5, borderColor: mana.ring, borderBottomWidth: 3 }}
    />
  );
}

export function NumberPip({ value, size = 22 }: { value: string | number; size?: number }) {
  return (
    <View style={{ minWidth: size, height: size, paddingHorizontal: 4, borderRadius: size / 2, backgroundColor: MANA.C.fill, borderWidth: 1.5, borderColor: MANA.C.ring, borderBottomWidth: 3, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.sans, fontWeight: '800', fontSize: size * 0.55, color: ink.text }}>{value}</Text>
    </View>
  );
}

/** Pips for a list of colours, e.g. a commander's colour identity. */
export function ManaCost({ colors, generic, size }: { colors?: string[]; generic?: string | number; size?: number }) {
  return (
    <View style={f.pips}>
      {generic !== undefined && <NumberPip value={generic} size={size} />}
      {(colors ?? []).filter((c): c is keyof typeof MANA => c in MANA).map((c, i) => <ManaPip key={`${c}${i}`} color={c} size={size} />)}
    </View>
  );
}

/** A tiny card silhouette: our set symbol, in the colour of the rarity. */
function SetSymbol({ rarity = 'rare' }: { rarity?: string }) {
  return (
    <View accessibilityLabel={`Vzácnost: ${rarity}`} style={[f.setSymbol, { backgroundColor: RARITY[rarity] ?? RARITY.rare }]}>
      <View style={f.setLine} /><View style={f.setLine} /><View style={[f.setLine, { width: 6 }]} />
    </View>
  );
}

/** Three tiny fanned cards: the "hand" that opens the menu. */
function HandIcon({ color }: { color: string }) {
  return (
    <View style={f.hand} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[f.handCard, { borderColor: color, transform: [{ rotate: '-18deg' }, { translateX: -5 }] }]} />
      <View style={[f.handCard, { borderColor: color }]} />
      <View style={[f.handCard, { borderColor: color, transform: [{ rotate: '18deg' }, { translateX: 5 }] }]} />
    </View>
  );
}

type Props = {
  color: FrameColor;
  name: string;
  cost?: React.ReactNode;
  /** The art window: a camera, a card image, or anything visual. Leave out for no art. */
  art?: React.ReactNode;
  artHeight?: number;
  typeLine: string;
  rarity?: string;
  /** Power/toughness box: the screen's main numbers, e.g. "12/48 €". */
  stat?: string;
  collector: string;
  /** The text box scrolls; set false when the content manages its own scrolling. */
  scroll?: boolean;
  /** Back button in the name bar instead of the menu. */
  onBack?: () => void;
  children: React.ReactNode;
};

export default function CardFrame({ color, name, cost, art, artHeight = 220, typeLine, rarity, stat, collector, scroll = true, onBack, children }: Props) {
  const frame = FRAMES[color];
  const { openMenu } = useContext(MenuContext);
  const bar = { backgroundColor: frame.bar, borderColor: frame.barEdge };
  return (
    <View style={f.table}>
      <View style={[f.frame, { backgroundColor: frame.base, borderTopColor: frame.light, borderLeftColor: frame.light, borderBottomColor: frame.dark, borderRightColor: frame.dark }]}>
        <View style={[f.bar, f.nameBar, bar]}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Zpět" hitSlop={8} onPress={onBack} style={[f.barButton, { backgroundColor: frame.barEdge }]}>
              <Text style={[f.backArrow, { color: frame.bar }]}>‹</Text>
            </Pressable>
          ) : openMenu ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Otevřít menu (tvoje ruka)" hitSlop={8} onPress={openMenu} style={[f.barButton, { backgroundColor: frame.barEdge }]}>
              <HandIcon color={frame.bar} />
            </Pressable>
          ) : null}
          <Text style={[f.name, { color: frame.ink }]} numberOfLines={1} accessibilityRole="header">{name}</Text>
          {cost}
        </View>

        {art !== undefined && (
          <View style={[f.art, { height: artHeight, borderColor: frame.barEdge }]}>{art}</View>
        )}

        <View style={[f.bar, f.typeBar, bar]}>
          <Text style={[f.typeLine, { color: frame.ink }]} numberOfLines={1}>{typeLine}</Text>
          <SetSymbol rarity={rarity} />
        </View>

        <View style={[f.textBox, { borderColor: frame.barEdge }]}>
          {scroll ? (
            <ScrollView contentContainerStyle={f.textContent} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          ) : <View style={[f.textContent, { flex: 1 }]}>{children}</View>}
        </View>

        <View style={f.footer}>
          <View style={f.collector}>
            <Text style={[f.collectorText, { color: frame.text }]}>{collector}</Text>
            <Text style={[f.collectorSmall, { color: frame.text }]}>Data o kartách: Scryfall · Kartičky</Text>
          </View>
          {stat ? (
            <View style={[f.stat, bar]}>
              <Text style={[f.statText, { color: frame.ink }]} numberOfLines={1}>{stat}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Card image (or a coloured placeholder) filling an art window. */
export function ArtImage({ uri, fallback = '#3A2C1C' }: { uri?: string; fallback?: string }) {
  const source: ImageSourcePropType | undefined = uri ? { uri } : undefined;
  return source
    ? <Image source={source} style={StyleSheet.absoluteFillObject} resizeMode="cover" accessibilityIgnoresInvertColors />
    : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: fallback }]} />;
}

/** A small card for fans and hands: frame colour, name bar, picture, type and text. */
export function MiniCard({ color, name, typeLine, text, imageUri, width = 110 }: { color: FrameColor; name: string; typeLine?: string; text?: string; imageUri?: string; width?: number }) {
  const frame = FRAMES[color];
  const height = width * 88 / 63;
  return (
    <View style={[f.mini, { width, height, backgroundColor: frame.base, borderTopColor: frame.light, borderLeftColor: frame.light, borderBottomColor: frame.dark, borderRightColor: frame.dark }]}>
      <View style={[f.miniBar, { backgroundColor: frame.bar, borderColor: frame.barEdge }]}>
        <Text style={[f.miniName, { color: frame.ink }]} numberOfLines={1}>{name}</Text>
      </View>
      <View style={[f.miniArt, { height: height * 0.42, borderColor: frame.barEdge, backgroundColor: frame.glow }]}>
        {imageUri ? <ArtImage uri={imageUri} /> : <Text style={[f.miniInitial, { color: frame.barEdge }]}>{name.slice(0, 1)}</Text>}
      </View>
      {typeLine ? (
        <View style={[f.miniBar, { backgroundColor: frame.bar, borderColor: frame.barEdge }]}>
          <Text style={[f.miniType, { color: frame.ink }]} numberOfLines={1}>{typeLine}</Text>
        </View>
      ) : null}
      <View style={f.miniText}>
        {text ? <Text style={f.miniTextBody} numberOfLines={3}>{text}</Text> : null}
      </View>
    </View>
  );
}

const f = StyleSheet.create({
  table: { flex: 1, backgroundColor: ink.table, padding: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  frame: { flex: 1, borderRadius: 20, borderWidth: 2, padding: 9, gap: 7 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderRadius: 16, paddingHorizontal: 10, borderBottomWidth: 3 },
  nameBar: { minHeight: 48, paddingLeft: 6 },
  typeBar: { minHeight: 38, marginHorizontal: 2 },
  barButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, lineHeight: 30, fontWeight: '700', marginTop: -2 },
  name: { flex: 1, fontFamily: fonts.title, fontWeight: '700', fontSize: 22 },
  pips: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  art: { marginHorizontal: 6, borderWidth: 2, borderRadius: 3, overflow: 'hidden', backgroundColor: '#1A130D' },
  typeLine: { flex: 1, fontFamily: fonts.title, fontWeight: '700', fontSize: 16 },
  setSymbol: { width: 16, height: 21, borderRadius: 3, borderWidth: 1.5, borderColor: '#1A120A', padding: 2, gap: 2, justifyContent: 'center' },
  setLine: { height: 1.5, width: 9, backgroundColor: '#1A120A', borderRadius: 1 },
  textBox: { flex: 1, minHeight: 120, marginHorizontal: 6, borderWidth: 2, borderRadius: 3, backgroundColor: ink.parchment, overflow: 'hidden' },
  textContent: { padding: 14, gap: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingHorizontal: 8 },
  collector: { flex: 1 },
  collectorText: { fontFamily: fonts.sans, fontWeight: '700', fontSize: 10, letterSpacing: 0.8 },
  collectorSmall: { fontFamily: fonts.sans, fontSize: 9, opacity: 0.85 },
  stat: { flexDirection: 'row', minWidth: 86, minHeight: 40, paddingHorizontal: 12, borderWidth: 2, borderBottomWidth: 3, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statText: { fontFamily: fonts.title, fontWeight: '700', fontSize: 19 },
  hand: { width: 26, height: 22, alignItems: 'center', justifyContent: 'center' },
  handCard: { position: 'absolute', width: 11, height: 16, borderRadius: 2, borderWidth: 2 },
  mini: { borderRadius: 8, borderWidth: 1.5, padding: 4, gap: 3, overflow: 'hidden' },
  miniBar: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  miniName: { fontFamily: fonts.title, fontWeight: '700', fontSize: 12 },
  miniType: { fontFamily: fonts.sans, fontWeight: '700', fontSize: 9 },
  miniArt: { borderWidth: 1, borderRadius: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  miniInitial: { fontFamily: fonts.title, fontWeight: '700', fontSize: 30 },
  miniText: { flex: 1, backgroundColor: ink.parchment, borderRadius: 2, padding: 4 },
  miniTextBody: { fontFamily: fonts.serif, fontSize: 10, lineHeight: 12, color: ink.text },
});
