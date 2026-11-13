// "Skenovat": cards from the camera straight into the collection.
// iPhone: the system document camera (finds the card edges, can scan a whole stack),
// text read by Vision in any language. Web: live camera with a card-shaped guide, or a photo.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CardPrinting, Finish } from './cardData';
import type { Pixels, ScanIndex } from './cardHash';
import { identifyCard, type ScanResult } from './scanIdentify';
import { loadScanIndex } from './scanIndexLoader';
import { nativeCardScannerAvailable, scanCardsWithCamera, type ScannedCard } from './modules/card-scanner';
import { CardRow, SmallButton, color, s } from './ui';

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'Angličtina', ja: 'Japonština', zhs: 'Čínština (zjednodušená)', zht: 'Čínština (tradiční)', ko: 'Korejština',
  de: 'Němčina', fr: 'Francouzština', it: 'Italština', es: 'Španělština', pt: 'Portugalština', ru: 'Ruština', ph: 'Phyrexijština',
};
const USUAL_LANGUAGES = ['en', 'ja', 'zhs', 'zht', 'ko', 'de', 'ru'];
const languageKey = 'kartoteka-scan-language';
const CARD_WIDTH = 244;
const CARD_HEIGHT = 340;

type Item = { key: string; state: 'working' | 'done'; result?: ScanResult; chosenId?: string; finish: Finish; added?: string };

type Props = {
  onAdd: (card: CardPrinting, where: 'collection' | 'wishlist', finish: Finish) => void;
  onAddToDeck: (card: CardPrinting) => void;
};

export default function ScanScreen({ onAdd, onAddToDeck }: Props) {
  const [index, setIndex] = useState<ScanIndex | null | undefined>(undefined);
  const [language, setLanguage] = useState('en');
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadScanIndex().then(setIndex);
    void AsyncStorage.getItem(languageKey).then(saved => { if (saved && LANGUAGE_NAMES[saved]) setLanguage(saved); });
  }, []);

  const chooseLanguage = (lang: string) => {
    setLanguage(lang);
    void AsyncStorage.setItem(languageKey, lang);
  };

  const update = (key: string, change: Partial<Item>) => setItems(current => current.map(item => item.key === key ? { ...item, ...change } : item));

  const recognise = useCallback(async (cards: ScannedCard[]) => {
    const fresh = cards.map((card, i) => ({ card, item: { key: `${Date.now()}-${i}`, state: 'working', finish: 'nonfoil' } as Item }));
    setItems(current => [...fresh.map(f => f.item), ...current]);
    // One at a time: Scryfall asks for a gentle pace, and results appear as they come.
    for (const { card, item } of fresh) {
      try {
        const result = await identifyCard({ image: card.image ?? undefined, text: card.text }, { index, preferredLanguage: language });
        update(item.key, { state: 'done', result, chosenId: result.printing?.id });
      } catch {
        update(item.key, { state: 'done', result: { status: 'notFound', method: 'none', alternatives: [], languages: [] } });
      }
    }
  }, [index, language]);

  const scanNative = async () => {
    setError('');
    try {
      const cards = await scanCardsWithCamera();
      if (cards.length) await recognise(cards);
    } catch {
      setError('Fotoaparát se nepodařilo otevřít.');
    }
  };

  const found = items.filter(item => item.state === 'done' && item.result?.status === 'found' && !item.added);

  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.title}>Skenovat</Text>
      <Text style={s.muted}>
        Karta se pozná podle ilustrace, ta je stejná ve všech jazycích. Jazyk se vezme z drobného textu vlevo dole
        nebo z písma na kartě; když není nic čitelné, použije se tvůj obvyklý jazyk.
      </Text>
      {index === undefined && <Text style={s.muted}>Načítám index karet…</Text>}
      {index === null && (
        <View style={s.notice}>
          <Text style={s.rowTitle}>Index karet teď není k dispozici</Text>
          <Text style={s.muted}>Poznají se jen karty s čitelným číslem a edicí vlevo dole (karty od roku 2020).</Text>
        </View>
      )}

      <Text style={s.sectionTitle}>Obvyklý jazyk tvých karet</Text>
      <View style={s.actions}>
        {USUAL_LANGUAGES.map(lang => (
          <Chip key={lang} label={LANGUAGE_NAMES[lang]} active={language === lang} onPress={() => chooseLanguage(lang)} />
        ))}
      </View>

      {Platform.OS === 'web' ? (
        <WebCamera onCapture={card => void recognise([{ image: card, text: '' }])} />
      ) : nativeCardScannerAvailable ? (
        <Pressable style={s.primaryButton} onPress={() => void scanNative()}>
          <Text style={s.primaryButtonText}>Skenovat karty</Text>
        </Pressable>
      ) : (
        <Text style={s.muted}>Skenování potřebuje novější verzi aplikace z TestFlightu.</Text>
      )}
      {Platform.OS !== 'web' && nativeCardScannerAvailable && (
        <Text style={s.footnote}>Polož kartu na tmavou podložku. Můžeš vyfotit víc karet za sebou, pak klepni na Uložit.</Text>
      )}
      {!!error && <Text style={s.error}>{error}</Text>}

      {found.length > 1 && (
        <SmallButton
          label={`Přidat ${found.length} nalezených do sbírky`}
          onPress={() => found.forEach(item => {
            const card = chosenCard(item);
            if (card) { onAdd(card, 'collection', item.finish); update(item.key, { added: 'Ve sbírce' }); }
          })}
        />
      )}

      {items.map(item => (
        <ScanResultCard
          key={item.key}
          item={item}
          onChoose={id => update(item.key, { chosenId: id })}
          onFinish={finish => update(item.key, { finish })}
          onAdd={where => {
            const card = chosenCard(item);
            if (!card) return;
            onAdd(card, where, item.finish);
            update(item.key, { added: where === 'collection' ? 'Ve sbírce' : 'Ve wishlistu' });
          }}
          onAddToDeck={() => { const card = chosenCard(item); if (card) onAddToDeck(card); }}
          onDiscard={() => setItems(current => current.filter(other => other.key !== item.key))}
        />
      ))}
      {items.length > 0 && <Text style={s.footnote}>Data o kartách: Scryfall.</Text>}
    </ScrollView>
  );
}

