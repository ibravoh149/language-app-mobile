import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ControlledTextField } from '@/components/controlled-text-field';
import { FormError } from '@/components/form-error';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthSubmit } from '@/hooks/use-auth-submit';
import { type SignupFormValues, signupSchema } from '@/schemas/auth';
import { authApi } from '@/services/auth-api';
import { onboardingPayload } from '@/store/profile';
import { useSessionStore } from '@/store/session';

export function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const signIn = useSessionStore((state) => state.signIn);
  const { control, handleSubmit, setError, setFocus } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onChange',
  });

  const { submitting, formError, errorAttempt, run } = useAuthSubmit(setError);

  const onSubmit = (values: SignupFormValues) =>
    run(async () => {
      const result = await authApi.signup({ ...values, email: values.email.trim(), ...onboardingPayload() });
      await signIn(result);
      router.replace({ pathname: '/(auth)/verify-email', params: { sent: '1' } });
    });

  return (
    <AuthScreen
      title={t('auth.signup.title')}
      subtitle={t('auth.signup.subtitle')}
      footer={
        <>
          <ThemedText type="small" themeColor="textMuted" style={styles.termsText}>
            {t('auth.signup.termsPrefix')}{' '}
            <ThemedText type="small" themeColor="accent" accessibilityRole="link" style={styles.legalLink}
              onPress={() => router.push({ pathname: '/legal', params: { tab: 'terms' } })}>
              {t('auth.signup.termsLink')}
            </ThemedText>{' '}
            {t('auth.signup.termsAnd')}{' '}
            <ThemedText type="small" themeColor="accent" accessibilityRole="link" style={styles.legalLink}
              onPress={() => router.push({ pathname: '/legal', params: { tab: 'privacy' } })}>
              {t('auth.signup.privacyLink')}
            </ThemedText>
            {t('auth.signup.termsSuffix')}
          </ThemedText>
          <Link href="/(auth)/login" replace>
            <ThemedText type="small">
              {t('auth.signup.haveAccount')} <ThemedText type="smallBold">{t('auth.signup.logIn')}</ThemedText>
            </ThemedText>
          </Link>
        </>
      }>
      <ControlledTextField
        control={control}
        name="name"
        label={t('auth.signup.nameLabel')}
        placeholder={t('auth.signup.namePlaceholder')}
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => setFocus('email')}
      />
      <ControlledTextField
        control={control}
        name="email"
        label={t('auth.signup.emailLabel')}
        placeholder={t('auth.signup.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => setFocus('password')}
      />
      <ControlledTextField
        control={control}
        name="password"
        label={t('auth.signup.passwordLabel')}
        placeholder={t('auth.signup.passwordPlaceholder')}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="done"
        onSubmitEditing={handleSubmit(onSubmit)}
      />
      <View style={[styles.trustCard, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
        <Icon name="globe" size={20} themeColor="accentBright" />
        <ThemedText type="small" themeColor="textSecondary" style={styles.trustText}>
          {t('auth.signup.trustCard')}
        </ThemedText>
      </View>
      {formError ? <FormError message={formError} attempt={errorAttempt} /> : null}
      <Button title={t('auth.signup.submit')} loading={submitting} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  trustText: {
    flex: 1,
    lineHeight: 18,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
  termsText: {
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
});
