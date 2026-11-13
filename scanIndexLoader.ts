// Downloads the artwork index once per app start (about 5 MB) and keeps it in memory.
// The web reads it from its own address; the phone from the matching web version.
import { Platform } from 'react-native';
import { isDevelopmentVersion, versionUrl } from './appVersion';
import { decodeIndex, type ScanIndex } from './cardHash';

export const SCAN_INDEX_FILE = 'scan-index-v1.bin';

let loading: Promise<ScanIndex | null> | null = null;

export const loadScanIndex = (): Promise<ScanIndex | null> => {
  loading ??= (async () => {
    try {
      const base = Platform.OS === 'web' ? '/' : versionUrl(isDevelopmentVersion);
      const response = await fetch(`${base}${SCAN_INDEX_FILE}`);
      if (!response.ok) return null;
      return decodeIndex(await response.arrayBuffer());
    } catch {
      return null;
    }
  })();
  const current = loading;
  // A failed download is tried again next time instead of being remembered.
  void current.then(index => { if (!index && loading === current) loading = null; });
  return current;
};
