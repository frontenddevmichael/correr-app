import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import { formatDateRange, formatMonthDay } from '@/core/dates';
import type { Hackathon, HackathonMilestone, HackathonSubmission, HackathonTeam } from '@/core/domain';
import { Badge } from '@/design-system/Badge';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Chip } from '@/design-system/Chip';
import { Input } from '@/design-system/Input';
import { Screen } from '@/design-system/Screen';
import { Skeleton } from '@/design-system/Skeleton';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import {
  isCode,
  isTeamName,
  isTitle,
  isUrl,
  LIMITS,
  sanitizeCode,
  sanitizeMultiline,
  sanitizeSingleLine,
  sanitizeTeamName,
  sanitizeUrl,
  VALIDATION_COPY,
} from '@/core/validation';

function dueInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}

const MILESTONE_DUE_OPTIONS = [
  { key: 'd1', label: 'Tomorrow', dueAt: () => dueInDays(1) },
  { key: 'd3', label: 'In 3 days', dueAt: () => dueInDays(3) },
  { key: 'd5', label: 'In 5 days', dueAt: () => dueInDays(5) },
];

/** Correr Build detail (Phase 7) — team, milestones as commitments, submission. */
export default function BuildDetail() {
  const api = useApi();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [team, setTeam] = useState<HackathonTeam | null>(null);
  const [milestones, setMilestones] = useState<HackathonMilestone[]>([]);
  const [submissions, setSubmissions] = useState<HackathonSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [msTitle, setMsTitle] = useState('');
  const [msDueKey, setMsDueKey] = useState('d1');
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subLink, setSubLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await api.listHackathons();
    const h = list.find((x) => x.id === id) ?? null;
    const t = await api.getTeam(id);
    const [ms, subs] = await Promise.all([
      t ? api.listTeamMilestones(t.id) : Promise.resolve([]),
      api.listSubmissions(id),
    ]);
    setHackathon(h);
    setTeam(t);
    setMilestones(ms);
    setSubmissions(subs);
    setLoading(false);
  }, [api, id]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.listHackathons(),
      api.getTeam(id),
      api.listSubmissions(id),
    ])
      .then(([list, t, subs]) => {
        const h = list.find((x) => x.id === id) ?? null;
        setHackathon(h);
        setTeam(t);
        setSubmissions(subs);
        if (!t) {
          setLoading(false);
          return;
        }
        api
          .listTeamMilestones(t.id)
          .then((ms) => {
            if (!active) return;
            setMilestones(ms);
            setLoading(false);
          })
          .catch(() => {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [api, id]);

  const guard = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      if (success) toast.show(success, { tone: 'success' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const joinOrMakeTeam = () => {
    if (mode === 'create') {
      if (!isTeamName(teamName.trim())) {
        setError(VALIDATION_COPY.teamName);
        toast.show('Check the team name.', { tone: 'error' });
        return;
      }
    } else if (!isCode(sanitizeCode(inviteCode))) {
      setError(VALIDATION_COPY.code);
      toast.show('Check the invite code.', { tone: 'error' });
      return;
    }
    setError(null);
    guard(async () => {
      if (mode === 'create') {
        await api.createTeam(id, teamName.trim());
        setTeamName('');
      } else {
        await api.joinTeam(sanitizeCode(inviteCode));
        setInviteCode('');
      }
    }, mode === 'create' ? 'Team created.' : 'Joined the team.');
  };

  const addMilestone = () => {
    const title = msTitle.trim();
    if (!isTitle(title)) {
      setMilestoneError(VALIDATION_COPY.title);
      return;
    }
    setMilestoneError(null);
    guard(async () => {
      if (!team) return;
      const due = MILESTONE_DUE_OPTIONS.find((d) => d.key === msDueKey) ?? MILESTONE_DUE_OPTIONS[0];
      await api.createTeamMilestone(team.id, title, due.dueAt());
      setMsTitle('');
    }, 'Milestone added.');
  };

  const advanceMilestone = (m: HackathonMilestone) =>
    guard(
      () =>
        api.updateTeamMilestone(m.id, {
          status: m.status === 'planned' ? 'active' : m.status === 'active' ? 'completed' : 'planned',
        }),
      m.status === 'planned'
        ? 'Milestone started.'
        : m.status === 'active'
          ? 'Milestone complete.'
          : 'Milestone reopened.',
    );

  const submitWork = () => {
    const title = subTitle.trim();
    const description = subDesc.trim();
    const link = subLink.trim();
    if (!isTitle(title)) {
      setSubmissionError(VALIDATION_COPY.title);
      return;
    }
    if (!description || description.length > LIMITS.longText) {
      setSubmissionError(`Add a description (up to ${LIMITS.longText} characters).`);
      return;
    }
    if (link && !isUrl(link)) {
      setSubmissionError(VALIDATION_COPY.url);
      return;
    }
    setSubmissionError(null);
    guard(async () => {
      await api.submit(id, { title, description, link: link || undefined });
      setSubTitle('');
      setSubDesc('');
      setSubLink('');
    }, 'Submission saved.');
  };

  if (loading) {
    return (
      <Screen back="push" title="Correr Build">
        <Skeleton height={140} />
        <Skeleton height={180} />
      </Screen>
    );
  }

  if (!hackathon) {
    return (
      <Screen back="push" title="Correr Build">
        <AppText variant="body" tone="secondary">
          Sprint not found.
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen
      back="push"
      title={hackathon.name}
      subtitle={`${hackathon.status[0].toUpperCase()}${hackathon.status.slice(1)} · ${formatDateRange(hackathon.startAt, hackathon.endAt)}`}
    >
      <Card variant="outlined">
        <AppText variant="bodyBold">Rules</AppText>
        <AppText variant="body" tone="secondary">
          {hackathon.rules}
        </AppText>
      </Card>

      {!team ? (
        <Card variant="outlined">
          <AppText variant="h3" style={styles.blockTitle}>
            Join the sprint
          </AppText>
          <View style={styles.modeRow}>
            <Chip label="Create a team" selected={mode === 'create'} onPress={() => setMode('create')} />
            <Chip label="Join with a code" selected={mode === 'join'} onPress={() => setMode('join')} />
          </View>
          {mode === 'create' ? (
            <Input
              label="Team name"
              placeholder="e.g. Dawn Ship Crew"
              value={teamName}
              onChangeText={(value) => setTeamName(sanitizeTeamName(value))}
              maxLength={LIMITS.nameMax}
              autoCapitalize="words"
              returnKeyType="done"
              containerStyle={styles.fieldGap}
            />
          ) : (
            <Input
              label="Team invite code"
              placeholder="e.g. K7X2QF"
              autoCapitalize="characters"
              autoCorrect={false}
              value={inviteCode}
              onChangeText={(value) => setInviteCode(sanitizeCode(value))}
              maxLength={LIMITS.codeMax}
              returnKeyType="done"
              containerStyle={styles.fieldGap}
            />
          )}
          {error ? (
            <AppText variant="caption" tone="error" style={styles.fieldGap}>
              {error}
            </AppText>
          ) : null}
          <Button
            label={mode === 'create' ? 'Create team' : 'Join team'}
            variant="primary"
            onPress={joinOrMakeTeam}
            loading={busy}
          />
        </Card>
      ) : (
        <>
          <Card variant="dark">
            <View style={styles.teamHeader}>
              <View style={styles.teamText}>
                <AppText variant="h2" tone="inverse">
                  {team.name}
                </AppText>
                <AppText variant="caption" tone="onDarkMuted">
                  {team.memberIds.length} member{team.memberIds.length > 1 ? 's' : ''}
                </AppText>
              </View>
              <View style={styles.codeWrap}>
                <AppText variant="overline" tone="inverse">
                  Invite code
                </AppText>
                <AppText variant="title" tone="inverse" style={styles.code}>
                  {team.inviteCode}
                </AppText>
              </View>
            </View>
          </Card>

          <Card variant="outlined">
            <AppText variant="h3" style={styles.blockTitle}>
              Team milestones
            </AppText>
            {milestones.length === 0 ? (
              <AppText variant="caption" tone="secondary">
                Break the sprint into milestones — each one keeps the team honest.
              </AppText>
            ) : (
              <View style={styles.rows}>
                {milestones.map((m) => (
                  <View key={m.id} style={styles.msRow}>
                    <Chip
                      label={
                        m.status === 'completed'
                          ? 'Reopen'
                          : m.status === 'active'
                            ? 'Mark done'
                            : 'Start'
                      }
                      selected={m.status === 'completed'}
                      onPress={() => advanceMilestone(m)}
                      disabled={busy}
                    />
                    <View style={styles.msText}>
                      <AppText variant="bodyMedium" tone={m.status === 'completed' ? 'muted' : 'primary'}>
                        {m.title}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        {m.status === 'completed'
                          ? 'Done'
                          : m.status === 'active'
                            ? 'Running'
                            : 'Planned'}{' '}
                        · due {formatMonthDay(new Date(m.dueAt))}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <Input
              placeholder="Add a milestone, e.g. “Ship the landing page”…"
              value={msTitle}
              onChangeText={(value) => setMsTitle(sanitizeSingleLine(value, LIMITS.titleMax))}
              maxLength={LIMITS.titleMax}
              returnKeyType="done"
              onSubmitEditing={addMilestone}
              containerStyle={styles.fieldGap}
            />
            <View style={styles.modeRow}>
              {MILESTONE_DUE_OPTIONS.map((d) => (
                <Chip
                  key={d.key}
                  label={d.label}
                  selected={msDueKey === d.key}
                  onPress={() => setMsDueKey(d.key)}
                />
              ))}
            </View>
            {milestoneError ? (
              <AppText variant="caption" tone="error" style={styles.errorText}>
                {milestoneError}
              </AppText>
            ) : null}
            <Button label="Add milestone" variant="secondary" size="sm" onPress={addMilestone} loading={busy} />
          </Card>

          <Card variant="outlined">
            <AppText variant="h3" style={styles.blockTitle}>
              Submission
            </AppText>
            {submissions.length > 0 ? (
              <View style={styles.rows}>
                {submissions.map((s) => (
                  <View key={s.id} style={styles.subCard}>
                    <View style={styles.msRow}>
                      <AppText variant="bodyBold" style={styles.msText}>
                        {s.title}
                      </AppText>
                      {s.score != null ? <Badge label={`Score ${s.score}`} tone="progress" /> : <Badge label="Submitted" tone="info" />}
                    </View>
                    <AppText variant="caption" tone="secondary">
                      {s.description}
                    </AppText>
                    {s.link ? (
                      <AppText variant="caption" tone="info">
                        {s.link}
                      </AppText>
                    ) : null}
                    {s.feedback ? (
                      <AppText variant="caption" tone="ai">
                        Judges: {s.feedback}
                      </AppText>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
            <Input
              label="What did your team ship?"
              placeholder="e.g. HabitOS — a study habit tracker"
              value={subTitle}
              onChangeText={(value) => {
                setSubTitle(sanitizeSingleLine(value));
                if (submissionError) setSubmissionError(null);
              }}
              maxLength={LIMITS.titleMax}
              containerStyle={styles.fieldGap}
            />
            <Input
              label="Description"
              placeholder="What it does and who it’s for…"
              multiline
              textAlignVertical="top"
              style={[styles.multiline, { minHeight: 80 }]}
              value={subDesc}
              onChangeText={(value) => {
                setSubDesc(sanitizeMultiline(value, LIMITS.longText));
                if (submissionError) setSubmissionError(null);
              }}
              maxLength={LIMITS.longText}
            />
            <Input
              label="Link (optional)"
              placeholder="https://…"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              value={subLink}
              onChangeText={(value) => {
                setSubLink(sanitizeUrl(value));
                if (submissionError) setSubmissionError(null);
              }}
              maxLength={LIMITS.url}
            />
            {submissionError ? (
              <AppText variant="caption" tone="error" style={styles.fieldGap}>
                {submissionError}
              </AppText>
            ) : null}
            <Button label="Submit work" onPress={submitWork} loading={busy} style={styles.fieldGap} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  blockTitle: {
    marginBottom: spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  fieldGap: {
    marginTop: spacing.md,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
  },
  teamText: {
    flex: 1,
    gap: 4,
  },
  codeWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  code: {
    letterSpacing: 3,
  },
  rows: {
    gap: spacing.md,
  },
  msRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  msText: {
    flex: 1,
  },
  subCard: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  errorText: {
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  multiline: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
});
