import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icons';
import { useReducedMotion } from './motion';
import { useHaptics } from './settings';
import { useColors } from './theme';
import { radii, shadows, spacing } from './tokens';
import { AppText } from './typography';

type ToastTone = 'default' | 'success' | 'error';

interface ToastOptions {
  tone?: ToastTone;
  duration?: number;
}

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

/**
 * Small, single-line confirmations for actions that otherwise happen silently
 * (saved, copied, completed). Destructive actions still use a native alert.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const haptics = useHaptics();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);

  const hide = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: reduced ? 0 : 160,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [progress, reduced]);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      const tone = options?.tone ?? 'default';
      if (tone === 'success') haptics.success();
      else if (tone === 'error') haptics.error();
      const duration = options?.duration ?? 2600;
      setToast({
        id: nextId.current++,
        message,
        tone,
        duration,
      });
      progress.stopAnimation();
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: reduced ? 0 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(hide, duration);
    },
    [hide, progress, reduced, haptics],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const value = useMemo(() => ({ show }), [show]);
  const icon: IconName =
    toast?.tone === 'error' ? 'alert' : toast?.tone === 'success' ? 'checkCircle' : 'bell';

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={[styles.layer, { top: insets.top + 10 }]}>
          <Animated.View
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              {
                backgroundColor: colors.textPrimary,
                opacity: progress,
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                ],
              },
              shadows.card,
            ]}
          >
            <Icon name={icon} size={17} color={colors.textInverse} />
            <AppText variant="bodyMedium" style={[styles.message, { color: colors.textInverse }]}>
              {toast.message}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss message"
              onPress={hide}
              hitSlop={10}
              style={styles.close}
            >
              <Icon name="xmark" size={14} color={colors.textInverse} />
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 100,
  },
  toast: {
    minHeight: 46,
    maxWidth: 440,
    width: '100%',
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  close: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
