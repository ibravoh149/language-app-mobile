import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { ControlledTextField } from '@/components/controlled-text-field';
import { ThemedText } from '@/components/themed-text';
import { type ForgotPasswordFormValues, forgotPasswordSchema } from '@/schemas/auth';

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { control, handleSubmit } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
  });

  const onSubmit = () => router.replace('/(auth)/login');

  return (
    <AuthScreen
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
      <Button title={t('auth.forgotPassword.submit')} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}
