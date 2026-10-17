import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ControlledTextField } from '@/components/controlled-text-field';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthSubmit } from '@/hooks/use-auth-submit';
import { type SignupFormValues, signupSchema } from '@/schemas/auth';
import { authApi } from '@/services/auth-api';
import { useAssessmentStore } from '@/store';
import { buildProfile } from '@/store/profile';
import { useSessionStore } from '@/store/session';

export function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const signIn = useSessionStore((state) => state.signIn);
  const { control, handleSubmit, setError } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onChange',
  });

  const { submitting, formError, run } = useAuthSubmit(setError);

  const onSubmit = (values: SignupFormValues) =>
    run(async () => {
      const assessmentId = useAssessmentStore.getState().assessmentId ?? undefined;
      const result = await authApi.signup({ ...values, email: values.email.trim(), profile: buildProfile(), assessmentId });
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
            {t('auth.signup.termsPrefix')} <ThemedText type="small" themeColor="accent">{t('auth.signup.termsLink')}</ThemedText>{' '}
            {t('auth.signup.termsAnd')}{' '}
            <ThemedText type="small" themeColor="accent">{t('auth.signup.privacyLink')}</ThemedText>
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
      />
      <ControlledTextField
        control={control}
        name="email"
        label={t('auth.signup.emailLabel')}
        placeholder={t('auth.signup.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <ControlledTextField
        control={control}
        name="password"
        label={t('auth.signup.passwordLabel')}
        placeholder={t('auth.signup.passwordPlaceholder')}
        secureTextEntry
        textContentType="newPassword"
      />
      <View style={[styles.trustCard, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
        <Icon name="globe" size={20} themeColor="accentBright" />
        <ThemedText type="small" themeColor="textSecondary" style={styles.trustText}>
          {t('auth.signup.trustCard')}
        </ThemedText>
      </View>
      {formError ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {formError}
        </ThemedText>
      ) : null}
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
  termsText: {
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
});
