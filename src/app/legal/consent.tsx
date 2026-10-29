import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApi, useSession } from '@/api/ApiProvider';
import { Badge } from '@/design-system/Badge';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Icon, type IconName } from '@/design-system/icons';
import { MotionPressable } from '@/design-system/motion';
import { Screen } from '@/design-system/Screen';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import { CONSENT_VERSION } from '@/core/domain';
import {
  LEGAL_DOCUMENTS,
  LEGAL_UPDATED,
  LEGAL_VERSION,
  type LegalDocument,
} from '@/features/legal/content';
import { setSessionConsent } from '@/features/legal/sessionConsent';

const DOC_ICONS: Record<LegalDocument['id'], IconName> = {
  terms: 'doc',
  privacy: 'shield',
  ai: 'sparkles',
};

const DOC_ROUTES = {
  terms: '/legal/terms',
  privacy: '/legal/privacy',
  ai: '/legal/ai',
} as const;

/**
 * The deliberate consent stop.
 *
 * The confirm checkbox lives at the end of the scroll, and stays disabled until
 * the reader reaches the bottom. The sticky action below is the only way back
 * to signup or the legal hub, so the agreement is never buried in a form.
 */
export default function LegalConsentScreen() {
  const colors = useColors();
  const api = useApi();
  const toast = useToast();
  const { profile, refresh } = useSession();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = params.returnTo;
  const isSignup = returnTo === 'signup';

  const [checked, setChecked] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [saving, setSaving] = useState(false);
  const viewportRef = useRef(0);
  const contentRef = useRef(0);
  // Last known scroll offset. Layout/content-size events must re-evaluate at
  // the *current* position, not at 0 — otherwise the end-of-scroll UI itself
  // (which changes the content height) resets `atEnd` the moment it renders.
  const offsetRef = useRef(0);

  const checkEnd = useCallback((offsetY: number) => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (viewport <= 0 || content <= 0) return;
    if (content <= viewport + 48) {
      setAtEnd(true);
      return;
    }
    setAtEnd(offsetY + viewport >= content - 48);
  }, []);

  const agree = async () => {
    if (!checked || !atEnd || saving) return;
    setSessionConsent(true);
    if (isSignup || !profile) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      await api.recordConsent(CONSENT_VERSION);
      await refresh();
      toast.show('Your agreement has been saved.', { tone: 'success' });
      router.back();
    } catch {
      toast.show('Could not save your agreement. Try again.', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      back="push"
      eyebrow="Legal"
      title="Before you continue."
      subtitle="Open each document, read to the end, then confirm your agreement. The checkbox is at the bottom of this page."
      contentPaddingBottom={spacing.xxl}
      edges={['top', 'bottom']}
      scrollViewProps={{
        onLayout: (event) => {
          viewportRef.current = event.nativeEvent.layout.height;
          checkEnd(offsetRef.current);
        },
        onContentSizeChange: (_, height) => {
          contentRef.current = height;
          checkEnd(offsetRef.current);
        },
        onScroll: (event) => {
          offsetRef.current = event.nativeEvent.contentOffset.y;
          checkEnd(event.nativeEvent.contentOffset.y);
        },
        scrollEventThrottle: 32,
      }}
      footer={
        <Button
          label={isSignup ? 'Agree and return to sign up' : 'Agree and save'}
          onPress={() => void agree()}
          disabled={!checked || !atEnd}
          loading={saving}
        />
      }
    >
        <Card variant="muted" style={styles.intro}>
          <View style={styles.introHead}>
            <View style={[styles.introIcon, { backgroundColor: colors.surface }]}>
              <Icon name="shield" size={18} color={colors.textPrimary} />
            </View>
            <View style={styles.introText}>
              <AppText variant="bodyBold">One agreement, three documents.</AppText>
              <AppText variant="caption" tone="secondary">
                The Terms set the rules. The Privacy Policy explains your data. The AI Disclosure
                explains what the coach does and what it cannot do.
              </AppText>
            </View>
          </View>
          <View style={styles.meta}>
            <AppText variant="overline" tone="muted">
              Version {LEGAL_VERSION}
            </AppText>
            <AppText variant="overline" tone="muted">
              Updated {LEGAL_UPDATED}
            </AppText>
          </View>
        </Card>

        <View style={styles.docs}>
          {LEGAL_DOCUMENTS.map((document) => (
            <MotionPressable
              key={document.id}
              onPress={() => router.push(DOC_ROUTES[document.id])}
              accessibilityRole="link"
              accessibilityLabel={`Read the ${document.title}`}
            >
              <Card variant="outlined" style={styles.docCard}>
                <View style={[styles.docIcon, { backgroundColor: colors.surfaceSunken }]}>
                  <Icon
                    name={DOC_ICONS[document.id]}
                    size={20}
                    color={colors.textPrimary}
                  />
                </View>
                <View style={styles.docText}>
                  <AppText variant="bodyBold">{document.title}</AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={2}>
                    {document.summary}
                  </AppText>
                </View>
                <View style={styles.readAction}>
                  <AppText variant="caption" tone="muted">
                    Read
                  </AppText>
                  <Icon name="chevronRight" size={16} color={colors.textMuted} />
                </View>
              </Card>
            </MotionPressable>
          ))}
        </View>

        <View style={styles.section}>
          <AppText variant="h2">What you are confirming</AppText>
          <View style={styles.summaryList}>
            {[
              'You will follow the Terms of Service and the acceptable-use rules.',
              'You understand how Correr collects, uses and shares data, and the rights you have.',
              'You understand that AI output can be wrong and is not professional advice.',
            ].map((item) => (
              <View key={item} style={styles.summaryRow}>
                <View style={[styles.summaryDot, { backgroundColor: colors.textMuted }]} />
                <AppText variant="body" tone="secondary" style={styles.summaryText}>
                  {item}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        <Card variant="outlined" style={styles.confirmCard}>
          <View style={styles.confirmHead}>
            <View style={styles.confirmTitle}>
              <AppText variant="bodyBold">Confirm your agreement</AppText>
              <AppText variant="caption" tone="secondary">
                {atEnd
                  ? 'You have reached the end. Check the box to continue.'
                  : 'Scroll to the end to enable the checkbox.'}
              </AppText>
            </View>
            <Badge
              label={checked ? 'Agreed' : atEnd ? 'Ready' : 'Read first'}
              tone={checked ? 'progress' : atEnd ? 'info' : 'muted'}
            />
          </View>

          <Pressable
            onPress={() => {
              if (atEnd) setChecked((current) => !current);
            }}
            disabled={!atEnd}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled: !atEnd }}
            accessibilityLabel="I have read and agree to the Terms of Service, Privacy Policy and AI Disclosure"
            style={[styles.checkRow, !atEnd && styles.checkRowDisabled]}
          >
            <View
              style={[
                styles.checkBox,
                checked && {
                  backgroundColor: colors.brand,
                  borderColor: colors.brand,
                },
              ]}
            >
              {checked ? <Icon name="check" size={14} color={colors.brandInverse} /> : null}
            </View>
            <AppText variant="caption" tone="secondary" style={styles.checkText}>
              I have read and agree to the Terms of Service, Privacy Policy and AI Disclosure. I
              understand that I can withdraw consent or delete my account at any time.
            </AppText>
          </Pressable>
        </Card>

        <AppText variant="caption" tone="muted" center style={styles.legalNote}>
          If you do not agree, close this screen and do not create an account. Existing account
          holders can delete their account from Account.
        </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.md,
  },
  introHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  introIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: {
    flex: 1,
    gap: 2,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.22)',
  },
  docs: {
    gap: spacing.md,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  docIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docText: {
    flex: 1,
    gap: 2,
  },
  readAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  section: {
    gap: spacing.md,
  },
  summaryList: {
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  summaryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 9,
  },
  summaryText: {
    flex: 1,
    lineHeight: 24,
  },
  confirmCard: {
    gap: spacing.md,
  },
  confirmHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  confirmTitle: {
    flex: 1,
    gap: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkRowDisabled: {
    opacity: 0.55,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(128,128,128,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkText: {
    flex: 1,
    lineHeight: 19,
  },
  legalNote: {
    maxWidth: 420,
    alignSelf: 'center',
    lineHeight: 18,
  },
});
