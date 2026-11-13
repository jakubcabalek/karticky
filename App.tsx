import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, DevSettings, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appRevision, isDevelopmentVersion, versionUrl } from './appVersion';
import { developmentFeatures, readDevelopmentFeatures, saveDevelopmentFeatures } from './devFeatures';
import { saveNativeAppChannel } from './nativeRuntime';
import { loadLibrary, saveLibrary } from './libraryStorage';
import { fetchCollection, searchCards } from './scryfall';
import ScanScreen from './ScanScreen';
import DecksScreen, { BOARD_NAMES, boardsFor } from './DecksScreen';
import WishlistScreen from './WishlistScreen';
import ShopPrices from './ShopPrices';
import CardExplain from './CardExplain';
import LifeScreen from './LifeScreen';
import Account, { type SyncState } from './Account';
import { listenForSignInLinks, readCloudLibrary, supabase, writeCloudLibrary, type Session } from './cloud';
import { CardRow, EntryCard, SmallButton, SwitchRow, s } from './ui';
import {
  addCard, boardChange, copiesOf, createDeck, emptyLibrary, formatPrice, libraryCardIds, listValue, markWishAcquired, mergeLibraries,
  priceAlerts, pricesAreStale, recordDeletions, refreshCards, sameLibrary, setTargetPrice,
  setQuantity, totalCards, updateDeck,
  type CardEntry, type CardPrinting, type Library,
} from './cardData';

type Tab = 'scan' | 'search' | 'collection' | 'decks' | 'wishlist' | 'life' | 'profile';
const allTabs: { key: Tab; label: string }[] = [
  { key: 'scan', label: 'Skenovat' },
  { key: 'search', label: 'Hledat' },
  { key: 'collection', label: 'Sbírka' },
  { key: 'decks', label: 'Balíčky' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'life', label: 'Životy' },
  { key: 'profile', label: 'Profil' },
];

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const nowIso = () => new Date().toISOString();

