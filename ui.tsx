// Shared building blocks and styles for every screen.
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, ink } from './theme';
import { entryPrice, formatPrice, type CardEntry, type CardPrinting } from './cardData';

export function CardRow({ card, subtitle, price }: { card: CardPrinting; subtitle: string; price?: number | null }) {
  return (
    <View style={s.row}>
      {card.imageSmall ? <Image source={{ uri: card.imageSmall }} style={s.thumb} accessibilityIgnoresInvertColors /> : <View style={[s.thumb, s.thumbEmpty]} />}
      <View style={s.grow}>
        <Text style={s.rowTitle}>{card.printedName ?? card.name}</Text>
        <Text style={s.muted}>{subtitle}</Text>
        <Text style={s.muted}>{card.typeLine}</Text>
        {price !== undefined && <Text style={s.price}>{price === null ? 'Bez ceny' : formatPrice(price, 'eur')}</Text>}
      </View>
    </View>
  );
}

export function EntryCard({ entry, showPrices, onQuantity, action }: {
  entry: CardEntry;
  showPrices: boolean;
  onQuantity: (quantity: number) => void;
  action?: { label: string; onPress: () => void };
}) {
  const subtitle = `${entry.card.setName} · #${entry.card.collectorNumber}${entry.finish === 'foil' ? ' · foil' : ''}`;
  return (
    <View style={s.card}>
      <CardRow card={entry.card} subtitle={subtitle} price={showPrices ? entryPrice(entry, 'eur') : undefined} />
      <View style={s.actions}>
        <SmallButton label="−" onPress={() => onQuantity(entry.quantity - 1)} />
        <Text style={s.quantity}>{entry.quantity}×</Text>
        <SmallButton label="+" onPress={() => onQuantity(entry.quantity + 1)} />
        {action && <SmallButton label={action.label} onPress={action.onPress} />}
      </View>
    </View>
  );
}

export function SwitchRow({ title, description, value, onChange }: { title: string; description: string; value: boolean; onChange: () => void }) {
  return (
    <Pressable style={s.switchRow} accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={onChange}>
      <View style={s.grow}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.muted}>{description}</Text>
      </View>
      <View style={[s.switch, value && s.switchOn]}><View style={[s.switchThumb, value && s.switchThumbOn]} /></View>
    </Pressable>
  );
}

export function SmallButton({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" style={[s.smallButton, danger && s.dangerButton]} onPress={onPress}>
      <Text style={[s.smallButtonText, danger && s.dangerText]}>{label}</Text>
    </Pressable>
  );
}

export const color = { bg: ink.parchment, card: '#F8F0DC', fg: ink.text, muted: ink.muted, line: '#CDBB94', accent: '#7A4E1C', accentSoft: '#E6D3A8', dev: '#8A5A00', devSoft: '#F3E3B8', danger: '#9E2B1B' };

