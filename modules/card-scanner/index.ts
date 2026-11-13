import { requireOptionalNativeModule } from 'expo';
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

/** Straightened cards at 244 × 340 px (enough for the artwork) with the text read on them. */
export const scanCardsWithCamera = async (): Promise<ScannedCard[]> => {
  if (!CardScanner) return [];
  const cards = await CardScanner.scanCards(244, 340);
  return cards.map(card => ({
    image: card.rgba ? { width: card.width, height: card.height, data: decodeBase64(card.rgba) } : null,
    text: card.text,
  }));
};
