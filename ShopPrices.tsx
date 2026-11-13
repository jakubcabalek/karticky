// "Ceny v obchodech" under a card: asks our Cloudflare function, which asks the Czech shops.
import React, { useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from 'react-native';
import { isDevelopmentVersion, versionUrl } from './appVersion';
import type { CardPrinting } from './cardData';
import { SmallButton, s } from './ui';

type ShopOffer = { title: string; price: number; currency: string; inStock: boolean; url: string };
type ShopResult = { id: string; name: string; searchUrl: string; status: 'ok' | 'empty' | 'error'; offers: ShopOffer[] };

const czk = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

export const fetchShopPrices = async (name: string): Promise<ShopResult[]> => {
  const base = Platform.OS === 'web' ? '/' : versionUrl(isDevelopmentVersion);
  const response = await fetch(`${base}api/shop-prices?name=${encodeURIComponent(name)}`);
  if (!response.ok) throw new Error(String(response.status));
  const body = await response.json() as { shops?: ShopResult[] };
  return body.shops ?? [];
};

export default function ShopPrices({ card }: { card: CardPrinting }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [shops, setShops] = useState<ShopResult[]>([]);

  const load = async () => {
    setState('loading');
    try {
      setShops(await fetchShopPrices(card.name));
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'idle') return <SmallButton label="Ceny v obchodech" onPress={() => void load()} />;
  if (state === 'loading') return <View style={s.row}><ActivityIndicator /><Text style={s.muted}>Ptám se obchodů…</Text></View>;
  if (state === 'error') {
    return (
      <View style={s.actions}>
        <Text style={s.error}>Ceny z obchodů se nepodařilo načíst.</Text>
        <SmallButton label="Zkusit znovu" onPress={() => void load()} />
      </View>
    );
  }
  return (
    <View style={s.section}>
      {shops.map(shop => (
        <View key={shop.id} style={s.shop}>
          <View style={s.row}>
            <Text style={[s.rowTitle, s.grow]}>{shop.name}</Text>
            <Pressable onPress={() => void Linking.openURL(shop.searchUrl)}><Text style={s.link}>Otevřít ›</Text></Pressable>
          </View>
          {shop.offers.length === 0 && (
            <Text style={s.muted}>{shop.status === 'error' ? 'Obchod teď neodpovídá.' : 'Nic jsme nenašli, zkus otevřít obchod.'}</Text>
          )}
          {shop.offers.map(offer => (
            <Pressable key={`${offer.url}-${offer.title}-${offer.price}`} style={s.offer} onPress={() => void Linking.openURL(offer.url)}>
              <Text style={[s.grow, s.muted, !offer.inStock && s.soldOut]} numberOfLines={2}>{offer.title}</Text>
              <Text style={[s.price, !offer.inStock && s.soldOut]}>
                {offer.currency === 'CZK' ? czk.format(offer.price) : `${offer.price} ${offer.currency}`}
                {offer.inStock ? '' : ' · není skladem'}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
      <Text style={s.footnote}>Ceny se v obchodech zjišťují nejvýš jednou za 6 hodin.</Text>
    </View>
  );
}
