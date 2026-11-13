import { isDevelopmentVersion } from './appVersion';

// Every new feature starts here: on in the test version, off in production until
// the owner releases it. A released feature loses its switch and the code path without it.
// Empty while the app is not shared with anyone: everything goes straight into the one version.
export const developmentFeatures: readonly { key: string; title: string; description: string }[] = [];

export type DevelopmentFeature = string;
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
