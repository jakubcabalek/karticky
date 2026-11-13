// Runs before the app on iOS/Android (imported first in index.ts).
// The web chooses the version by its address; a phone app has one address, so
// the choice is kept in a small file and applied before any module reads it.
import { File, Paths } from 'expo-file-system';

type SimpleStorage = Pick<Storage, 'getItem' | 'setItem'>;
type RuntimeGlobal = {
  __KARTICKY_APP_CHANNEL__?: 'development' | 'production';
  __KARTICKY_FEATURE_STORAGE__?: SimpleStorage;
};

const runtime = globalThis as unknown as RuntimeGlobal;
const channelFile = () => new File(Paths.document, 'karticky-app-channel.txt');

try {
  const file = channelFile();
  if (file.exists) {
    const channel = file.textSync().trim();
    if (channel === 'development' || channel === 'production') runtime.__KARTICKY_APP_CHANNEL__ = channel;
  }
} catch {
  // Without a readable choice the build's own channel applies.
}

// Cloud configuration reads these switches synchronously during startup.
const fileFor = (key: string) => new File(Paths.document, `karticky-setting-${encodeURIComponent(key)}.txt`);
runtime.__KARTICKY_FEATURE_STORAGE__ = {
  getItem: key => {
    const file = fileFor(key);
    return file.exists ? file.textSync() : null;
  },
  setItem: (key, value) => {
    const file = fileFor(key);
    if (!file.exists) file.create();
    file.writeSync(value);
  },
};

export const saveNativeAppChannel = (development: boolean) => {
  const file = channelFile();
  if (!file.exists) file.create();
  file.writeSync(development ? 'development' : 'production');
};
