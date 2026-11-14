// Navigation as "your hand": the button in every card's name bar opens a hand of
// cards, one per section. Tap a card to play it. Every screen is a card itself
// (cardFrame.tsx), in the colour of its section.
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MenuContext, MiniCard } from './cardFrame';
import { FRAMES, fonts, ink, type FrameColor } from './theme';

export type Section = 'scan' | 'search' | 'collection' | 'decks' | 'wishlist' | 'life' | 'profile';

type Item = { key: Section; label: string; type: string; hint: string; color: FrameColor };
export const NAV_ITEMS: Item[] = [
  { key: 'scan', label: 'Skenovat', type: 'Instant — Kamera', hint: 'Namiř fotoaparát na kartu.', color: 'U' },
  { key: 'search', label: 'Hledat', type: 'Sorcery — Věštba', hint: 'Najdi kartu podle názvu.', color: 'U' },
  { key: 'collection', label: 'Sbírka', type: 'Artifact — Truhla', hint: 'Karty, které máš.', color: 'C' },
  { key: 'decks', label: 'Balíčky', type: 'Legendary — Balíček', hint: 'Commander i 60 karet.', color: 'M' },
  { key: 'wishlist', label: 'Wishlist', type: 'Enchantment — Přání', hint: 'Karty, které sháníš.', color: 'G' },
  { key: 'life', label: 'Životy', type: 'Instant — Souboj', hint: 'Počítání životů u stolu.', color: 'R' },
  { key: 'profile', label: 'Profil', type: 'Planeswalker — Ty', hint: 'Účet a nastavení.', color: 'W' },
];
export const navItem = (key: Section) => NAV_ITEMS.find(item => item.key === key) ?? NAV_ITEMS[0];
export const sectionLabel = (key: Section) => navItem(key).label;

type Props = {
  section: Section;
  onSection: (section: Section) => void;
  /** Small notes on the cards, e.g. cards in the collection, cheaper wishlist cards. */
  badges?: Partial<Record<Section, string>>;
  children: React.ReactNode;
};

export default function AppFrame({ section, onSection, badges = {}, children }: Props) {
  const [open, setOpen] = useState(false);
  const menu = useMemo(() => ({ openMenu: () => setOpen(true) }), []);
  const go = (key: Section) => { onSection(key); setOpen(false); };
  return (
    <MenuContext.Provider value={menu}>
      <View style={n.main}>{children}</View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Hand section={section} badges={badges} onPick={go} onClose={() => setOpen(false)} />
      </Modal>
    </MenuContext.Provider>
  );
}

function Hand({ section, badges, onPick, onClose }: { section: Section; badges: Partial<Record<Section, string>>; onPick: (key: Section) => void; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Two rows of cards held in a fan: four on top, three below.
  const rows = [NAV_ITEMS.slice(0, 4), NAV_ITEMS.slice(4)];
  const cardWidth = Math.min(120, Math.floor((Math.min(width, 560) - 40) / 4));
  return (
    <View style={[n.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Zavřít menu" onPress={onClose} />
      <Text style={n.title}>Tvoje ruka</Text>
      <Text style={n.subtitle}>Zahraj kartu, kam chceš jít.</Text>
      {rows.map((row, r) => (
        <View key={r} style={n.row} pointerEvents="box-none">
          {row.map((item, i) => {
            const middle = (row.length - 1) / 2;
            const offset = i - middle;
            const active = item.key === section;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}. ${item.hint}${badges[item.key] ? ` ${badges[item.key]}` : ''}`}
                accessibilityState={{ selected: active }}
                onPress={() => onPick(item.key)}
                style={({ pressed }) => [
                  n.card,
                  { transform: [{ translateY: Math.abs(offset) * 8 - (active || pressed ? 14 : 0) }, { rotate: `${offset * 5}deg` }] },
                  active && { shadowColor: FRAMES[item.color].glow, shadowOpacity: 0.9, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
                ]}
              >
                <MiniCard
                  color={item.color}
                  name={item.label}
                  typeLine={item.type}
                  text={badges[item.key] ? `${item.hint} ${badges[item.key]}.` : item.hint}
                  width={cardWidth}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
      <Pressable accessibilityRole="button" onPress={onClose} style={n.close}>
        <Text style={n.closeText}>Zpět ke hře</Text>
      </Pressable>
    </View>
  );
}

const n = StyleSheet.create({
  main: { flex: 1 },
  root: { flex: 1, backgroundColor: 'rgba(11,8,6,0.92)', justifyContent: 'center', alignItems: 'center', gap: 18 },
  title: { fontFamily: fonts.title, fontWeight: '700', fontSize: 28, color: ink.brassLight },
  subtitle: { fontFamily: fonts.serifItalic, fontStyle: 'italic', fontSize: 15, color: ink.parchmentEdge, marginTop: -12 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  card: { borderRadius: 8 },
  close: { marginTop: 8, borderWidth: 1.5, borderColor: ink.brass, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  closeText: { fontFamily: fonts.title, fontWeight: '700', fontSize: 15, color: ink.brassLight },
});
