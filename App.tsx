import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, DevSettings, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appRevision, isDevelopmentVersion, versionUrl } from './appVersion';
import { developmentFeatures, readDevelopmentFeatures, saveDevelopmentFeatures } from './devFeatures';
import { saveNativeAppChannel } from './nativeRuntime';
import { loadLibrary, saveLibrary } from './libraryStorage';
import { searchCards } from './scryfall';
import {
  addCard, copiesOf, createDeck, deleteDeck, emptyLibrary, entryPrice, formatPrice, listValue, markWishAcquired,
  missingForDeck, setQuantity, totalCards, updateDeck, wishMissingCards,
  type CardEntry, type CardPrinting, type DeckBoard, type Library,
} from './cardData';

type Tab = 'search' | 'collection' | 'decks' | 'wishlist' | 'profile';
const tabs: { key: Tab; label: string }[] = [
  { key: 'search', label: 'Hledat' },
  { key: 'collection', label: 'Sbírka' },
  { key: 'decks', label: 'Balíčky' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'profile', label: 'Profil' },
];

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const nowIso = () => new Date().toISOString();
const boardUpdate = (board: DeckBoard, entries: CardEntry[]) => board === 'main' ? { main: entries } : { sideboard: entries };

export default function App() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('search');
  const [library, setLibrary] = useState<Library>(emptyLibrary);
  const [loaded, setLoaded] = useState(false);
  const [features, setFeatures] = useState(readDevelopmentFeatures);
  const [openDeckId, setOpenDeckId] = useState<string | null>(null);
  const [deckPickerCard, setDeckPickerCard] = useState<CardPrinting | null>(null);
  const showPrices = features.cardPrices;

  useEffect(() => {
    void loadLibrary().then(saved => { setLibrary(saved); setLoaded(true); });
  }, []);
  // Every change is saved right away; nothing waits for a "save" button.
  useEffect(() => {
    if (loaded) void saveLibrary(library);
  }, [library, loaded]);

  const change = useCallback((update: (current: Library) => Library) => setLibrary(update), []);

  const switchVersion = () => {
    if (Platform.OS === 'web') {
      window.location.assign(versionUrl(!isDevelopmentVersion));
      return;
    }
    saveNativeAppChannel(!isDevelopmentVersion);
    DevSettings.reload();
  };

  return (
    <View style={[s.app, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      {isDevelopmentVersion && (
        <View style={s.devBand}><Text style={s.devBandText}>Testovací verze · {appRevision}</Text></View>
      )}
      <View style={s.content}>
        {!loaded ? <ActivityIndicator style={s.loading} /> : (
          <>
            {tab === 'search' && (
              <SearchScreen
                library={library}
                showPrices={showPrices}
                onAdd={(card, where) => change(lib => where === 'collection'
                  ? { ...lib, collection: addCard(lib.collection, card, { now: nowIso() }) }
                  : { ...lib, wishlist: addCard(lib.wishlist, card, { now: nowIso() }) })}
                onAddToDeck={setDeckPickerCard}
              />
            )}
            {tab === 'collection' && (
              <EntryListScreen
                title="Sbírka"
                empty="Zatím tu nic není. Najdi kartu v Hledat a přidej ji do sbírky."
                entries={library.collection}
                showPrices={showPrices}
                onQuantity={(key, quantity) => change(lib => ({ ...lib, collection: setQuantity(lib.collection, key, quantity) }))}
              />
            )}
            {tab === 'wishlist' && (
              <EntryListScreen
                title="Wishlist"
                empty="Karty, které sháníš. Přidáš je z Hledat, nebo z balíčku tlačítkem „Chybějící do wishlistu“."
                entries={library.wishlist}
                showPrices={showPrices}
                onQuantity={(key, quantity) => change(lib => ({ ...lib, wishlist: setQuantity(lib.wishlist, key, quantity) }))}
                action={{ label: 'Mám ji', onPress: key => change(lib => markWishAcquired(lib, key, nowIso())) }}
              />
            )}
            {tab === 'decks' && (
              <DecksScreen
                library={library}
                showPrices={showPrices}
                openDeckId={openDeckId}
                onOpen={setOpenDeckId}
                change={change}
              />
            )}
            {tab === 'profile' && (
              <ProfileScreen
                library={library}
                features={features}
                onFeatures={next => { saveDevelopmentFeatures(next); setFeatures(next); }}
                onSwitchVersion={switchVersion}
              />
            )}
          </>
        )}
      </View>
      <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {tabs.map(item => (
          <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} style={s.tab} onPress={() => setTab(item.key)}>
            <Text style={[s.tabText, tab === item.key && s.tabTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <Modal visible={deckPickerCard !== null} transparent animationType="fade" onRequestClose={() => setDeckPickerCard(null)}>
        <Pressable style={s.backdrop} onPress={() => setDeckPickerCard(null)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Do kterého balíčku?</Text>
            {library.decks.length === 0 && <Text style={s.muted}>Zatím nemáš žádný balíček. Založ ho v záložce Balíčky.</Text>}
            {library.decks.map(deck => (['main', 'sideboard'] as DeckBoard[]).map(board => (
              <Pressable
                key={`${deck.id}-${board}`}
                style={s.sheetRow}
                onPress={() => {
                  const card = deckPickerCard;
                  if (card) change(lib => updateDeck(lib, deck.id, d => boardUpdate(board, addCard(d[board], card, { now: nowIso() })), nowIso()));
                  setDeckPickerCard(null);
                }}
              >
                <Text style={s.rowTitle}>{deck.name}</Text>
                <Text style={s.muted}>{board === 'main' ? 'Hlavní balíček' : 'Sideboard'}</Text>
              </Pressable>
            )))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function SearchScreen({ library, showPrices, onAdd, onAddToDeck }: {
  library: Library;
  showPrices: boolean;
  onAdd: (card: CardPrinting, where: 'collection' | 'wishlist') => void;
  onAddToDeck: (card: CardPrinting) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CardPrinting[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const latest = useRef(0);

  const run = async () => {
    const ticket = ++latest.current;
    setState('loading');
    try {
      const found = await searchCards(query);
      if (ticket !== latest.current) return;
      setResults(found.slice(0, 60));
      setState('done');
    } catch {
      if (ticket === latest.current) setState('error');
    }
  };

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Hledat kartu</Text>
      <TextInput
        style={s.input}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => void run()}
        placeholder="Název karty, např. Lightning Bolt"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      <Pressable style={s.primaryButton} onPress={() => void run()}><Text style={s.primaryButtonText}>Hledat</Text></Pressable>
      {state === 'loading' && <ActivityIndicator style={s.loading} />}
      {state === 'error' && <Text style={s.error}>Hledání se nepovedlo. Zkontroluj připojení a zkus to znovu.</Text>}
      {state === 'done' && results.length === 0 && <Text style={s.muted}>Nic jsme nenašli.</Text>}
      {results.map(card => (
        <View key={card.id} style={s.card}>
          <CardRow card={card} subtitle={`${card.setName} · #${card.collectorNumber}`} price={showPrices ? card.prices.eur ?? null : undefined} />
          <Text style={s.muted}>Ve sbírce: {copiesOf(library.collection, card)} · Ve wishlistu: {copiesOf(library.wishlist, card)}</Text>
          <View style={s.actions}>
            <SmallButton label="+ Sbírka" onPress={() => onAdd(card, 'collection')} />
            <SmallButton label="+ Wishlist" onPress={() => onAdd(card, 'wishlist')} />
            <SmallButton label="+ Balíček" onPress={() => onAddToDeck(card)} />
          </View>
        </View>
      ))}
      {state === 'done' && <Text style={s.footnote}>Data o kartách: Scryfall.</Text>}
    </ScrollView>
  );
}

function EntryListScreen({ title, empty, entries, showPrices, onQuantity, action }: {
  title: string;
  empty: string;
  entries: CardEntry[];
  showPrices: boolean;
  onQuantity: (key: string, quantity: number) => void;
  action?: { label: string; onPress: (key: string) => void };
}) {
  const value = useMemo(() => listValue(entries, 'eur'), [entries]);
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.muted}>
        {totalCards(entries)} karet
        {showPrices && entries.length > 0 ? ` · hodnota ${formatPrice(value.total, 'eur')}${value.unpriced ? ` (${value.unpriced} bez ceny)` : ''}` : ''}
      </Text>
      {entries.length === 0 && <Text style={s.empty}>{empty}</Text>}
      {entries.map(entry => (
        <EntryCard key={entry.key} entry={entry} showPrices={showPrices} onQuantity={quantity => onQuantity(entry.key, quantity)} action={action && { label: action.label, onPress: () => action.onPress(entry.key) }} />
      ))}
    </ScrollView>
  );
}

function DecksScreen({ library, showPrices, openDeckId, onOpen, change }: {
  library: Library;
  showPrices: boolean;
  openDeckId: string | null;
  onOpen: (id: string | null) => void;
  change: (update: (current: Library) => Library) => void;
}) {
  const [name, setName] = useState('');
  const deck = library.decks.find(item => item.id === openDeckId);

  if (deck) {
    const missing = missingForDeck(deck, library.collection);
    const boardChange = (board: DeckBoard) => (key: string, quantity: number) =>
      change(lib => updateDeck(lib, deck.id, d => boardUpdate(board, setQuantity(d[board], key, quantity)), nowIso()));
    return (
      <ScrollView contentContainerStyle={s.screen}>
        <Pressable onPress={() => onOpen(null)}><Text style={s.link}>‹ Všechny balíčky</Text></Pressable>
        <Text style={s.title}>{deck.name}</Text>
        <Text style={s.muted}>
          Hlavní {totalCards(deck.main)} · Sideboard {totalCards(deck.sideboard)}
          {showPrices ? ` · hodnota ${formatPrice(listValue([...deck.main, ...deck.sideboard], 'eur').total, 'eur')}` : ''}
        </Text>
        {missing.length > 0 ? (
          <View style={s.notice}>
            <Text style={s.rowTitle}>Chybí ti {missing.reduce((sum, item) => sum + item.missing, 0)} karet</Text>
            <Text style={s.muted}>{missing.map(item => `${item.missing}× ${item.card.name}`).join(', ')}</Text>
            <SmallButton label="Chybějící do wishlistu" onPress={() => change(lib => wishMissingCards(lib, deck.id, nowIso()))} />
          </View>
        ) : deck.main.length > 0 ? <Text style={s.muted}>Všechny karty máš ve sbírce.</Text> : null}
        {(['main', 'sideboard'] as DeckBoard[]).map(board => (
          <View key={board} style={s.section}>
            <Text style={s.sectionTitle}>{board === 'main' ? 'Hlavní balíček' : 'Sideboard'}</Text>
            {deck[board].length === 0 && <Text style={s.muted}>Karty přidáš z Hledat tlačítkem „+ Balíček“.</Text>}
            {deck[board].map(entry => <EntryCard key={entry.key} entry={entry} showPrices={showPrices} onQuantity={q => boardChange(board)(entry.key, q)} />)}
          </View>
        ))}
        <SmallButton label="Smazat balíček" danger onPress={() => { change(lib => deleteDeck(lib, deck.id)); onOpen(null); }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Balíčky</Text>
      <View style={s.row}>
        <TextInput style={[s.input, s.grow]} value={name} onChangeText={setName} placeholder="Název nového balíčku" />
        <SmallButton label="Založit" onPress={() => {
          const id = newId();
          change(lib => createDeck(lib, name, { id, now: nowIso() }));
          setName('');
          onOpen(id);
        }} />
      </View>
      {library.decks.length === 0 && <Text style={s.empty}>Zatím žádný balíček.</Text>}
      {library.decks.map(item => (
        <Pressable key={item.id} style={s.card} onPress={() => onOpen(item.id)}>
          <Text style={s.rowTitle}>{item.name}</Text>
          <Text style={s.muted}>{totalCards(item.main)} karet · chybí {missingForDeck(item, library.collection).reduce((sum, m) => sum + m.missing, 0)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function ProfileScreen({ library, features, onFeatures, onSwitchVersion }: {
  library: Library;
  features: ReturnType<typeof readDevelopmentFeatures>;
  onFeatures: (next: ReturnType<typeof readDevelopmentFeatures>) => void;
  onSwitchVersion: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.title}>Profil</Text>
      <Text style={s.muted}>Sbírka {totalCards(library.collection)} karet · Wishlist {totalCards(library.wishlist)} · Balíčků {library.decks.length}</Text>
      <Text style={s.muted}>Data jsou zatím uložená jen v tomto {Platform.OS === 'web' ? 'prohlížeči' : 'zařízení'}.</Text>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Vývojová verze</Text>
        <SwitchRow
          title={isDevelopmentVersion ? 'Zapnuto' : 'Vypnuto'}
          description={isDevelopmentVersion ? 'Testovací data jsou oddělená od běžné verze.' : 'Přepni na testování nových změn s oddělenými daty.'}
          value={isDevelopmentVersion}
          onChange={onSwitchVersion}
        />
        <Text style={s.footnote}>Verze {appRevision}</Text>
      </View>
      {isDevelopmentVersion && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Zapínání a vypínání funkcí</Text>
          {developmentFeatures.map(feature => (
            <SwitchRow
              key={feature.key}
              title={feature.title}
              description={feature.description}
              value={features[feature.key]}
              onChange={() => onFeatures({ ...features, [feature.key]: !features[feature.key] })}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function CardRow({ card, subtitle, price }: { card: CardPrinting; subtitle: string; price?: number | null }) {
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

function EntryCard({ entry, showPrices, onQuantity, action }: {
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

function SwitchRow({ title, description, value, onChange }: { title: string; description: string; value: boolean; onChange: () => void }) {
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

function SmallButton({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" style={[s.smallButton, danger && s.dangerButton]} onPress={onPress}>
      <Text style={[s.smallButtonText, danger && s.dangerText]}>{label}</Text>
    </Pressable>
  );
}

const color = { bg: '#F6F4FA', card: '#FFFFFF', fg: '#1C1530', muted: '#625A73', line: '#E4DFEE', accent: '#5B3FA8', accentSoft: '#ECE6F8', dev: '#8A5A00', devSoft: '#FFF3DC', danger: '#B3261E' };

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: color.bg },
  content: { flex: 1 },
  loading: { marginTop: 24 },
  devBand: { backgroundColor: color.devSoft, paddingVertical: 4, alignItems: 'center' },
  devBandText: { color: color.dev, fontSize: 12, fontWeight: '700' },
  screen: { padding: 16, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: color.fg },
  input: { backgroundColor: color.card, borderColor: color.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: color.fg },
  primaryButton: { backgroundColor: color.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  card: { backgroundColor: color.card, borderColor: color.line, borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  grow: { flex: 1, minWidth: 0 },
  thumb: { width: 61, height: 85, borderRadius: 4 },
  thumbEmpty: { backgroundColor: color.accentSoft },
  rowTitle: { fontSize: 16, fontWeight: '700', color: color.fg },
  muted: { color: color.muted, fontSize: 14 },
  price: { color: color.accent, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  quantity: { minWidth: 32, textAlign: 'center', fontWeight: '700', color: color.fg },
  smallButton: { backgroundColor: color.accentSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  smallButtonText: { color: color.accent, fontWeight: '700' },
  dangerButton: { backgroundColor: '#FBE9E7' },
  dangerText: { color: color.danger },
  error: { color: color.danger },
  empty: { color: color.muted, fontSize: 15, paddingVertical: 24, textAlign: 'center' },
  footnote: { color: color.muted, fontSize: 12 },
  link: { color: color.accent, fontWeight: '700', fontSize: 15 },
  notice: { backgroundColor: color.devSoft, borderRadius: 14, padding: 12, gap: 6 },
  section: { gap: 8, marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: color.accent },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.card, borderRadius: 14, borderWidth: 1, borderColor: color.line, padding: 12 },
  switch: { width: 46, height: 28, borderRadius: 14, backgroundColor: color.line, padding: 3 },
  switchOn: { backgroundColor: color.accent },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  switchThumbOn: { transform: [{ translateX: 18 }] },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.card, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  tabText: { color: color.muted, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: color.accent, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,12,40,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 8, maxWidth: 720, width: '100%', alignSelf: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: color.fg },
  sheetRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.line },
});
