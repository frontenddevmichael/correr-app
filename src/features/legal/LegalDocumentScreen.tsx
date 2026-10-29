import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Screen } from '@/design-system/Screen';
import { useColors } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

import {
  LEGAL_UPDATED,
  LEGAL_VERSION,
  type LegalBlock,
  type LegalDocument,
} from './content';

function Block({ block }: { block: LegalBlock }) {
  const colors = useColors();

  if (block.kind === 'paragraph') {
    return (
      <AppText variant="body" tone="secondary" selectable style={styles.paragraph}>
        {block.text}
      </AppText>
    );
  }

  if (block.kind === 'bullets') {
    return (
      <View style={styles.bullets}>
        {block.items.map((item) => (
          <View key={item} style={styles.bulletRow}>
            <View style={[styles.bulletDot, { backgroundColor: colors.textMuted }]} />
            <AppText variant="body" tone="secondary" selectable style={styles.bulletText}>
              {item}
            </AppText>
          </View>
        ))}
      </View>
    );
  }

  return (
    <Card variant="muted" style={styles.callout}>
      <AppText variant="bodyBold">{block.title}</AppText>
      <AppText variant="caption" tone="secondary" selectable style={styles.calloutText}>
        {block.text}
      </AppText>
    </Card>
  );
}

/**
 * Full-screen legal document. Every route uses the same shell so the back
 * affordance, version line and reading rhythm stay consistent.
 */
export function LegalDocumentScreen({ document }: { document: LegalDocument }) {
  return (
    <Screen
      back="push"
      eyebrow="Legal"
      title={document.title}
      subtitle={document.summary}
      contentPaddingBottom={spacing.xxl}
      edges={['top', 'bottom']}
    >
      <View style={styles.meta}>
        <AppText variant="overline" tone="muted">
          Version {LEGAL_VERSION}
        </AppText>
        <AppText variant="overline" tone="muted">
          Updated {LEGAL_UPDATED}
        </AppText>
      </View>

      {document.sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <AppText variant="h2">{section.heading}</AppText>
          {section.blocks.map((block, index) => (
            <Block key={`${section.id}-${index}`} block={block} />
          ))}
        </View>
      ))}

      <View style={styles.footer}>
        <AppText variant="caption" tone="muted" center>
          This document is part of the agreement between you and Correr.
        </AppText>
        <Button
          label="Back to legal"
          variant="secondary"
          fullWidth={false}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/legal');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.22)',
  },
  section: {
    gap: spacing.md,
  },
  paragraph: {
    lineHeight: 24,
  },
  bullets: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 9,
  },
  bulletText: {
    flex: 1,
    lineHeight: 24,
  },
  callout: {
    gap: spacing.xs,
  },
  calloutText: {
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
