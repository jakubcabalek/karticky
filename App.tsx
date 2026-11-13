import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, DevSettings, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appRevision, isDevelopmentVersion, versionUrl } from './appVersion';
import { developmentFeatures, readDevelopmentFeatures, saveDevelopmentFeatures } from './devFeatures';
import { saveNativeAppChannel } from './nativeRuntime';
import { loadLibrary, saveLibrary } from './libraryStorage';
import { searchCards } from './scryfall';
import ScanScreen from './ScanScreen';
import ShopPrices from './ShopPrices';
import { CardRow, EntryCard, SmallButton, SwitchRow, s } from './ui';
import {
  addCard, copiesOf, createDeck, deleteDeck, emptyLibrary, formatPrice, listValue, markWishAcquired,
  missingForDeck, setQuantity, totalCards, updateDeck, wishMissingCards,
  type CardEntry, type CardPrinting, type DeckBoard, type Library,
} from './cardData';

type Tab = 'scan' | 'search' | 'collection' | 'decks' | 'wishlist' | 'profile';
const allTabs: { key: Tab; label: string }[] = [
  { key: 'scan', label: 'Skenovat' },
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
  const tabs = allTabs.filter(item => item.key !== 'scan' || features.cardScanner);

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
            {tab === 'scan' && features.cardScanner && (
              <ScanScreen
                onAdd={(card, where, finish) => change(lib => where === 'collection'
                  ? { ...lib, collection: addCard(lib.collection, card, { finish, now: nowIso() }) }
                  : { ...lib, wishlist: addCard(lib.wishlist, card, { finish, now: nowIso() }) })}
                onAddToDeck={setDeckPickerCard}
              />
            )}
            {tab === 'search' && (
              <SearchScreen
                library={library}
                showPrices={showPrices}
                showShopPrices={features.shopPrices}
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

function SearchScreen({ library, showPrices, showShopPrices, onAdd, onAddToDeck }: {
  library: Library;
  showPrices: boolean;
  showShopPrices: boolean;
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
          {showShopPrices && <ShopPrices card={card} />}
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