export const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: ink.table },
  content: { flex: 1 },
  loading: { marginTop: 24 },
  devBand: { backgroundColor: color.devSoft, paddingVertical: 4, alignItems: 'center' },
  devBandText: { color: color.dev, fontSize: 12, fontWeight: '700' },
  screen: { padding: 14, gap: 12, width: '100%' },
  title: { fontFamily: fonts.title, fontSize: 22, fontWeight: '700', color: color.fg },
  input: { backgroundColor: color.card, borderColor: color.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: color.fg },
  primaryButton: { backgroundColor: ink.leather, borderColor: ink.brass, borderWidth: 1.5, borderBottomWidth: 3, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryButtonText: { color: ink.brassLight, fontFamily: fonts.title, fontWeight: '700', fontSize: 17, letterSpacing: 0.5 },
  card: { backgroundColor: color.card, borderColor: color.line, borderWidth: 1, borderBottomWidth: 2, borderRadius: 10, padding: 12, gap: 8 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  grow: { flex: 1, minWidth: 0 },
  thumb: { width: 61, height: 85, borderRadius: 4 },
  thumbEmpty: { backgroundColor: color.accentSoft },
  rowTitle: { fontFamily: fonts.title, fontSize: 17, fontWeight: '700', color: color.fg },
  muted: { color: color.muted, fontSize: 14 },
  price: { color: color.accent, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  quantity: { minWidth: 32, textAlign: 'center', fontWeight: '700', color: color.fg },
  smallButton: { backgroundColor: color.accentSoft, borderColor: '#B89A62', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  smallButtonText: { color: color.accent, fontWeight: '700' },
  dangerButton: { backgroundColor: '#FBE9E7' },
  dangerText: { color: color.danger },
  error: { color: color.danger },
  empty: { fontFamily: fonts.serifItalic, fontStyle: 'italic', color: color.muted, fontSize: 16, paddingVertical: 24, textAlign: 'center' },
  footnote: { color: color.muted, fontSize: 12 },
  link: { color: color.accent, fontWeight: '700', fontSize: 15 },
  notice: { backgroundColor: color.devSoft, borderRadius: 14, padding: 12, gap: 6 },
  section: { gap: 8, marginTop: 8 },
  sectionTitle: { fontFamily: fonts.title, fontSize: 15, fontWeight: '700', letterSpacing: 0.6, color: color.accent, borderBottomWidth: 1, borderBottomColor: color.line, paddingBottom: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.card, borderRadius: 14, borderWidth: 1, borderColor: color.line, padding: 12 },
  switch: { width: 46, height: 28, borderRadius: 14, backgroundColor: color.line, padding: 3 },
  switchOn: { backgroundColor: ink.leather },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF8E8' },
  switchThumbOn: { transform: [{ translateX: 18 }] },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.card, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  tabText: { color: color.muted, fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: color.accent, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(11,8,6,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: ink.parchment, borderTopWidth: 3, borderColor: ink.brass, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 8, maxWidth: 720, width: '100%', alignSelf: 'center' },
  sheetTitle: { fontFamily: fonts.title, fontSize: 20, fontWeight: '700', color: color.fg },
  badge: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  badgeOk: { backgroundColor: '#E6F2EB', color: '#167C55' },
  badgeUnsure: { backgroundColor: color.devSoft, color: color.dev },
  chip: { borderWidth: 1, borderColor: color.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: color.card },
  chipActive: { backgroundColor: ink.leather, borderColor: ink.brass },
  chipText: { color: color.fg, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: ink.brassLight },
  camera: { width: '100%', backgroundColor: '#000', borderRadius: 14, overflow: 'hidden', position: 'relative' },
  cameraGuide: { position: 'absolute', borderWidth: 3, borderColor: '#F6D478', borderRadius: 12 },
  cameraGuideSeeing: { borderColor: '#5FC596' },
  liveHint: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center' },
  liveHintText: { color: '#fff', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, fontWeight: '700', overflow: 'hidden' },
  shop: { gap: 6, borderTopWidth: 1, borderTopColor: color.line, paddingTop: 8 },
  offer: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  soldOut: { opacity: 0.55 },
  explain: { gap: 8, backgroundColor: '#E9DBB9', borderRadius: 12, padding: 12 },
  oracle: { fontFamily: fonts.serif, color: color.fg, fontSize: 16, lineHeight: 22 },
  keyword: { gap: 2, borderLeftWidth: 3, borderLeftColor: color.accent, paddingLeft: 10 },
  keywordTerm: { color: color.fg, fontWeight: '800', fontSize: 15 },
  targetOption: { backgroundColor: color.card, borderColor: color.line, borderWidth: 1, borderRadius: 16, padding: 16, gap: 4 },
  targetOptionActive: { borderColor: color.accent, borderWidth: 2 },
  targetBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: color.accentSoft, borderRadius: 12, padding: 12 },
  providerButton: { borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  providerText: { fontWeight: '700', fontSize: 16 },
  divider: { textAlign: 'center', marginVertical: 4 },
  warning: { color: color.dev, fontWeight: '700', fontSize: 13 },
  ok: { color: '#167C55', fontWeight: '700', fontSize: 13 },
  okBox: { backgroundColor: '#E6F2EB', borderRadius: 14, padding: 12, gap: 6 },
  curve: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 130, paddingTop: 8 },
  curveColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  curveBar: { width: '100%', backgroundColor: color.accent, borderRadius: 6 },
  textArea: { minHeight: 180, textAlignVertical: 'top' },
  alert: { backgroundColor: '#E6F2EB', borderRadius: 14, padding: 12, gap: 4 },
  targetInput: { backgroundColor: color.card, borderColor: color.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, width: 90, color: color.fg },
  sheetRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.line },
});
