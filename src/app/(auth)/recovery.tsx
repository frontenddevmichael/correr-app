import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApi } from '@/api/ApiProvider';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Input } from '@/design-system/Input';
import { createThemedStyles, useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { AppText } from '@/design-system/typography';
import { isEmail, LIMITS, sanitizeEmail, VALIDATION_COPY } from '@/core/validation';
import {
  AuthBack,
  AuthWordmark,
  LinkText,
  useAuthInputStyle,
  useAuthLabelStyle,
} from '@/features/auth/AuthUi';

/**
 * Password recovery — design gap filled in the auth design language
 * (Poppins headline, quiet fields, ink CTA).
 */
export default function Recovery() {
  const api = useApi();
  const colors = useColors();
  const authInput = useAuthInputStyle();
  const authLabel = useAuthLabelStyle();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const cleanEmail = email.trim();
    if (!isEmail(cleanEmail)) {
      setError(VALIDATION_COPY.email);
      toast.show('Enter a valid email first.', { tone: 'error' });
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.requestPasswordReset(cleanEmail);
      setSent(true);
      toast.show('Reset email sent.', { tone: 'success' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not send the email. Try again.';
      setError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.body}>
            <AuthBack fallback="/(auth)/login" />
            <View style={styles.top}>
              <AuthWordmark />
            </View>
            <View style={styles.header}>
              <AppText variant="display" center>
                Reset your password.
              </AppText>
              <AppText variant="body" tone="secondary" center style={styles.subtitle}>
                Enter your email and we&apos;ll send you a reset link.
              </AppText>
            </View>

        {sent ? (
          <Card variant="outlined" style={styles.successCard}>
            <AppText style={styles.successTitle}>Check your inbox.</AppText>
            <AppText style={styles.successBody}>
              If an account exists for {email.trim()}, a reset link is on its way. It may take a
              minute to arrive.
            </AppText>
            <Button
              label="Send again"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={submit}
              loading={busy}
              style={styles.successAction}
            />
            <Button
              label="Use a different email"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => {
                setSent(false);
                setEmail('');
                setError(null);
              }}
            />
          </Card>
        ) : (
          <View style={styles.form}>
            <View>
              <AppText style={[styles.label, authLabel]}>Email</AppText>
              <Input
                placeholder="name@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                inputMode="email"
                returnKeyType="go"
                maxLength={LIMITS.email}
                value={email}
                error={error ?? undefined}
                onChangeText={(value) => {
                  setEmail(sanitizeEmail(value));
                  if (error) setError(null);
                }}
                onSubmitEditing={submit}
                containerStyle={styles.inputGap}
                style={authInput}
              />
            </View>
            <Button label="Send reset link" onPress={submit} loading={busy} />
          </View>
        )}

          <LinkText
            prefix="Remembered it?"
            link="Back to log in"
            onPress={() => router.replace('/(auth)/login')}
          />
          <LinkText
            prefix="Legal:"
            link="Terms, Privacy & AI Disclosure"
            onPress={() => router.push('/legal')}
          />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  body: {
    gap: 20,
  },
  top: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    maxWidth: 320,
  },
  form: { gap: 18 },
  label: {},
  inputGap: { marginTop: 6 },
  successCard: {
    gap: 8,
    padding: 20,
  },
  successTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  successBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  successAction: {
    marginTop: 8,
  },
}));
