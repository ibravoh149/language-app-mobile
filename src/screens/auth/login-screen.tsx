import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { ControlledTextField } from '@/components/controlled-text-field';
import { FormError } from '@/components/form-error';
import { SocialSignIn } from '@/components/social-sign-in';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuthSubmit } from '@/hooks/use-auth-submit';
import { type LoginFormValues, loginSchema } from '@/schemas/auth';
import { authApi } from '@/services/auth-api';
import { hasSocialProviders } from '@/services/social-auth';
import { routeAfterAuth, useSessionStore } from '@/store/session';

export function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signIn = useSessionStore((state) => state.signIn);
  const { control, handleSubmit, setError, setFocus, getValues } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  });

  const { submitting, formError, errorAttempt, run } = useAuthSubmit(setError);

  // A returning user with a saved profile goes straight into the app; onboarding is skipped.
  const onSubmit = ({ email, password }: LoginFormValues) =>
    run(async () => {
      const result = await authApi.login(email.trim(), password);
      await signIn(result);
      router.replace(routeAfterAuth(result.user));
    });

  return (
    <AuthScreen
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <Link href="/(auth)/signup">
          <ThemedText type="small">
            {t('auth.login.noAccount')} <ThemedText type="smallBold" themeColor="accentBright">{t('auth.login.signUp')}</ThemedText>
          </ThemedText>
        </Link>
      }>
      <ControlledTextField
        control={control}
        name="email"
        label={t('auth.login.emailLabel')}
        placeholder={t('auth.login.emailPlaceholder')}
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
        label={t('auth.login.passwordLabel')}
        placeholder={t('auth.login.passwordPlaceholder')}
        secureTextEntry
        textContentType="password"
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit(onSubmit)}
      />
      <Pressable
        accessibilityRole="link"
        hitSlop={8}
        style={styles.forgotPassword}
        // Read the email at tap time so the reset screen starts with what was typed.
        onPress={() => router.push({ pathname: '/(auth)/forgot-password', params: { email: getValues('email').trim() } })}>
        <ThemedText type="smallBold" themeColor="accentBright">
          {t('auth.login.forgotPassword')}
        </ThemedText>
      </Pressable>
      {formError ? <FormError message={formError} attempt={errorAttempt} /> : null}
      <Button title={t('auth.login.submit')} loading={submitting} onPress={handleSubmit(onSubmit)} />
      {hasSocialProviders ? <SocialSignIn /> : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
  },
});
