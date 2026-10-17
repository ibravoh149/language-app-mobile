import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { ControlledTextField } from '@/components/controlled-text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuthSubmit } from '@/hooks/use-auth-submit';
import { type ForgotPasswordFormValues, forgotPasswordSchema } from '@/schemas/auth';
import { authApi } from '@/services/auth-api';

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { control, handleSubmit, setError } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
  });

  const { submitting, formError, run } = useAuthSubmit(setError);

  // Always 202 (no account enumeration), so continue to the code screen either way.
  const onSubmit = ({ email }: ForgotPasswordFormValues) =>
    run(async () => {
      await authApi.forgotPassword(email.trim());
      router.push({ pathname: '/(auth)/reset-password', params: { email: email.trim() } });
    });

  return (
    <AuthScreen
      variant="compact"
      title={t('auth.forgotPassword.title')}
      subtitle={t('auth.forgotPassword.subtitle')}
      footer={
        <Link href="/(auth)/login" replace>
          <ThemedText type="smallBold" themeColor="accent">
            {t('auth.forgotPassword.backToLogin')}
          </ThemedText>
        </Link>
      }>
      <ControlledTextField
        control={control}
        name="email"
        label={t('auth.forgotPassword.emailLabel')}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      {formError ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {formError}
        </ThemedText>
      ) : null}
      <Button title={t('auth.forgotPassword.submit')} loading={submitting} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}
