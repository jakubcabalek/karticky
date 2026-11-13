// Keeps the library on the device. The test version stores its data under a
// separate key, so trying things out never touches real data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDevelopmentVersion } from './appVersion';
import { emptyLibrary, normalizeLibrary, type Library } from './cardData';

export const libraryStorageKey = isDevelopmentVersion ? 'karticky-dev-library-v1' : 'karticky-library-v1';

export const loadLibrary = async (): Promise<Library> => {
  try {
    const saved = await AsyncStorage.getItem(libraryStorageKey);
    return saved ? normalizeLibrary(JSON.parse(saved)) : emptyLibrary();
  } catch {
    return emptyLibrary();
  }
};

export const saveLibrary = (library: Library) => AsyncStorage.setItem(libraryStorageKey, JSON.stringify(library));
