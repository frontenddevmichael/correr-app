import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
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
  GoogleButton,
  LinkText,
  OrDivider,
  useAuthInputStyle,
  useAuthLabelStyle,
} from '@/features/auth/AuthUi';
import { Eye, EyeOff } from '@/features/auth/EyeIcons';

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
          <View style={styles.top}>

          </View>

          {/*<AuthSegment active="signup" />*/}

          <View style={styles.header}>
            <AppText style={styles.title}>Let&apos;s get started.</AppText>
            <AppText style={styles.subtitle}>
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
                  placeholder={`${LIMITS.passwordMin}–${LIMITS.passwordMax} characters`}
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
            <AppText style={[styles.error, { color: colors.textPrimary }]}>{error}</AppText>
          ) : null}

          {/* Consent gate — required before account creation (timestamped +
              versioned server-side right after sign-up). */}
          <Pressable
            onPress={() => setAgreed((current) => !current)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            accessibilityLabel="Agree to the Terms of Service and Privacy Policy"
            style={styles.consentRow}
          >
            <View
              style={[
                styles.consentBox,
                agreed && {
                  backgroundColor: colors.brand,
                  borderColor: colors.brand,
                },
              ]}
            >
              {agreed ? <Icon name="check" size={13} color={colors.brandInverse} /> : null}
            </View>
            <AppText variant="caption" tone="secondary" style={styles.consentText}>
              I agree to the Terms of Service and Privacy Policy, and understand that AI
              features are generated by a third-party provider (disclosed in Legal).
            </AppText>
          </Pressable>
          <View style={styles.consentLinks}>
            <LinkText
              prefix="Read before you continue:"
              link="Terms, Privacy & AI disclosure"
              onPress={() => router.push('/legal')}
            />
          </View>

          <Button label="Create account" onPress={submit} loading={busy} />

          <OrDivider />
          <GoogleButton onPress={onGoogle} />
          <LinkText
            prefix="Already have an account?"
            link="Log in"
            onPress={() => router.replace('/(auth)/login')}
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
  top: {
    alignItems: 'center',
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
  hint: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  error: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  consentBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  consentText: {
    flex: 1,
    lineHeight: 18,
  },
  consentLinks: {
    marginTop: -spacing.sm,
  },
}));
