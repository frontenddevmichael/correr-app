import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApi, useSession } from '@/api/ApiProvider';
import { CONSENT_VERSION } from '@/core/domain';
import { Button } from '@/design-system/Button';
import { Icon } from '@/design-system/icons';
import { Input } from '@/design-system/Input';
import { createThemedStyles, useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import {
  isEmail,
  isName,
  isPassword,
  LIMITS,
  sanitizeEmail,
  sanitizeName,
  VALIDATION_COPY,
} from '@/core/validation';
import {
  AuthBack,
  AuthWordmark,
  LinkText,
  useAuthInputStyle,
  useAuthLabelStyle,
} from '@/features/auth/AuthUi';
import { Eye, EyeOff } from '@/features/auth/EyeIcons';
import { hasSessionConsent } from '@/features/legal/sessionConsent';

export default function Signup() {
  const api = useApi();
  const colors = useColors();
  const authInput = useAuthInputStyle();
  const authLabel = useAuthLabelStyle();
  const toast = useToast();
  const { refresh } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  // The consent checkbox lives at the end of the legal review screen. When the
  // user returns, reflect the review they just completed without asking them to
  // tick a second box on this form.
  useFocusEffect(
    useCallback(() => {
      if (hasSessionConsent()) setAgreed(true);
    }, []),
  );

  const submit = async () => {
    setError(null);
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const nameOk = isName(cleanName);
    const emailOk = isEmail(cleanEmail);
    const passwordOk = isPassword(password);
    setNameError(nameOk ? null : VALIDATION_COPY.name);
    setEmailError(emailOk ? null : VALIDATION_COPY.email);
    setPasswordError(passwordOk ? null : VALIDATION_COPY.password);
    if (!nameOk || !emailOk || !passwordOk) {
      toast.show('Check the highlighted fields.', { tone: 'error' });
      return;
    }
    if (!agreed) {
      const message = 'Please accept the Terms & Privacy to create your account.';
      setError(message);
      toast.show(message, { tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      await api.signUp(cleanEmail, password);
      await api.updateProfile({ displayName: cleanName });
      // Consent is stored server-side with a timestamp; a failed write must not
      // strand the freshly created account, but the user should know.
      await api.recordConsent(CONSENT_VERSION).catch(() => {
        toast.show('Your consent record could not be saved. Please contact support if this repeats.', {
          tone: 'error',
        });
      });
      await refresh();
      toast.show('Account created.', { tone: 'success' });
      router.replace('/');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong. Try again.';
      setError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.body}>
            <AuthBack fallback="/(auth)/welcome" />
            <View style={styles.top}>
              <AuthWordmark />
            </View>
            <View style={styles.header}>
              <AppText variant="display" center>
                Let&apos;s get started.
              </AppText>
              <AppText variant="body" tone="secondary" center style={styles.subtitle}>
                Create your account and start running toward your vision.
              </AppText>
            </View>

          <View style={styles.form}>
            <View>
              <AppText style={[styles.label, authLabel]}>Full name</AppText>
              <Input
                placeholder="e.g. Jane Doe"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                maxLength={LIMITS.nameMax}
                value={name}
                error={nameError ?? undefined}
                onChangeText={(value) => {
                  setName(sanitizeName(value));
                  if (nameError) setNameError(null);
                }}
                onBlur={() => {
                  if (name.trim() && !isName(name)) setNameError(VALIDATION_COPY.name);
                }}
                containerStyle={styles.inputGap}
                style={authInput}
              />
            </View>
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
                returnKeyType="next"
                maxLength={LIMITS.email}
                value={email}
                error={emailError ?? undefined}
                onChangeText={(value) => {
                  setEmail(sanitizeEmail(value));
                  if (emailError) setEmailError(null);
                }}
                onBlur={() => {
                  if (email.trim() && !isEmail(email)) setEmailError(VALIDATION_COPY.email);
                }}
                containerStyle={styles.inputGap}
                style={authInput}
              />
            </View>
            <View>
              <AppText style={[styles.label, authLabel]}>Password</AppText>
              <View style={styles.passwordWrap}>
                <Input
                  placeholder={`${LIMITS.passwordMin} to ${LIMITS.passwordMax} characters`}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  maxLength={LIMITS.passwordMax}
                  value={password}
                  error={passwordError ?? undefined}
                  onChangeText={(value) => {
                    setPassword(value.slice(0, LIMITS.passwordMax));
                    if (passwordError) setPasswordError(null);
                  }}
                  onSubmitEditing={submit}
                  containerStyle={styles.flex}
                  style={authInput}
                />
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  style={styles.eye}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Pressable>
              </View>
              <AppText variant="caption" tone="muted" style={styles.hint}>
                At least {LIMITS.passwordMin} characters. No symbols required.
              </AppText>
            </View>
          </View>

          {error ? (
            <AppText variant="caption" tone="error" center>
              {error}
            </AppText>
          ) : null}

          {/* Consent gate. The actual checkbox sits at the end of the legal
              review screen so it cannot be ticked before the documents are in
              front of the reader. */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/legal/consent',
                params: { returnTo: 'signup' },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={
              agreed
                ? 'Legal documents reviewed. Open to review again.'
                : 'Review the Terms, Privacy Policy and AI Disclosure before creating an account.'
            }
            style={({ pressed }) => [
              styles.legalRow,
              {
                backgroundColor: colors.surface,
                borderColor: agreed ? colors.brand : colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[styles.legalIcon, { backgroundColor: colors.surfaceSunken }]}>
              <Icon
                name={agreed ? 'check' : 'shield'}
                size={18}
                color={colors.textPrimary}
              />
            </View>
            <View style={styles.legalText}>
              <AppText variant="bodyMedium">
                {agreed ? 'Legal documents reviewed' : 'Review before you continue'}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {agreed
                  ? 'You agreed to the Terms, Privacy Policy and AI Disclosure.'
                  : 'Open the full Terms, Privacy Policy and AI Disclosure. The checkbox is at the end.'}
              </AppText>
            </View>
            <Icon name="chevronRight" size={17} color={colors.textMuted} />
          </Pressable>

          <Button
            label="Create account"
            onPress={submit}
            loading={busy}
            disabled={!agreed}
          />

          <LinkText
            prefix="Already have an account?"
            link="Log in"
            onPress={() => router.replace('/(auth)/login')}
          />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  body: {
    gap: spacing.xl,
  },
  top: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtitle: {
    maxWidth: 300,
  },
  form: { gap: spacing.lg },
  label: {},
  inputGap: { marginTop: spacing.xs + 2 },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs + 2,
  },
  eye: {
    paddingHorizontal: spacing.sm,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  legalIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalText: {
    flex: 1,
    gap: 2,
  },
}));
