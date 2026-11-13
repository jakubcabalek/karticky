import type { ComponentType } from 'react';
import type { ViewProps } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { requireNativeViewManager } from 'expo-modules-core';
import { decodeBase64 } from '../../base64';
import type { Pixels } from '../../cardHash';

type NativeScannedCard = { width: number; height: number; rgba: string; text: string };
type CardScannerModule = {
  isAvailable(): boolean;
  /** Opens the document camera; resolves with every scanned card (empty when cancelled). */
  scanCards(width: number, height: number): Promise<NativeScannedCard[]>;
};

// Missing on the web and in builds made before the module existed.
const CardScanner = requireOptionalNativeModule<CardScannerModule>('CardScanner');

export const nativeCardScannerAvailable = CardScanner != null && CardScanner.isAvailable();

export type ScannedCard = { image: Pixels | null; text: string };

const toScannedCard = (card: NativeScannedCard): ScannedCard => ({
  image: card.rgba ? { width: card.width, height: card.height, data: decodeBase64(card.rgba) } : null,
  text: card.text,
});

/** Straightened cards at 244 × 340 px (enough for the artwork) with the text read on them. */
export const scanCardsWithCamera = async (): Promise<ScannedCard[]> => {
  if (!CardScanner) return [];
  const cards = await CardScanner.scanCards(244, 340);
  return cards.map(toScannedCard);
};

// ---- Live camera view: no photo, the card is read while the camera looks at it ----

type LiveEvent = { nativeEvent: Partial<NativeScannedCard> & { found: boolean; denied?: boolean } };
type NativeLiveProps = ViewProps & { active: boolean; onCard: (event: LiveEvent) => void };

export const NativeLiveScannerView: ComponentType<NativeLiveProps> | null =
  CardScanner ? (requireNativeViewManager('CardScanner') as ComponentType<NativeLiveProps>) : null;

/** Turns a live event into a scanned card, or null when no card is in view. */
export const liveEventToCard = (event: LiveEvent): ScannedCard | 'denied' | null => {
  const card = event.nativeEvent;
  if (card.denied) return 'denied';
  if (!card.found || !card.rgba || !card.width || !card.height) return null;
  return toScannedCard({ width: card.width, height: card.height, rgba: card.rgba, text: card.text ?? '' });
};
