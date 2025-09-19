import { Platform } from 'react-native';

let AsyncStorage: any = null;
try {
  // Lazy require to avoid bundling errors on web
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    if (AsyncStorage) {
      return await AsyncStorage.getItem(key);
    }
    return null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    if (AsyncStorage) {
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    if (AsyncStorage) {
      await AsyncStorage.removeItem(key);
    }
  }
};