const allCandidates = (result?: ScanResult) => result?.printing ? [result.printing, ...result.alternatives] : [];
const chosenCard = (item: Item) => allCandidates(item.result).find(card => card.id === item.chosenId) ?? item.result?.printing;

function ScanResultCard({ item, onChoose, onFinish, onAdd, onAddToDeck, onDiscard }: {
  item: Item;
  onChoose: (id: string) => void;
  onFinish: (finish: Finish) => void;
  onAdd: (where: 'collection' | 'wishlist') => void;
  onAddToDeck: () => void;
  onDiscard: () => void;
}) {
  if (item.state === 'working') {
    return <View style={[s.card, s.row]}><ActivityIndicator /><Text style={s.muted}>Rozpoznávám kartu…</Text></View>;
  }
  const { result } = item;
  const card = chosenCard(item);
  if (!result || !card) {
    return (
      <View style={s.card}>
        <Text style={s.rowTitle}>Kartu se nepodařilo poznat</Text>
        <Text style={s.muted}>Zkus ji vyfotit znovu (celou, bez odlesku), nebo ji najdi v Hledat.</Text>
        <SmallButton label="Zahodit" onPress={onDiscard} />
      </View>
    );
  }
  const candidates = allCandidates(result);
  const sameCard = candidates.filter(other => other.oracleId === card.oracleId);
  const otherCards = candidates.filter(other => other.oracleId !== card.oracleId);
  const editions = sameCard.filter(other => other.lang === card.lang);
  const languageChoice = (lang: string) =>
    sameCard.find(other => other.lang === lang && other.set === card.set) ?? sameCard.find(other => other.lang === lang);

  return (
    <View style={s.card}>
      <Text style={[s.badge, result.status === 'found' ? s.badgeOk : s.badgeUnsure]}>
        {result.status === 'found' ? 'Nalezeno' : 'Nejisté – zkontroluj'}
        {result.method === 'collectorLine' ? ' · podle čísla karty' : ' · podle ilustrace'}
      </Text>
      <CardRow card={card} subtitle={`${card.setName} · #${card.collectorNumber} · ${LANGUAGE_NAMES[card.lang] ?? card.lang}`} />
      {result.languages.length > 1 && (
        <View style={s.actions}>
          {result.languages.map(lang => {
            const target = languageChoice(lang);
            return target ? <Chip key={lang} label={LANGUAGE_NAMES[lang] ?? lang} active={card.lang === lang} onPress={() => onChoose(target.id)} /> : null;
          })}
        </View>
      )}
      {editions.length > 1 && (
        <View style={s.actions}>
          {editions.map(other => (
            <Chip key={other.id} label={`${other.set.toUpperCase()} #${other.collectorNumber}`} active={other.id === card.id} onPress={() => onChoose(other.id)} />
          ))}
        </View>
      )}
      {otherCards.length > 0 && (
        <View style={s.actions}>
          <Text style={s.muted}>Nebo to je:</Text>
          {otherCards.map(other => <Chip key={other.id} label={other.name} active={false} onPress={() => onChoose(other.id)} />)}
        </View>
      )}
      <View style={s.actions}>
        <Chip label="Bez foilu" active={item.finish === 'nonfoil'} onPress={() => onFinish('nonfoil')} />
        <Chip label="Foil" active={item.finish === 'foil'} onPress={() => onFinish('foil')} />
      </View>
      {item.added ? <Text style={s.price}>{item.added} ✓</Text> : (
        <View style={s.actions}>
          <SmallButton label="+ Sbírka" onPress={() => onAdd('collection')} />
          <SmallButton label="+ Wishlist" onPress={() => onAdd('wishlist')} />
          <SmallButton label="+ Balíček" onPress={onAddToDeck} />
          <SmallButton label="Zahodit" danger onPress={onDiscard} />
        </View>
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

// ---- Web camera ----

/** Largest card-shaped rectangle (63 × 88 mm) in the middle of a picture, leaving a margin. */
export const cardGuide = (width: number, height: number) => {
  let guideHeight = height * 0.86;
  let guideWidth = (guideHeight * 63) / 88;
  if (guideWidth > width * 0.86) {
    guideWidth = width * 0.86;
    guideHeight = (guideWidth * 88) / 63;
  }
  return { x: (width - guideWidth) / 2, y: (height - guideHeight) / 2, w: guideWidth, h: guideHeight };
};

const percent = (fraction: number) => `${fraction * 100}%` as const;

const toCardPixels = (source: CanvasImageSource, area: { x: number; y: number; w: number; h: number }): Pixels | null => {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, area.x, area.y, area.w, area.h, 0, 0, CARD_WIDTH, CARD_HEIGHT);
  return { width: CARD_WIDTH, height: CARD_HEIGHT, data: context.getImageData(0, 0, CARD_WIDTH, CARD_HEIGHT).data };
};

function WebCamera({ onCapture }: { onCapture: (card: Pixels) => void }) {
  const host = useRef<View>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [state, setState] = useState<'starting' | 'ready' | 'unavailable'>('starting');

  useEffect(() => {
    const node = host.current as unknown as HTMLElement | null;
    if (!node || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      return;
    }
    const element = document.createElement('video');
    element.muted = true;
    element.playsInline = true;
    element.setAttribute('playsinline', '');
    Object.assign(element.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', objectFit: 'fill' });
    node.prepend(element);
    video.current = element;
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(media => {
        if (cancelled) { media.getTracks().forEach(track => track.stop()); return; }
        stream = media;
        element.srcObject = media;
        element.onloadedmetadata = () => {
          setSize({ width: element.videoWidth, height: element.videoHeight });
          void element.play();
          setState('ready');
        };
      })
      .catch(() => setState('unavailable'));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach(track => track.stop());
      element.remove();
    };
  }, []);

  const capture = () => {
    const element = video.current;
    if (!element || !size) return;
    const pixels = toCardPixels(element, cardGuide(size.width, size.height));
    if (pixels) onCapture(pixels);
  };

  const upload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const image = new window.Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        const { naturalWidth: width, naturalHeight: height } = image;
        // A photo cropped to the card is used whole; otherwise the card is expected in the middle.
        const croppedToCard = Math.abs(width / height - 63 / 88) < 0.06;
        const pixels = toCardPixels(image, croppedToCard ? { x: 0, y: 0, w: width, h: height } : cardGuide(width, height));
        URL.revokeObjectURL(url);
        if (pixels) onCapture(pixels);
      };
      image.src = url;
    };
    input.click();
  };

  const guide = size ? cardGuide(size.width, size.height) : null;
  return (
    <View style={{ gap: 8 }}>
      <View
        ref={host}
        style={[s.camera, { aspectRatio: size ? size.width / size.height : 4 / 3 }, state === 'unavailable' && { display: 'none' }]}
      >
        {guide && size && (
          <View
            pointerEvents="none"
            style={[s.cameraGuide, {
              left: percent(guide.x / size.width), top: percent(guide.y / size.height),
              width: percent(guide.w / size.width), height: percent(guide.h / size.height),
            }]}
          />
        )}
        {state === 'starting' && <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />}
      </View>
      {state === 'ready' && (
        <Pressable style={s.primaryButton} onPress={capture}><Text style={s.primaryButtonText}>Vyfotit kartu</Text></Pressable>
      )}
      {state === 'unavailable' && <Text style={s.muted}>Fotoaparát není dostupný nebo jsi ho nepovolil. Můžeš nahrát fotku.</Text>}
      <SmallButton label="Nahrát fotku karty" onPress={upload} />
      <Text style={[s.footnote, { color: color.muted }]}>Kartu dej celou do rámečku, bez odlesků. Japonské, čínské i korejské karty se poznají stejně.</Text>
    </View>
  );
}
