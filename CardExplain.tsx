// "Co karta umí": the official rules text and a Czech explanation of every ability on it.
// The text is Scryfall's English Oracle text, so it also explains Japanese or Chinese cards.
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { CardPrinting } from './cardData';
import { explainCard } from './keywords';
import { SmallButton, s } from './ui';

export default function CardExplain({ card, startOpen = false }: { card: CardPrinting; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const explanations = explainCard(card);

  if (!open) return <SmallButton label={explanations.length ? `Co karta umí (${explanations.map(e => e.term).join(', ')})` : 'Co karta umí'} onPress={() => setOpen(true)} />;

  return (
    <View style={s.explain}>
      <View style={s.row}>
        <Text style={[s.rowTitle, s.grow]}>Co karta umí</Text>
        <Pressable onPress={() => setOpen(false)}><Text style={s.link}>Skrýt</Text></Pressable>
      </View>
      <Text style={s.muted}>
        {card.manaCost ? `${card.manaCost} · ` : ''}{card.typeLine}{card.power != null && card.toughness != null ? ` · ${card.power}/${card.toughness}` : ''}
      </Text>
      {card.oracleText ? <Text style={s.oracle}>{card.oracleText}</Text> : <Text style={s.muted}>Karta nemá žádný text pravidel.</Text>}
      {explanations.map(explanation => (
        <View key={explanation.term} style={s.keyword}>
          <Text style={s.keywordTerm}>{explanation.term}</Text>
          <Text style={s.muted}>{explanation.text}</Text>
        </View>
      ))}
    </View>
  );
}
