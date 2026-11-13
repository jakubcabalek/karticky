// "Životy": life counter for the table. Players sit around the phone, so the
// upper half of the panels is turned upside down. Tap the left half for −1, the
// right half for +1, hold for −10/+10. The name opens poison, commander damage and
// other counters. The game is saved, so switching apps loses nothing.
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COMMANDER_DAMAGE_TO_LOSE, COUNTERS, LIFE_PRESETS, PLAYER_COLORS, POISON_TO_LOSE,
  changeCommanderDamage, changeCounter, changeLife, defeat, flipCoin, newGame, normalizeGame, pickStartingPlayer,
  recentDelta, renamePlayer, restartGame, rollDie, setConceded, undo, winner,
  type CounterKind, type Game, type Player, type PlayerColor,
} from './lifeCounter';
import { SmallButton, s } from './ui';

const storageKey = 'kartoteka-life-game-v1';

const PANEL: Record<PlayerColor, { bg: string; fg: string; name: string }> = {
  blue: { bg: '#2F5DA8', fg: '#FFFFFF', name: 'Modrá' },
  red: { bg: '#B23A3A', fg: '#FFFFFF', name: 'Červená' },
  green: { bg: '#2E7D4F', fg: '#FFFFFF', name: 'Zelená' },
  black: { bg: '#2B2B33', fg: '#FFFFFF', name: 'Černá' },
  white: { bg: '#E6DFCC', fg: '#2A2418', name: 'Bílá' },
  gold: { bg: '#B88A1E', fg: '#FFFFFF', name: 'Zlatá' },
};

/** How many panels go in each row, top to bottom. */
export const rowsFor = (count: number): number[] =>
  ({ 1: [1], 2: [1, 1], 3: [1, 2], 4: [2, 2], 5: [2, 1, 2], 6: [2, 2, 2] } as Record<number, number[]>)[count] ?? [count];