export default function App() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('search');
  const [library, setLibrary] = useState<Library>(emptyLibrary);
  const [loaded, setLoaded] = useState(false);
  const [features, setFeatures] = useState(readDevelopmentFeatures);
  const [openDeckId, setOpenDeckId] = useState<string | null>(null);
  const [deckPickerCard, setDeckPickerCard] = useState<CardPrinting | null>(null);
  const showPrices = true;
  const tabs = allTabs;

  useEffect(() => {
    void loadLibrary().then(saved => { setLibrary(saved); setLoaded(true); });
  }, []);
  // Every change is saved right away; nothing waits for a "save" button.
  useEffect(() => {
    if (loaded) void saveLibrary(library);
  }, [library, loaded]);

  // Prices change once a day on Scryfall: refresh the whole library at most once a day.
  useEffect(() => {
    if (!loaded || !pricesAreStale(library, nowIso())) return;
    const ids = libraryCardIds(library);
    if (!ids.length) return;
    void fetchCollection(ids.map(id => ({ id })))
      .then(({ found }) => setLibrary(current => refreshCards(current, found, nowIso())))
      .catch(() => undefined);
    // Once per load; the stamp stops it from repeating.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const alerts = priceAlerts(library.wishlist).length;
  const change = useCallback((update: (current: Library) => Library) => setLibrary(current => recordDeletions(current, update(current), nowIso())), []);

  // ---- Account and sync: optional; signed in, the library is the same on every device ----
  const [session, setSession] = useState<Session | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('off');
  const [authError, setAuthError] = useState('');
  const libraryRef = useRef(library);
  useEffect(() => { libraryRef.current = library; }, [library]);
  const revision = useRef<number | null>(null);
  const lastSynced = useRef<Library | null>(null);
  const syncedUser = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const stopLinks = listenForSignInLinks(setAuthError);
    return () => { subscription.unsubscribe(); stopLinks(); };
  }, []);

  const push = useCallback(async (userId: string): Promise<void> => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = libraryRef.current;
      if (lastSynced.current && sameLibrary(current, lastSynced.current)) { setSyncState('synced'); return; }
      setSyncState('syncing');
      const result = await writeCloudLibrary(userId, revision.current, current);
      if ('saved' in result) {
        revision.current = result.saved.revision;
        lastSynced.current = current;
        setSyncState('synced');
        return;
      }
      // Another device saved in between: merge its version in and try again.
      revision.current = result.conflict?.revision ?? null;
      if (result.conflict) {
        const merged = mergeLibraries(libraryRef.current, result.conflict.library);
        libraryRef.current = merged;
        setLibrary(merged);
      }
    }
    setSyncState('error');
  }, []);

  const pull = useCallback(async (userId: string) => {
    setSyncState('syncing');
    try {
      const remote = await readCloudLibrary(userId);
      revision.current = remote?.revision ?? null;
      if (remote) {
        const merged = mergeLibraries(libraryRef.current, remote.library);
        lastSynced.current = remote.library;
        libraryRef.current = merged;
        setLibrary(merged);
      } else {
        lastSynced.current = null;
      }
      await push(userId);
    } catch {
      setSyncState('error');
    }
  }, [push]);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!loaded) return;
    if (!userId) { syncedUser.current = null; revision.current = null; lastSynced.current = null; return; }
    if (syncedUser.current === userId) return;
    syncedUser.current = userId;
    void pull(userId);
  }, [loaded, userId, pull]);

  // Changes go to the account a moment after the last tap; coming back to the app fetches the other devices' changes.
  useEffect(() => {
    if (!loaded || !userId || syncedUser.current !== userId) return;
    const timer = setTimeout(() => { void push(userId).catch(() => setSyncState('error')); }, 1500);
    return () => clearTimeout(timer);
  }, [library, loaded, userId, push]);
  useEffect(() => {
    if (!userId) return;
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void pull(userId); });
    return () => subscription.remove();
  }, [userId, pull]);

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
            {tab === 'scan' && (
              <ScanScreen
                decks={library.decks}
                onCreateDeck={name => {
                  const id = newId();
                  change(lib => createDeck(lib, name, { id, now: nowIso() }));
                  return id;
                }}
                onAdd={(card, target, finish) => change(lib => {
                  const options = { finish, now: nowIso() };
                  if (target.kind === 'collection') return { ...lib, collection: addCard(lib.collection, card, options) };
                  if (target.kind === 'wishlist') return { ...lib, wishlist: addCard(lib.wishlist, card, options) };
                  return updateDeck(lib, target.deckId, deck => boardChange(target.board, addCard(deck[target.board], card, options)), nowIso());
                })}
              />
            )}
            {tab === 'search' && (
              <SearchScreen
                library={library}
                showPrices={showPrices}
                showShopPrices
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
              <WishlistScreen
                entries={library.wishlist}
                showPrices={showPrices}
                pricesUpdatedAt={library.pricesUpdatedAt}
                onQuantity={(key, quantity) => change(lib => ({ ...lib, wishlist: setQuantity(lib.wishlist, key, quantity) }))}
                onTarget={(key, target) => change(lib => ({ ...lib, wishlist: setTargetPrice(lib.wishlist, key, target) }))}
                onAcquired={key => change(lib => markWishAcquired(lib, key, nowIso()))}
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
            {tab === 'life' && <LifeScreen />}
            {tab === 'profile' && (
              <ProfileScreen
                account={<Account session={session} syncState={syncState} externalError={authError} />}
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
            <Text style={[s.tabText, tab === item.key && s.tabTextActive]}>{item.label}{item.key === 'wishlist' && alerts ? ` (${alerts})` : ''}</Text>
          </Pressable>
        ))}
      </View>
      <Modal visible={deckPickerCard !== null} transparent animationType="fade" onRequestClose={() => setDeckPickerCard(null)}>
        <Pressable style={s.backdrop} onPress={() => setDeckPickerCard(null)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Do kterého balíčku?</Text>
            {library.decks.length === 0 && <Text style={s.muted}>Zatím nemáš žádný balíček. Založ ho v záložce Balíčky.</Text>}
            {library.decks.map(deck => boardsFor(deck).map(board => (
              <Pressable
                key={`${deck.id}-${board}`}
                style={s.sheetRow}
                onPress={() => {
                  const card = deckPickerCard;
                  if (card) change(lib => updateDeck(lib, deck.id, d => boardChange(board, addCard(d[board], card, { now: nowIso() })), nowIso()));
                  setDeckPickerCard(null);
                }}
              >
                <Text style={s.rowTitle}>{deck.name}</Text>
                <Text style={s.muted}>{BOARD_NAMES[board]}</Text>
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
          <CardExplain card={card} />
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

function ProfileScreen({ account, library, features, onFeatures, onSwitchVersion }: {
  account: React.ReactNode;
  library: Library;
  features: ReturnType<typeof readDevelopmentFeatures>;
  onFeatures: (next: ReturnType<typeof readDevelopmentFeatures>) => void;
  onSwitchVersion: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.title}>Profil</Text>
      <Text style={s.muted}>Sbírka {totalCards(library.collection)} karet · Wishlist {totalCards(library.wishlist)} · Balíčků {library.decks.length}</Text>
      {account}
      {isDevelopmentVersion && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Vývojová verze</Text>
          <SwitchRow
            title="Zapnuto"
            description="Testovací data jsou oddělená od běžné verze."
            value
            onChange={onSwitchVersion}
          />
        </View>
      )}
      <Text style={s.footnote}>Verze {appRevision}</Text>
      {isDevelopmentVersion && developmentFeatures.length > 0 && (
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
