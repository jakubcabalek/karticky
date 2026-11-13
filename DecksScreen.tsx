// "Balíčky": decks with a format (Commander by default), commander / main / sideboard,
// statistics, legality, import of a pasted decklist and export for Moxfield/Archidekt/Arena.
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import {
  DECK_BOARDS, DECK_FORMATS, boardChange, createDeck, deckEntries, deleteDeck, formatPrice, listValue, missingForDeck,
  refreshCards, setQuantity, totalCards, updateDeck, wishMissingCards,
  type Deck, type DeckBoard, type DeckFormat, type Library,
} from './cardData';
import { COLOR_NAMES, TYPE_NAMES, deckProblems, deckStats } from './deckStats';
import { deckToText, importDecklist } from './deckText';
import { fetchCollection } from './scryfall';
import { EntryCard, SmallButton, color, s } from './ui';

export const BOARD_NAMES: Record<DeckBoard, string> = { commander: 'Velitel', main: 'Hlavní balíček', sideboard: 'Sideboard' };
export const boardsFor = (deck: Deck): DeckBoard[] => deck.format === 'commander' ? ['commander', 'main'] : ['main', 'sideboard'];

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const nowIso = () => new Date().toISOString();

type Props = {
  library: Library;
  showPrices: boolean;
  openDeckId: string | null;
  onOpen: (id: string | null) => void;
  change: (update: (current: Library) => Library) => void;
};