export default function LifeScreen() {
  const [game, setGame] = useState<Game | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [setup, setSetup] = useState(false);
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(storageKey).then(saved => {
      try { setGame(saved ? normalizeGame(JSON.parse(saved)) : null); } catch { setGame(null); }
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded && game) void AsyncStorage.setItem(storageKey, JSON.stringify(game));
  }, [game, loaded]);
  useEffect(() => () => { if (tickTimer.current) clearTimeout(tickTimer.current); }, []);

  // The "−3" bubble disappears on its own a moment after the last tap.
  const play = (change: (current: Game) => Game) => {
    setGame(current => current ? change(current) : current);
    if (tickTimer.current) clearTimeout(tickTimer.current);
    tickTimer.current = setTimeout(() => setTick(n => n + 1), 1600);
  };

  if (!loaded) return null;
  if (!game || setup) {
    return <GameSetup previous={game} onStart={next => { setGame(next); setSetup(false); }} onCancel={game ? () => setSetup(false) : undefined} />;
  }

  const won = winner(game);
  const rows = rowsFor(game.players.length);
  let next = 0;
  const now = Date.now();
  const sheetPlayer = game.players.find(player => player.id === sheetFor);

  return (
    <View style={life.screen}>
      <View style={life.table}>
        {rows.map((size, rowIndex) => {
          const players = game.players.slice(next, next + size);
          next += size;
          const upsideDown = rows.length > 1 && rowIndex < Math.floor(rows.length / 2);
          return (
            <View key={rowIndex} style={life.row}>
              {players.map(player => (
                <LifePanel
                  key={player.id}
                  game={game}
                  player={player}
                  upsideDown={upsideDown}
                  delta={recentDelta(game, player.id, now)}
                  onLife={delta => play(current => changeLife(current, player.id, delta))}
                  onOpen={() => setSheetFor(player.id)}
                />
              ))}
            </View>
          );
        })}
        {won && (
          <View style={life.winnerBanner} pointerEvents="none">
            <Text style={life.winnerText}>Vyhrává {won.name}</Text>
          </View>
        )}
      </View>

      <View style={life.tools}>
        <ToolButton label="Zpět" disabled={!game.history.length} onPress={() => play(undo)} />
        <ToolButton label="d6" onPress={() => setMessage(`Kostka d6: ${rollDie(6)}`)} />
        <ToolButton label="d20" onPress={() => setMessage(`Kostka d20: ${rollDie(20)}`)} />
        <ToolButton label="Mince" onPress={() => setMessage(`Mince: ${flipCoin()}`)} />
        <ToolButton label="Kdo začne" onPress={() => setMessage(`Začíná ${pickStartingPlayer(game).name}`)} />
        <ToolButton label="Znovu" onPress={() => { play(current => restartGame(current)); setMessage('Nová hra se stejnými hráči'); }} />
        <ToolButton label="Nastavit" onPress={() => setSetup(true)} />
      </View>

      <Modal visible={message !== null} transparent animationType="fade" onRequestClose={() => setMessage(null)}>
        <Pressable style={life.messageBackdrop} onPress={() => setMessage(null)}>
          <View style={life.messageBox}><Text style={life.messageText}>{message}</Text></View>
        </Pressable>
      </Modal>

      <Modal visible={sheetPlayer !== undefined} transparent animationType="slide" onRequestClose={() => setSheetFor(null)}>
        <Pressable style={s.backdrop} onPress={() => setSheetFor(null)}>
          {sheetPlayer && (
            <Pressable style={[s.sheet, life.sheet]} onPress={() => undefined}>
              <PlayerSheet game={game} player={sheetPlayer} play={play} onClose={() => setSheetFor(null)} />
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

function LifePanel({ game, player, upsideDown, delta, onLife, onOpen }: {
  game: Game;
  player: Player;
  upsideDown: boolean;
  delta: number;
  onLife: (delta: number) => void;
  onOpen: () => void;
}) {
  const colors = PANEL[player.color];
  const out = defeat(game, player);
  const commanderTaken = Object.entries(player.commanderDamage).filter(([, damage]) => damage > 0);
  const counters = COUNTERS.filter(counter => player.counters[counter.kind] > 0);
  return (
    <View style={[life.panel, { backgroundColor: colors.bg }, upsideDown && life.upsideDown, out.out && life.out]}>
      <View style={life.halves}>
        <Pressable accessibilityLabel={`${player.name} −1 život`} style={life.half} onPress={() => onLife(-1)} onLongPress={() => onLife(-10)}>
          <Text style={[life.sign, { color: colors.fg }]}>−</Text>
        </Pressable>
        <Pressable accessibilityLabel={`${player.name} +1 život`} style={[life.half, life.halfRight]} onPress={() => onLife(1)} onLongPress={() => onLife(10)}>
          <Text style={[life.sign, { color: colors.fg }]}>+</Text>
        </Pressable>
      </View>
      <View style={life.center} pointerEvents="box-none">
        <Pressable onPress={onOpen} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${player.name}: jed, commander damage a další`}>
          <Text style={[life.name, { color: colors.fg }]}>{player.name} ⋯</Text>
        </Pressable>
        <View style={life.info} pointerEvents="none">
          <Text style={[life.total, { color: colors.fg }]} accessibilityLiveRegion="polite">{player.life}</Text>
          {delta !== 0 && <Text style={[life.delta, { color: colors.fg }]}>{delta > 0 ? `+${delta}` : `−${-delta}`}</Text>}
          <View style={life.badges}>
            {counters.map(counter => (
              <Text key={counter.kind} style={[life.badge, { color: colors.fg, borderColor: colors.fg }]}>
                {counter.label} {player.counters[counter.kind]}{counter.kind === 'poison' ? `/${POISON_TO_LOSE}` : ''}
              </Text>
            ))}
            {game.commander && commanderTaken.map(([fromId, damage]) => (
              <Text key={fromId} style={[life.badge, { color: colors.fg, borderColor: colors.fg }]}>
                ⚔ {game.players.find(p => p.id === fromId)?.name}: {damage}
              </Text>
            ))}
          </View>
          {out.out && <Text style={[life.outText, { color: colors.fg }]}>Vyřazen · {out.reason}</Text>}
        </View>
      </View>
    </View>
  );
}

function PlayerSheet({ game, player, play, onClose }: { game: Game; player: Player; play: (change: (g: Game) => Game) => void; onClose: () => void }) {
  const [name, setName] = useState(player.name);
  const opponents = game.players.filter(other => other.id !== player.id);
  const step = (label: string, value: number, onChange: (delta: number) => void, hint?: string) => (
    <View style={life.stepRow}>
      <View style={s.grow}>
        <Text style={s.rowTitle}>{label}</Text>
        {hint ? <Text style={s.footnote}>{hint}</Text> : null}
      </View>
      <SmallButton label="−" onPress={() => onChange(-1)} />
      <Text style={life.stepValue}>{value}</Text>
      <SmallButton label="+" onPress={() => onChange(1)} />
    </View>
  );
  return (
    <ScrollView contentContainerStyle={{ gap: 10 }}>
      <View style={s.row}>
        <TextInput
          style={[s.input, s.grow]}
          value={name}
          onChangeText={setName}
          onEndEditing={() => play(current => renamePlayer(current, player.id, name))}
          placeholder="Jméno hráče"
        />
        <SmallButton label="Hotovo" onPress={() => { play(current => renamePlayer(current, player.id, name)); onClose(); }} />
      </View>
      <View style={s.actions}>
        {PLAYER_COLORS.map(color => (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={PANEL[color].name}
            accessibilityState={{ selected: player.color === color }}
            onPress={() => play(current => renamePlayer(current, player.id, name, color))}
            style={[life.swatch, { backgroundColor: PANEL[color].bg }, player.color === color && life.swatchActive]}
          />
        ))}
      </View>

      {step('Životy', player.life, delta => play(current => changeLife(current, player.id, delta)))}

      {game.commander && opponents.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Commander damage</Text>
          <Text style={s.footnote}>Poškození od velitele soupeře. Ubírá i životy. {COMMANDER_DAMAGE_TO_LOSE} od jednoho velitele = prohra.</Text>
          {opponents.map(opponent => step(
            `Od ${opponent.name}`,
            player.commanderDamage[opponent.id] ?? 0,
            delta => play(current => changeCommanderDamage(current, player.id, opponent.id, delta)),
          ))}
        </>
      )}

      <Text style={s.sectionTitle}>Žetony</Text>
      {COUNTERS.map(counter => step(
        counter.label,
        player.counters[counter.kind],
        delta => play(current => changeCounter(current, player.id, counter.kind as CounterKind, delta)),
        counter.hint,
      ))}

      <SmallButton
        label={player.conceded ? 'Vrátit do hry' : 'Vzdát se'}
        danger={!player.conceded}
        onPress={() => play(current => setConceded(current, player.id, !player.conceded))}
      />
    </ScrollView>
  );
}

function GameSetup({ previous, onStart, onCancel }: { previous: Game | null; onStart: (game: Game) => void; onCancel?: () => void }) {
  const [players, setPlayers] = useState(previous?.players.length ?? 2);
  const [startingLife, setStartingLife] = useState(previous?.startingLife ?? 20);
  const [customLife, setCustomLife] = useState('');
  const [commander, setCommander] = useState(previous?.commander ?? false);
  const [names, setNames] = useState<string[]>(previous?.players.map(p => p.name) ?? []);

  const chooseLife = (value: number) => {
    setStartingLife(value);
    setCustomLife('');
    setCommander(value >= 40);
  };

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Počítání životů</Text>

      <Text style={s.sectionTitle}>Počet hráčů</Text>
      <View style={s.actions}>
        {[1, 2, 3, 4, 5, 6].map(count => <Choice key={count} label={String(count)} active={players === count} onPress={() => setPlayers(count)} />)}
      </View>

      <Text style={s.sectionTitle}>Životy na začátku</Text>
      <View style={s.actions}>
        {LIFE_PRESETS.map(value => <Choice key={value} label={String(value)} active={!customLife && startingLife === value} onPress={() => chooseLife(value)} />)}
        <TextInput
          style={[s.input, life.customLife]}
          value={customLife}
          onChangeText={text => {
            const digits = text.replace(/\D/g, '').slice(0, 3);
            setCustomLife(digits);
            if (Number(digits) > 0) setStartingLife(Number(digits));
          }}
          keyboardType="number-pad"
          placeholder="Jiné"
        />
      </View>
      <Text style={s.footnote}>20 běžná hra · 25 Two-Headed Giant / Brawl · 30 Brawl pro dva · 40 Commander</Text>

      <Pressable style={s.switchRow} accessibilityRole="switch" accessibilityState={{ checked: commander }} onPress={() => setCommander(value => !value)}>
        <View style={s.grow}>
          <Text style={s.rowTitle}>Commander</Text>
          <Text style={s.muted}>Počítá commander damage od každého soupeře (21 od jednoho velitele = prohra).</Text>
        </View>
        <View style={[s.switch, commander && s.switchOn]}><View style={[s.switchThumb, commander && s.switchThumbOn]} /></View>
      </Pressable>

      <Text style={s.sectionTitle}>Jména (nepovinné)</Text>
      {Array.from({ length: players }, (_, i) => (
        <TextInput
          key={i}
          style={s.input}
          value={names[i] ?? ''}
          onChangeText={text => setNames(current => { const copy = [...current]; copy[i] = text; return copy; })}
          placeholder={`Hráč ${i + 1}`}
        />
      ))}

      <Pressable style={s.primaryButton} onPress={() => onStart(newGame(players, startingLife, { commander, names }))}>
        <Text style={s.primaryButtonText}>Začít hru</Text>
      </Pressable>
      {onCancel && <SmallButton label="Zpět do rozehrané hry" onPress={onCancel} />}
    </ScrollView>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[s.chip, life.choice, active && s.chipActive]}>
      <Text style={[s.chipText, life.choiceText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ToolButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[life.tool, disabled && life.toolDisabled]}>
      <Text style={life.toolText}>{label}</Text>
    </Pressable>
  );
}

const life = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#111014' },
  table: { flex: 1, padding: 4, gap: 4 },
  row: { flex: 1, flexDirection: 'row', gap: 4 },
  panel: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  upsideDown: { transform: [{ rotate: '180deg' }] },
  out: { opacity: 0.45 },
  halves: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row' },
  half: { flex: 1, justifyContent: 'center', paddingHorizontal: 18 },
  halfRight: { alignItems: 'flex-end' },
  sign: { fontSize: 34, fontWeight: '300', opacity: 0.5 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 2 },
  name: { fontSize: 16, fontWeight: '700', opacity: 0.9, paddingHorizontal: 10, paddingVertical: 4 },
  total: { fontSize: 72, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 80 },
  info: { alignItems: 'center', gap: 2 },
  delta: { fontSize: 20, fontWeight: '800', opacity: 0.85 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  badge: { fontSize: 12, fontWeight: '700', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  outText: { fontSize: 14, fontWeight: '800' },
  winnerBanner: { position: 'absolute', left: 16, right: 16, top: '45%', backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 16, padding: 14, alignItems: 'center' },
  winnerText: { color: '#F6D478', fontSize: 22, fontWeight: '800' },
  tools: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, padding: 6 },
  tool: { backgroundColor: '#2A2733', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  toolDisabled: { opacity: 0.4 },
  toolText: { color: '#F2F0F7', fontWeight: '700', fontSize: 13 },
  messageBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  messageBox: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 28, paddingHorizontal: 36 },
  messageText: { fontSize: 26, fontWeight: '800', color: '#1C1530', textAlign: 'center' },
  sheet: { maxHeight: '85%' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepValue: { minWidth: 36, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#1C1530' },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: '#1C1530', borderWidth: 3 },
  customLife: { width: 80, paddingVertical: 8 },
  choice: { minWidth: 48, alignItems: 'center' },
  choiceText: { fontSize: 16 },
});
