import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApi, useSession } from '@/api/ApiProvider';
import { Icon } from '@/design-system/icons';
import { Reveal } from '@/design-system/motion';
import { useColors } from '@/design-system/theme';
import { radii, shadows, spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import { useWizardState } from './wizardStore';

/**
 * Dismissible home prompts, one at a time:
 *
 * 1. Resume — an unfinished / skipped seed wizard (re-enters at the saved step).
 * 2. Vision entry — the wizard is settled but no vision exists (the user
 *    skipped the vision step). A single, clear door into vision creation;
 *    once a vision exists this never renders again.
 *
 * Both render nothing once dismissed or no longer relevant (both persisted).
 */
export function WizardResumePrompt() {
  const api = useApi();
  const { session, profile } = useSession();
  const userId = session?.user.id ?? profile?.userId ?? null;
  const { ready, state, setState } = useWizardState(userId);
  // undefined = still checking; true = at least one vision exists.
  const [hasVision, setHasVision] = useState<boolean | undefined>(undefined);

  const checkVision = useCallback(() => {
    let alive = true;
    api
      .listVisions('active')
      .then((list) => {
        if (alive) setHasVision(list.length > 0);
      })
      .catch(() => {
        // On failure stay quiet — the Vision tab empty state still exists.
        if (alive) setHasVision(true);
      });
    return () => {
      alive = false;
    };
  }, [api]);

  useEffect(() => checkVision(), [checkVision]);

  if (!ready) return null;

  // 1. Unfinished setup — resume where the user stopped.
  const hasProgress = state.step > 0 || Object.keys(state.answers).length > 0;
  if (!state.completed && hasProgress) {
    if (state.promptDismissed) return null;
    const dismiss = () => setState({ ...state, promptDismissed: true });
    const resume = () => router.push('/(onboarding)/seed-wizard');

    return (
      <Reveal>
        <PromptCard
          icon="sparkles"
          title="Finish your setup"
          body="You stopped partway through. Pick up where you left off."
          onPress={resume}
          onDismiss={dismiss}
          dismissLabel="Dismiss setup prompt"
        />
      </Reveal>
    );
  }

  // 2. Setup settled, vision skipped — one clear entry point, once.
  if (hasVision === false && !state.visionPromptDismissed) {
    const dismiss = () => setState({ ...state, visionPromptDismissed: true });
    const create = () => router.push('/vision/new');

    return (
      <Reveal>
        <PromptCard
          icon="compass"
          title="Name your vision"
          body="One sentence about the future you're running toward — the AI draws the road."
          onPress={create}
          onDismiss={dismiss}
          dismissLabel="Dismiss vision prompt"
        />
      </Reveal>
    );
  }

  return null;
}

function PromptCard({
  icon,
  title,
  body,
  onPress,
  onDismiss,
  dismissLabel,
}: {
  icon: 'sparkles' | 'compass';
  title: string;
  body: string;
  onPress: () => void;
  onDismiss: () => void;
  dismissLabel: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, ...shadows.card }]}
      accessibilityRole="summary"
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={body}
        style={styles.body}
      >
        <View style={[styles.icon, { backgroundColor: colors.surfaceSunken }]}>
          <Icon name={icon} size={18} color={colors.brand} />
        </View>
        <View style={styles.text}>
          <AppText variant="h3">{title}</AppText>
          <AppText variant="caption" tone="secondary">
            {body}
          </AppText>
        </View>
        <Icon name="chevronRight" size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
        hitSlop={10}
        style={styles.close}
      >
        <Icon name="xmark" size={15} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.card,
    paddingRight: spacing.sm,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
