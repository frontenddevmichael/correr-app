import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TokenStorage } from '@convex-dev/auth/react';

/**
 * Browsers have no keychain API. AsyncStorage maps to localStorage on web,
 * which is the same trust boundary the browser already gives the app.
 */
export const authStorage: TokenStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