export default function DecksScreen({ library, showPrices, openDeckId, onOpen, change }: Props) {
  const [name, setName] = useState('');
  const [format, setFormat] = useState<DeckFormat>('commander');
  const deck = library.decks.find(item => item.id === openDeckId);
  if (deck) return <DeckDetail deck={deck} library={library} showPrices={showPrices} onBack={() => onOpen(null)} change={change} />;

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Balíčky</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Název nového balíčku" />
      <FormatChips value={format} onChange={setFormat} />
      <SmallButton label="Založit balíček" onPress={() => {
        const id = newId();
        change(lib => createDeck(lib, name, { id, now: nowIso(), format }));
        setName('');
        onOpen(id);
      }} />
      {library.decks.length === 0 && <Text style={s.empty}>Zatím žádný balíček. Založ nový, nebo ho naskenuj či vlož jako seznam.</Text>}
      {library.decks.map(item => {
        const problems = deckProblems(item);
        return (
          <Pressable key={item.id} style={s.card} onPress={() => onOpen(item.id)}>
            <Text style={s.rowTitle}>{item.name}</Text>
            <Text style={s.muted}>
              {DECK_FORMATS.find(f => f.id === item.format)?.label} · {totalCards(item.commander) + totalCards(item.main)} karet
              {' · '}chybí {missingForDeck(item, library.collection).reduce((sum, m) => sum + m.missing, 0)}
            </Text>
            <Text style={problems.length ? s.warning : s.ok}>{problems.length ? `${problems.length} ${problems.length === 1 ? 'problém' : 'problémy'} s pravidly` : 'Podle pravidel v pořádku'}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function FormatChips({ value, onChange }: { value: DeckFormat; onChange: (format: DeckFormat) => void }) {
  return (
    <View style={s.actions}>
      {DECK_FORMATS.map(item => (
        <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: value === item.id }} onPress={() => onChange(item.id)} style={[s.chip, value === item.id && s.chipActive]}>
          <Text style={[s.chipText, value === item.id && s.chipTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function DeckDetail({ deck, library, showPrices, onBack, change }: { deck: Deck; library: Library; showPrices: boolean; onBack: () => void; change: Props['change'] }) {
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const missing = missingForDeck(deck, library.collection);
  const stats = deckStats(deck);
  const problems = deckProblems(deck);
  const edit = (update: (d: Deck) => Partial<Deck>) => change(lib => updateDeck(lib, deck.id, update, nowIso()));
  const formatLabel = DECK_FORMATS.find(f => f.id === deck.format)?.label ?? '';

  const exportDeck = async () => {
    const text = deckToText(deck);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setNotice('Seznam je zkopírovaný. Vlož ho v Moxfieldu, Archidektu nebo MTG Areně.');
      } else {
        await Share.share({ message: text, title: deck.name });
      }
    } catch {
      setNotice('Export se nepovedl.');
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const { found } = await fetchCollection(deckEntries(deck).map(entry => ({ id: entry.card.id })));
      change(lib => refreshCards(lib, found, nowIso()));
    } catch {
      setNotice('Data karet se nepodařilo obnovit.');
    } finally {
      setRefreshing(false);
    }
  };

  const maxCurve = Math.max(1, ...stats.curve);
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Pressable onPress={onBack}><Text style={s.link}>‹ Všechny balíčky</Text></Pressable>
      <Text style={s.title}>{deck.name}</Text>
      <FormatChips value={deck.format} onChange={format => edit(() => ({ format }))} />
      <Text style={s.muted}>
        {stats.total} karet{deck.sideboard.length ? ` + ${totalCards(deck.sideboard)} v sideboardu` : ''}
        {showPrices ? ` · hodnota ${formatPrice(listValue(deckEntries(deck), 'eur').total, 'eur')}` : ''}
      </Text>

      <View style={problems.length ? s.notice : s.okBox}>
        <Text style={s.rowTitle}>{problems.length ? `Pro ${formatLabel} zatím ne` : deck.format === 'casual' ? 'Bez pravidel formátu' : `Legální pro ${formatLabel}`}</Text>
        {problems.slice(0, 8).map(problem => <Text key={problem} style={s.muted}>• {problem}</Text>)}
        {problems.length > 8 && <Text style={s.muted}>… a dalších {problems.length - 8}</Text>}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Křivka many</Text>
        <View style={s.curve}>
          {stats.curve.map((value, manaValue) => (
            <View key={manaValue} style={s.curveColumn}>
              <Text style={s.footnote}>{value || ''}</Text>
              <View style={[s.curveBar, { height: 4 + (value / maxCurve) * 90 }]} />
              <Text style={s.footnote}>{manaValue === 7 ? '7+' : manaValue}</Text>
            </View>
          ))}
        </View>
        <Text style={s.muted}>
          {stats.averageManaValue !== null ? `Průměrná hodnota many ${String(stats.averageManaValue).replace('.', ',')} (bez zemí)` : 'Zatím žádná kouzla.'}
        </Text>
        <Text style={s.muted}>{stats.types.map(t => `${TYPE_NAMES[t.type] ?? t.type} ${t.count}`).join(' · ')}</Text>
        {stats.colors.length > 0 && <Text style={s.muted}>{stats.colors.map(c => `${COLOR_NAMES[c.color]} ${c.count}`).join(' · ')}</Text>}
        {stats.unknown > 0 && (
          <View style={s.row}>
            <Text style={[s.muted, s.grow]}>{stats.unknown} karet nemá uložená data pro statistiky.</Text>
            {refreshing ? <ActivityIndicator /> : <SmallButton label="Doplnit" onPress={() => void refresh()} />}
          </View>
        )}
      </View>

      {missing.length > 0 ? (
        <View style={s.notice}>
          <Text style={s.rowTitle}>Do sbírky ti chybí {missing.reduce((sum, item) => sum + item.missing, 0)} karet</Text>
          <Text style={s.muted} numberOfLines={4}>{missing.map(item => `${item.missing}× ${item.card.name}`).join(', ')}</Text>
          <SmallButton label="Chybějící do wishlistu" onPress={() => change(lib => wishMissingCards(lib, deck.id, nowIso()))} />
        </View>
      ) : deck.main.length > 0 ? <Text style={s.muted}>Všechny karty máš ve sbírce.</Text> : null}

      <View style={s.actions}>
        <SmallButton label="Vložit seznam karet" onPress={() => setImporting(true)} />
        <SmallButton label={Platform.OS === 'web' ? 'Kopírovat seznam' : 'Sdílet seznam'} onPress={() => void exportDeck()} />
      </View>
      {!!notice && <Text style={s.muted}>{notice}</Text>}

      {boardsFor(deck).concat(deck.format === 'commander' && deck.sideboard.length ? ['sideboard'] : []).map(board => (
        <View key={board} style={s.section}>
          <Text style={s.sectionTitle}>{BOARD_NAMES[board]} ({totalCards(deck[board])})</Text>
          {deck[board].length === 0 && (
            <Text style={s.muted}>{board === 'commander' ? 'Velitele přidáš z Hledat (+ Balíček) nebo vložením seznamu.' : 'Karty přidáš z Hledat, skenováním nebo vložením seznamu.'}</Text>
          )}
          {deck[board].map(entry => (
            <EntryCard key={entry.key} entry={entry} showPrices={showPrices} onQuantity={quantity => edit(d => boardChange(board, setQuantity(d[board], entry.key, quantity)))} />
          ))}
        </View>
      ))}
      <SmallButton label="Smazat balíček" danger onPress={() => { change(lib => deleteDeck(lib, deck.id)); onBack(); }} />

      <ImportSheet
        visible={importing}
        commander={deck.format === 'commander'}
        onClose={() => setImporting(false)}
        onImported={(boards, replace) => edit(d => Object.fromEntries(DECK_BOARDS.map(board => [
          board,
          replace ? boards[board] : boards[board].reduce((list, entry) => {
            const same = list.find(item => item.key === entry.key);
            return same ? list.map(item => item.key === entry.key ? { ...item, quantity: item.quantity + entry.quantity } : item) : [...list, entry];
          }, d[board]),
        ])) as Partial<Deck>)}
      />
    </ScrollView>
  );
}

function ImportSheet({ visible, commander, onClose, onImported }: {
  visible: boolean;
  commander: boolean;
  onClose: () => void;
  onImported: (boards: Record<DeckBoard, Deck['main']>, replace: boolean) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  const run = async (replace: boolean) => {
    setBusy(true);
    setResult('');
    try {
      const { boards, missing } = await importDecklist(text, ids => fetchCollection(ids), { commander });
      const added = DECK_BOARDS.reduce((sum, board) => sum + totalCards(boards[board]), 0);
      if (!added) { setResult('Nenašel jsem žádnou kartu. Každá karta na vlastní řádek, třeba „4 Lightning Bolt“.'); return; }
      onImported(boards, replace);
      setText('');
      setResult(missing.length ? `Přidáno ${added} karet. Nenalezeno: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '…' : ''}` : '');
      if (!missing.length) onClose();
    } catch {
      setResult('Scryfall teď neodpovídá, zkus to za chvíli.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => undefined}>
          <Text style={s.sheetTitle}>Vložit seznam karet</Text>
          <Text style={s.muted}>Z Moxfieldu, Archidektu, MTG Areny nebo odkudkoli: každá karta na řádek („4 Lightning Bolt“, „1 Sol Ring (CMM) 400“). Sekce Commander a Sideboard se poznají.</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={text}
            onChangeText={setText}
            multiline
            placeholder={'Commander\n1 Atraxa, Praetors\' Voice\n\nDeck\n1 Sol Ring\n…'}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {busy ? <ActivityIndicator /> : (
            <View style={s.actions}>
              <SmallButton label="Přidat do balíčku" onPress={() => void run(false)} />
              <SmallButton label="Nahradit celý balíček" onPress={() => void run(true)} />
              <SmallButton label="Zavřít" onPress={onClose} />
            </View>
          )}
          {!!result && <Text style={{ color: color.muted }}>{result}</Text>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
