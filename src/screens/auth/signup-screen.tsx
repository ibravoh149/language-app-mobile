import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { ControlledTextField } from '@/components/controlled-text-field';
import { ThemedText } from '@/components/themed-text';
import { type SignupFormValues, signupSchema } from '@/schemas/auth';

export function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { control, handleSubmit } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onChange',
  });

  const onSubmit = () => router.push('/(auth)/verify-email');

  return (
    <AuthScreen
      title={t('auth.signup.title')}
      subtitle={t('auth.signup.subtitle')}
      footer={
        <Link href="/(auth)/login" replace>
          <ThemedText type="small">
            {t('auth.signup.haveAccount')} <ThemedText type="smallBold">{t('auth.signup.logIn')}</ThemedText>
          </ThemedText>
        </Link>
      }>
      <ControlledTextField
        control={control}
        name="name"
        label={t('auth.signup.nameLabel')}
        autoCapitalize="words"
        textContentType="name"
      />
      <ControlledTextField
        control={control}
        name="email"
        label={t('auth.signup.emailLabel')}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <ControlledTextField
        control={control}
        name="password"
        label={t('auth.signup.passwordLabel')}
        secureTextEntry
        textContentType="newPassword"
      />
      <Button title={t('auth.signup.submit')} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}
