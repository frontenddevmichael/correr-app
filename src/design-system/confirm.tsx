import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { useColors } from './theme';
import { radii, shadows, spacing } from './tokens';
import { AppText } from './typography';

export type ConfirmButton = {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onPress?: () => void;
};

export interface ConfirmOptions {
  title: string;
  message?: string;
  buttons: ConfirmButton[];
}

/** Same call shape as `Alert.alert(title, message, buttons)`. */
type ConfirmFn = (title: string, message: string, buttons: ConfirmButton[]) => void;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Cross-platform replacement for `Alert.alert(title, message, buttons)`.
 *
 * react-native-web ships `Alert.alert` as an empty stub
 * (`class Alert { static alert() {} }`), so on web every native confirmation
 * silently did nothing: destructive actions looked broken (QA-011) and
 * non-destructive ones ran with no consent at all. This renders the same
 * `[cancel, destructive]` button contract in an in-app dialog so call sites
 * behave identically on iOS, Android and web.
 *
 * Reminder for new call sites: this is a replacement for `Alert.alert`, not an
 * additional pattern — do not import `Alert` from react-native anymore.
 */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (title, message, buttons) => setOptions({ title, message, buttons }),
    [],
  );
  const dismiss = useCallback(() => setOptions(null), []);

  const run = (button: ConfirmButton) => {
    setOptions(null);
    button.onPress?.();
  };

  const buttons = options?.buttons ?? [];
  const row = buttons.length <= 2;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        visible={options != null}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
      >
        <View style={styles.scrim}>
          {/* Tapping the backdrop cancels, like the cancel button. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            onPress={dismiss}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            {options ? (
              <>
                <AppText variant="h3">{options.title}</AppText>
                {options.message ? (
                  <AppText variant="body" tone="secondary" style={styles.message}>
                    {options.message}
                  </AppText>
                ) : null}
                <View style={[styles.actions, row ? styles.row : styles.column]}>
                  {buttons.map((button, index) => {
                    const variant =
                      button.style === 'destructive'
                        ? 'danger'
                        : button.style === 'cancel'
                          ? 'secondary'
                          : 'primary';
                    return (
                      <Button
                        key={`${button.text}-${index}`}
                        label={button.text}
                        variant={variant}
                        onPress={() => run(button)}
                        style={row ? styles.rowButton : undefined}
                      />
                    );
                  })}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(23, 20, 16, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.xxl,
    padding: spacing.xl,
    ...shadows.card,
  },
  message: {
    marginTop: spacing.sm,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  rowButton: {
    flex: 1,
  },
});
