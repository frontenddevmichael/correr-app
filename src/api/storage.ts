import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const memory = new Map<string, string>();

/**
 * Tiny async key-value adapter.
 * Web: localStorage (falls back to in-memory before hydration). Native: AsyncStorage.
 */
export const kv = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return memory.get(key) ?? null;
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') {
        memory.set(key, value);
        return;
      }
      localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') {
        memory.delete(key);
        return;
      }
      localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};
