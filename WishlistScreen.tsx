// "Wishlist": cards you are looking for. Each can have a price you are willing to pay;
// when Cardmarket's price drops to it (prices refresh once a day), the card is highlighted.
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { entryPrice, formatPrice, listValue, priceAlerts, totalCards, type CardEntry } from './cardData';
import ShopPrices from './ShopPrices';
import { EntryCard, s } from './ui';

type Props = {
  entries: CardEntry[];
  showPrices: boolean;
  pricesUpdatedAt?: string;
  onQuantity: (key: string, quantity: number) => void;
  onTarget: (key: string, target: number | null) => void;
  onAcquired: (key: string) => void;
};

export default function WishlistScreen({ entries, showPrices, pricesUpdatedAt, onQuantity, onTarget, onAcquired }: Props) {
  const value = useMemo(() => listValue(entries, 'eur'), [entries]);
  const alerts = priceAlerts(entries);
  const alertKeys = new Set(alerts.map(alert => alert.entry.key));
  const sorted = [...entries].sort((a, b) => Number(alertKeys.has(b.key)) - Number(alertKeys.has(a.key)));

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Wishlist</Text>
      <Text style={s.muted}>
        {totalCards(entries)} karet{showPrices && entries.length > 0 ? ` · celkem ${formatPrice(value.total, 'eur')}` : ''}
        {pricesUpdatedAt ? ` · ceny z ${new Date(pricesUpdatedAt).toLocaleDateString('cs-CZ')}` : ''}
      </Text>
      {alerts.length > 0 && (
        <View style={s.alert}>
          <Text style={s.rowTitle}>{alerts.length === 1 ? 'Jedna karta zlevnila' : `${alerts.length} karty zlevnily`} na tvou cenu</Text>
          {alerts.map(({ entry, price }) => (
            <Text key={entry.key} style={s.muted}>{entry.card.name}: {formatPrice(price, 'eur')} (chtěl jsi {formatPrice(entry.targetPrice ?? 0, 'eur')})</Text>
          ))}
        </View>
      )}
      {entries.length === 0 && (
        <Text style={s.empty}>Karty, které sháníš. Přidáš je z Hledat, skenováním, nebo z balíčku tlačítkem „Chybějící do wishlistu“.</Text>
      )}
      {sorted.map(entry => (
        <View key={entry.key} style={alertKeys.has(entry.key) ? s.alert : undefined}>
          <EntryCard entry={entry} showPrices={showPrices} onQuantity={quantity => onQuantity(entry.key, quantity)} action={{ label: 'Mám ji', onPress: () => onAcquired(entry.key) }} />
          <TargetPrice entry={entry} onTarget={target => onTarget(entry.key, target)} />
          {alertKeys.has(entry.key) && <ShopPrices card={entry.card} />}
        </View>
      ))}
    </ScrollView>
  );
}

function TargetPrice({ entry, onTarget }: { entry: CardEntry; onTarget: (target: number | null) => void }) {
  const [text, setText] = useState(entry.targetPrice !== undefined ? String(entry.targetPrice).replace('.', ',') : '');
  const current = entryPrice(entry, 'eur');
  const save = () => {
    const value = Number(text.replace(',', '.').replace(/[^\d.]/g, ''));
    onTarget(text.trim() && value > 0 ? value : null);
  };
  return (
    <View style={[s.row, { paddingHorizontal: 12, paddingBottom: 10 }]}>
      <Text style={[s.muted, s.grow]}>Hlídat cenu: dej vědět, když bude za</Text>
      <TextInput
        style={s.targetInput}
        value={text}
        onChangeText={setText}
        onEndEditing={save}
        onBlur={save}
        keyboardType="decimal-pad"
        placeholder={current !== null ? `€ ${String(Math.floor(current * 0.9 * 100) / 100).replace('.', ',')}` : '€'}
        accessibilityLabel={`Hlídaná cena pro ${entry.card.name} v eurech`}
      />
      <Text style={s.muted}>€</Text>
    </View>
  );
}
