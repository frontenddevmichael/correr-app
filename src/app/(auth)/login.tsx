import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApi, useSession } from '@/api/ApiProvider';
import { Button } from '@/design-system/Button';
import { Input } from '@/design-system/Input';
import { createThemedStyles, useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import {
  isEmail,
  isPassword,
  LIMITS,
  sanitizeEmail,
  VALIDATION_COPY,
} from '@/core/validation';
import {
  GoogleButton,
  LinkText,
  OrDivider,
  useAuthInputStyle,
  useAuthLabelStyle,
} from '@/features/auth/AuthUi';
import { Eye, EyeOff } from '@/features/auth/EyeIcons';

export default function Login() {
  const api = useApi();
  const colors = useColors();
  const authInput = useAuthInputStyle();
  const authLabel = useAuthLabelStyle();
  const toast = useToast();
  const { refresh } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    const cleanEmail = email.trim();
    const emailOk = isEmail(cleanEmail);
    const passwordOk = isPassword(password);
    setEmailError(emailOk ? null : VALIDATION_COPY.email);
    setPasswordError(passwordOk ? null : VALIDATION_COPY.password);
    if (!emailOk || !passwordOk) {
      toast.show(!emailOk ? 'Check your email address.' : 'Check your password.', {
        tone: 'error',
      });
      return;
    }
    setBusy(true);
    try {
      await api.signIn(cleanEmail, password);
      await refresh();
      toast.show('Welcome back.', { tone: 'success' });
      router.replace('/');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong. Try again.';
      setError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      await api.signInWithGoogle();
      await refresh();
      router.replace('/');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Google sign-in failed.', { tone: 'error' });
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
        <View style={styles.body}>
          <View style={styles.header}>
            <AppText style={styles.title}>Welcome back.</AppText>
            <AppText style={styles.subtitle}>
              Your vision is waiting. Let&apos;s keep moving.
            </AppText>
          </View>

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
                  placeholder="Your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
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
              <Pressable
                onPress={() => router.push('/(auth)/recovery')}
                style={styles.forgot}
                accessibilityRole="link"
              >
                <AppText style={[styles.forgotText, { color: colors.textPrimary }]}>
                  Forgot password?
                </AppText>
              </Pressable>
            </View>
          </View>

          {error ? (
            <AppText style={[styles.error, { color: colors.textPrimary }]}>{error}</AppText>
          ) : null}

          <Button label="Log in" onPress={submit} loading={busy} />

          <OrDivider />
          <GoogleButton onPress={onGoogle} />
          <LinkText
            prefix="Don’t have an account?"
            link="Create one"
            onPress={() => router.replace('/(auth)/signup')}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safe: { flex: 1 },
  flex: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.9,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
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
  forgot: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    padding: 4,
  },
  forgotText: {
    fontFamily: 'Inter',
    fontSize: 16,
  },
  error: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
}));
