// Navigation: on a computer a sidebar on the left; on a phone a header with the
// section name, a menu button that opens a side drawer, and a quick scan button.
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from './ui';

export type Section = 'scan' | 'search' | 'collection' | 'decks' | 'wishlist' | 'life' | 'profile';

type Item = { key: Section; label: string; icon: string; hint: string };
export const NAV_GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Karty', items: [
    { key: 'scan', label: 'Skenovat', icon: '◉', hint: 'Namiř fotoaparát na kartu' },
    { key: 'search', label: 'Hledat', icon: '⌕', hint: 'Najdi kartu podle názvu' },
  ] },
  { title: 'Moje', items: [
    { key: 'collection', label: 'Sbírka', icon: '▤', hint: 'Karty, které máš' },
    { key: 'decks', label: 'Balíčky', icon: '❏', hint: 'Commander i 60 karet' },
    { key: 'wishlist', label: 'Wishlist', icon: '♡', hint: 'Karty, které sháníš' },
  ] },
  { title: 'Hra', items: [
    { key: 'life', label: 'Životy', icon: '♥', hint: 'Počítání životů u stolu' },
  ] },
];
const PROFILE: Item = { key: 'profile', label: 'Profil a účet', icon: '☺', hint: 'Přihlášení, nastavení' };
export const sectionLabel = (key: Section) =>
  [...NAV_GROUPS.flatMap(group => group.items), PROFILE].find(item => item.key === key)?.label ?? '';

export const WIDE_LAYOUT = 900;

type Props = {
  section: Section;
  onSection: (section: Section) => void;
  /** Small numbers next to items, e.g. cards in the collection, cheaper wishlist cards. */
  badges?: Partial<Record<Section, string>>;
  children: React.ReactNode;
};

export default function AppFrame({ section, onSection, badges = {}, children }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [drawer, setDrawer] = useState(false);
  const go = (key: Section) => { onSection(key); setDrawer(false); };

  if (width >= WIDE_LAYOUT) {
    return (
      <View style={n.wide}>
        <View style={n.sidebar}>
          <Text style={n.brand}>Kartičky<Text style={n.brandDot}>.</Text></Text>
          <NavList section={section} badges={badges} onPick={go} />
        </View>
        <View style={n.main}>{children}</View>
      </View>
    );
  }

  return (
    <View style={n.narrow}>
      <View style={n.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Otevřít menu" hitSlop={10} style={n.headerButton} onPress={() => setDrawer(true)}>
          <View style={n.burgerLine} /><View style={n.burgerLine} /><View style={n.burgerLine} />
        </Pressable>
        <Text style={n.headerTitle} numberOfLines={1}>{sectionLabel(section)}</Text>
        {section !== 'scan' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Skenovat kartu" hitSlop={10} style={n.scanButton} onPress={() => go('scan')}>
            <Text style={n.scanButtonText}>◉ Skenovat</Text>
          </Pressable>
        ) : <View style={n.headerSpacer} />}
      </View>
      <View style={n.main}>{children}</View>

      <Modal visible={drawer} transparent animationType="fade" onRequestClose={() => setDrawer(false)}>
        <View style={n.drawerRoot}>
          <View style={[n.drawer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
            <Text style={n.brand}>Kartičky<Text style={n.brandDot}>.</Text></Text>
            <NavList section={section} badges={badges} onPick={go} showHints />
          </View>
          <Pressable style={n.drawerShade} accessibilityLabel="Zavřít menu" onPress={() => setDrawer(false)} />
        </View>
      </Modal>
    </View>
  );
}

function NavList({ section, badges, onPick, showHints = false }: { section: Section; badges: Partial<Record<Section, string>>; onPick: (key: Section) => void; showHints?: boolean }) {
  const row = (item: Item) => {
    const active = item.key === section;
    return (
      <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onPick(item.key)} style={[n.item, active && n.itemActive]}>
        <Text style={[n.icon, active && n.textActive]}>{item.icon}</Text>
        <View style={n.itemText}>
          <Text style={[n.label, active && n.textActive]}>{item.label}</Text>
          {showHints && <Text style={n.hint}>{item.hint}</Text>}
        </View>
        {badges[item.key] ? <Text style={n.badge}>{badges[item.key]}</Text> : null}
      </Pressable>
    );
  };
  return (
    <ScrollView contentContainerStyle={n.list}>
      {NAV_GROUPS.map(group => (
        <View key={group.title} style={n.group}>
          <Text style={n.groupTitle}>{group.title}</Text>
          {group.items.map(row)}
        </View>
      ))}
      <View style={n.group}>{row(PROFILE)}</View>
    </ScrollView>
  );
}

const n = StyleSheet.create({
  wide: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 248, backgroundColor: color.card, borderRightWidth: 1, borderRightColor: color.line, paddingTop: 24, paddingHorizontal: 12 },
  narrow: { flex: 1 },
  main: { flex: 1 },
  brand: { fontSize: 22, fontWeight: '800', color: color.fg, letterSpacing: -0.5, paddingHorizontal: 12, marginBottom: 12 },
  brandDot: { color: color.accent },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12, backgroundColor: color.card, borderBottomWidth: 1, borderBottomColor: color.line },
  headerButton: { width: 32, height: 32, justifyContent: 'center', gap: 4 },
  burgerLine: { height: 2.5, width: 22, borderRadius: 2, backgroundColor: color.fg },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: color.fg },
  headerSpacer: { width: 32 },
  scanButton: { backgroundColor: color.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  scanButtonText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  drawerRoot: { flex: 1, flexDirection: 'row' },
  drawer: { width: 290, maxWidth: '85%', backgroundColor: color.card, paddingHorizontal: 12 },
  drawerShade: { flex: 1, backgroundColor: 'rgba(20,12,40,0.45)' },
  list: { gap: 14, paddingBottom: 24 },
  group: { gap: 2 },
  groupTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', color: color.muted, paddingHorizontal: 12, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  itemActive: { backgroundColor: color.accentSoft },
  icon: { width: 22, textAlign: 'center', fontSize: 17, color: color.muted },
  itemText: { flex: 1 },
  label: { fontSize: 16, fontWeight: '700', color: color.fg },
  hint: { fontSize: 12, color: color.muted },
  textActive: { color: color.accent },
  badge: { fontSize: 12, fontWeight: '800', color: color.accent, backgroundColor: color.accentSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
});
