import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/design-system/Badge';
import { Card } from '@/design-system/Card';
import { Icon } from '@/design-system/icons';
import { Reveal } from '@/design-system/motion';
import { Screen } from '@/design-system/Screen';
import { useColors } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

/**
 * Legal — Privacy, Terms, and disclosures.
 *
 * DRAFT status: every section below is placeholder copy marked "draft for
 * lawyer review". It is intentionally visible in-app so reviewers can read it
 * in context, but it is not final legal advice and must be reviewed by counsel
 * before production launch.
 *
 * Also hosts the third-party AI disclosure (OpenRouter) and the account
 * data-export / deletion entry points.
 */

interface Section {
  heading: string;
  updated: string;
  paragraphs: string[];
}

const SECTIONS: Section[] = [
  {
    heading: 'Privacy Policy',
    updated: 'Draft v0.1 · for lawyer review',
    paragraphs: [
      'This draft explains what Correr collects, why, and how you can control it. In plain terms: we store the account details you give us (email, name), the commitments and visions you create, and basic usage needed to run the app.',
      'Your content stays tied to your account. We do not sell your personal data. AI features send only the minimum context needed (for example your vision text and today’s commitments) to our AI provider to generate a response; your password is never sent to the AI provider.',
      'You can export or delete your data at any time from Account. Deleting your account removes your commitments, visions, progress and messages.',
      'GDPR / NDPR: if you are in the EU/UK or Nigeria, you have the right to access, correct, export, restrict and delete your personal data, to object to certain processing, and to lodge a complaint with your supervisory authority. Lawful basis: contract (running your account), consent (AI features and non-essential storage), legitimate interest (security and abuse prevention).',
      'Retention: data is kept while your account exists; deleting your account removes it from active systems promptly, and routine backups age out within 30 days. Security: passwords are stored only as cryptographic hashes; the session lives in your device\u2019s secure storage. If a breach ever affects your data we will notify you and the relevant authorities within legally required timelines. Transfers: storage runs on Convex (Cloudflare) and AI requests are processed by OpenRouter, which may process data outside your country; transfer safeguards are being confirmed by counsel.',
      'Children: Correr is not directed at children below the age of digital consent in their region (typically 13\u201316, 16 in the EU); accounts below that age will be removed on discovery.',
    ],
  },
  {
    heading: 'Terms of Service',
    updated: 'Draft v0.1 · for lawyer review',
    paragraphs: [
      'This draft sets the agreement between you and Correr for use of the app. You are responsible for keeping your credentials safe and for the content you enter.',
      'Correr provides planning and coaching tools to help you act on your own goals. It is not medical, legal, financial or mental-health advice, and it is not a substitute for professional help.',
      'Subscriptions, if enabled, renew until cancelled and can be managed wherever you purchased. Final billing terms, governing law and dispute resolution will be confirmed by counsel before launch.',
      'No outcomes are promised: Correr is a planning and coaching tool, and no specific result is guaranteed \u2014 what you get out depends on your own actions. AI-generated replies can be wrong or incomplete; check anything important yourself before relying on it.',
      'You must be at least the age of digital consent in your region to use Correr, and you are responsible for the accuracy of the content you enter.',
    ],
  },
  {
    heading: 'Cookie & local storage notice',
    updated: 'Draft v0.1 · for lawyer review',
    paragraphs: [
      'Correr stores a small amount of data locally on your device (theme and setup progress) and uses secure platform storage for your sign-in session. On the web, essential cookies keep you signed in; there are no advertising or cross-site tracking cookies.',
      'Consent for non-essential storage, where required, is collected at sign-up and can be changed later.',
    ],
  },
  {
    heading: 'Third-party AI disclosure',
    updated: 'Draft v0.1 · for lawyer review',
    paragraphs: [
      'Correr uses a third-party AI service (OpenRouter) to generate coaching replies and roadmaps. When you use these features, the relevant prompt context is processed by the AI provider to produce a response. This disclosure is repeated at sign-up.',
      'The AI provider is instructed not to use your content for its own purposes beyond returning the response, per our agreement. Provider details and subprocessors will be listed here before launch.',
    ],
  },
];

export default function Legal() {
  const colors = useColors();

  return (
    <Screen
      back="push"
      eyebrow="Legal"
      title="Legal."
      subtitle="Plain-language drafts of how Correr handles your data and this agreement."
    >
      <Reveal>
        <Card variant="muted" style={styles.notice} accessibilityRole="alert">
          <View style={styles.noticeHead}>
            <Icon name="doc" size={18} color={colors.textPrimary} />
            <AppText variant="h3">Draft for lawyer review</AppText>
          </View>
          <AppText variant="caption" tone="secondary">
            These documents are working drafts written for clarity, not final legal advice. They
            must be reviewed by a qualified lawyer before production launch.
          </AppText>
          <Badge label="Not final" tone="muted" />
        </Card>
      </Reveal>

      {SECTIONS.map((section, i) => (
        <Reveal key={section.heading} delay={60 + i * 60}>
          <Card variant="outlined" style={styles.section}>
            <View style={styles.sectionHead}>
              <AppText variant="h2">{section.heading}</AppText>
            </View>
            <AppText variant="overline" tone="muted" style={styles.updated}>
              {section.updated}
            </AppText>
            {section.paragraphs.map((p, index) => (
              <AppText key={index} variant="body" tone="secondary" style={styles.paragraph}>
                {p}
              </AppText>
            ))}
          </Card>
        </Reveal>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: spacing.sm,
  },
  noticeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  updated: {
    marginBottom: spacing.xs,
  },
  paragraph: {
    lineHeight: 24,
  },
});
