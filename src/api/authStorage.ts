import type { TokenStorage } from '@convex-dev/auth/react';
import * as SecureStore from 'expo-secure-store';

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Native auth tokens are bearer credentials, so they live in the platform
 * keychain instead of plain AsyncStorage.
 */
export const authStorage: TokenStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) =>
    SecureStore.setItemAsync(key, value, secureStoreOptions),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};
