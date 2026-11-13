import { isDevelopmentVersion } from './appVersion';

// Every new feature starts here: on in the test version, off in production until
// the owner releases it. A released feature loses its switch and the code path without it.
export const developmentFeatures = [
  { key: 'cardScanner', title: 'Skenování karet', description: 'Nová záložka Skenovat. V iPhonu systémový fotoaparát najde okraje karty a umí vyfotit celou hromádku za sebou, na webu kamera s rámečkem nebo nahraná fotka. Karta se pozná podle ilustrace (funguje i pro japonské, čínské a korejské karty), jazyk a edice podle drobného textu vlevo dole nebo písma na kartě.' },
  { key: 'shopPrices', title: 'Ceny v českých obchodech', description: 'U karty v Hledat přibude „Ceny v obchodech“: co mají skladem Najada, Černý rytíř, Blacklotus a další, s cenou v Kč a odkazem do obchodu.' },
  { key: 'cardPrices', title: 'Ceny karet', description: 'U karty v hledání a ve sbírce je cena z Cardmarketu (EUR) a TCGplayeru (USD) podle Scryfallu, ve sbírce a balíčku celková hodnota. Ceny se mění jednou denně.' },
] as const;

export type DevelopmentFeature = typeof developmentFeatures[number]['key'];
export type DevelopmentFeatureSettings = Record<DevelopmentFeature, boolean>;

const storageKey = 'kartoteka-development-features-v1';
const featureStorage = () => (globalThis as typeof globalThis & {
  __KARTOTEKA_FEATURE_STORAGE__?: Pick<Storage, 'getItem' | 'setItem'>;
}).__KARTOTEKA_FEATURE_STORAGE__ ?? globalThis.localStorage;
const defaults = Object.fromEntries(developmentFeatures.map(({ key }) => [key, isDevelopmentVersion])) as DevelopmentFeatureSettings;

export const readDevelopmentFeatures = (): DevelopmentFeatureSettings => {
  const settings = { ...defaults };
  if (!isDevelopmentVersion) return settings;
  try {
    const stored: unknown = JSON.parse(featureStorage().getItem(storageKey) ?? 'null');
    if (stored && typeof stored === 'object') {
      for (const { key } of developmentFeatures) {
        const value = (stored as Record<string, unknown>)[key];
        if (typeof value === 'boolean') settings[key] = value;
      }
    }
  } catch {
    // Missing storage or an invalid saved value keeps features enabled.
  }
  return settings;
};

export const saveDevelopmentFeatures = (settings: DevelopmentFeatureSettings): void => {
  if (isDevelopmentVersion) featureStorage().setItem(storageKey, JSON.stringify(settings));
};

export const developmentFeatureEnabled = (feature: DevelopmentFeature): boolean =>
  readDevelopmentFeatures()[feature];
