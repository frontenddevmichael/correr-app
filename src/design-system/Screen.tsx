import { router } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from './icons';
import { Reveal } from './motion';
import { useColors } from './theme';
import { layout, radii, shadows, spacing } from './tokens';
import { AppText } from './typography';

interface ScreenProps {
  children: React.ReactNode;
  /** Tiny uppercase label above the title. */
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /**
   * Leading navigation affordance: 'push' renders a back chevron, 'close' an
   * xmark for modal-presentation screens.
   */
  back?: 'push' | 'close';
  /** Override the back affordance (e.g. wizard step navigation). */
  onBack?: () => void;
  header?: React.ReactNode;
  /** Compact action aligned with the display title. */
  titleAction?: React.ReactNode;
  scrollable?: boolean;
  padded?: boolean;
  footer?: React.ReactNode;
  /** Pull-to-refresh on the scroll surface. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Lift the scroll surface above the keyboard (forms with a pinned CTA). */
  avoidKeyboard?: boolean;
  edges?: Edge[];
  style?: ViewStyle;
  testID?: string;
}

/**
 * Standard screen shell.
 *
 * Display-sized title (Poppins), generous gutters, and bottom padding that
 * clears the floating tab bar so content never hides beneath it.
 */
export function Screen({
  children,
  eyebrow,
  title,
  subtitle,
  back,
  onBack,
  header,
  titleAction,
  scrollable = true,
  padded = true,
  footer,
  refreshing = false,
  onRefresh,
  avoidKeyboard = false,
  edges = ['top'],
  style,
  testID,
}: ScreenProps) {
  const colors = useColors();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const inner = (
    <View style={[padded && styles.padded, styles.inner]}>
      {back ? (
        <Pressable
          onPress={handleBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={back === 'close' ? 'Close' : 'Back'}
          style={({ pressed }) => [
            styles.navBack,
            {
              backgroundColor: colors.surface,
              ...shadows.subtle,
            },
            pressed && styles.navBackPressed,
          ]}
        >
          <Icon
            name={back === 'close' ? 'xmark' : 'chevronLeft'}
            size={back === 'close' ? 20 : 22}
            color={colors.textPrimary}
          />
        </Pressable>
      ) : null}
      {eyebrow ? (
        <AppText variant="overline" tone="muted" style={styles.eyebrow}>
          {eyebrow}
        </AppText>
      ) : null}
      {title ? (
        <Reveal distance={10} duration={380}>
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <AppText variant="display" style={styles.titleText}>
                {title}
              </AppText>
              {titleAction ? <View style={styles.titleAction}>{titleAction}</View> : null}
            </View>
            {subtitle ? (
              <AppText variant="body" tone="secondary" style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
        </Reveal>
      ) : null}
      {children}
    </View>
  );

  const body = (
    <>
      {scrollable ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.textSecondary}
                colors={[colors.textPrimary]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{inner}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { backgroundColor: colors.background }]}>{footer}</View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }, style]}
      edges={edges}
      testID={testID}
    >
      {header}
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    maxWidth: layout.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  inner: {
    flex: 1,
    gap: spacing.xl,
  },
  padded: {
    paddingHorizontal: spacing.xxl, // 24 — generous side gutters
    paddingTop: spacing.sm,
    paddingBottom: layout.screenBottomPadding,
  },
  eyebrow: {
    marginBottom: -spacing.md,
  },
  titleBlock: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  titleText: {
    flex: 1,
  },
  titleAction: {
    paddingTop: spacing.xs,
  },
  subtitle: {
    maxWidth: 420,
  },
  navBack: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    marginLeft: -6,
    marginBottom: spacing.xs,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  navBackPressed: {
    opacity: 0.45,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    maxWidth: layout.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
