import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';

/**
 * Typefaces.
 *
 *  - **Poppins** (400/500/600) — the display voice. Geometric, editorial and
 *    lighter than the previous 800-weight display face. Headlines use 600;
 *    supporting display lines use 400/500.
 *  - **Inter** (400–700) — the working voice: body, labels, buttons, captions.
 *
 * Each weight is a real font file, so `AppText` never asks the platform to
 * synthesise bold. That was the source of the "too heavy" display text.
 */
export function useLoadFonts(): boolean {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });
  return loaded;
}
