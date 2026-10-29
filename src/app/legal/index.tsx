import { router, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/api/ApiProvider';
import { Badge } from '@/design-system/Badge';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Icon, type IconName } from '@/design-system/icons';
import { MotionPressable, Reveal } from '@/design-system/motion';
import { Screen } from '@/design-system/Screen';
import { useColors } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import { CONSENT_VERSION } from '@/core/domain';
import {
  LEGAL_DOCUMENTS,
  LEGAL_UPDATED,
  LEGAL_VERSION,
  PRIVACY_EMAIL,
  SUPPORT_EMAIL,
  type LegalDocument,
} from '@/features/legal/content';

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

function formatConsentDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Legal hub. The documents themselves are separate full-screen routes so a
 * reader never has to hunt through an accordion on a phone.
 */
export default function LegalIndex() {
  const colors = useColors();
  const { profile, refresh } = useSession();
  const currentConsent = profile?.consentVersion === CONSENT_VERSION;
  const agreedOn = formatConsentDate(profile?.consentAt);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
    }, [refresh]),
  );

  return (
    <Screen
      back="push"
      eyebrow="Legal"
      title="Legal."
      subtitle="The agreement, the privacy terms, and how AI works. Read each one in full."
      contentPaddingBottom={spacing.xxl}
      edges={['top', 'bottom']}
    >
      <Reveal>
        <Card variant="muted" style={styles.intro}>
          <View style={styles.introHead}>
            <View style={[styles.introIcon, { backgroundColor: colors.surface }]}>
              <Icon name="shield" size={18} color={colors.textPrimary} />
            </View>
            <View style={styles.introText}>
              <AppText variant="bodyBold">Written to be read.</AppText>
              <AppText variant="caption" tone="secondary">
                Each document opens full screen. Your agreement sits at the end of the review
                screen, so you can confirm only after you have had the chance to read.
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
      </Reveal>

      <View style={styles.docs}>
        {LEGAL_DOCUMENTS.map((document, index) => (
          <Reveal key={document.id} delay={60 + index * 50}>
            <MotionPressable
              onPress={() => router.push(DOC_ROUTES[document.id])}
              accessibilityRole="link"
              accessibilityLabel={`${document.title}. ${document.summary}`}
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
                  <AppText variant="caption" tone="secondary" numberOfLines={3}>
                    {document.summary}
                  </AppText>
                </View>
                <Icon name="chevronRight" size={17} color={colors.textMuted} />
              </Card>
            </MotionPressable>
          </Reveal>
        ))}
      </View>

      <Reveal delay={220}>
        <View style={styles.section}>
          <AppText variant="overline" tone="muted" style={styles.sectionLabel}>
            Your agreement
          </AppText>
          <Card variant={currentConsent ? 'filled' : 'outlined'} style={styles.consentCard}>
            <View style={styles.consentHead}>
              <View style={styles.consentTitle}>
                <AppText variant="bodyBold">
                  {currentConsent ? 'You are up to date.' : 'Please review the current terms.'}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {currentConsent
                    ? `You agreed to version ${profile?.consentVersion}${
                        agreedOn ? ` on ${agreedOn}` : ''
                      }.`
                    : 'Your account needs a current consent record before you continue using Correr.'}
                </AppText>
              </View>
              <Badge
                label={currentConsent ? 'Current' : 'Review'}
                tone={currentConsent ? 'progress' : 'info'}
              />
            </View>
            <Button
              label={currentConsent ? 'Review the documents' : 'Review and agree'}
              variant={currentConsent ? 'secondary' : 'primary'}
              onPress={() =>
                router.push({
                  pathname: '/legal/consent',
                  params: { returnTo: 'legal' },
                })
              }
            />
          </Card>
        </View>
      </Reveal>

      <Reveal delay={260}>
        <Card variant="outlined" style={styles.contact}>
          <AppText variant="bodyBold">Questions or requests</AppText>
          <AppText variant="caption" tone="secondary">
            Privacy: {PRIVACY_EMAIL}
            {'\n'}
            Support: {SUPPORT_EMAIL}
          </AppText>
        </Card>
      </Reveal>
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
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    marginLeft: spacing.xs,
  },
  consentCard: {
    gap: spacing.md,
  },
  consentHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  consentTitle: {
    flex: 1,
    gap: 2,
  },
  contact: {
    gap: spacing.xs,
  },
});
