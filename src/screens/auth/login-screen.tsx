import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { ControlledTextField } from '@/components/controlled-text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { type LoginFormValues, loginSchema } from '@/schemas/auth';

export function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  });

  const onSubmit = () => router.replace('/(tabs)');

  return (
    <AuthScreen
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <Link href="/(auth)/signup" replace>
          <ThemedText type="small">
            {t('auth.login.noAccount')} <ThemedText type="smallBold">{t('auth.login.signUp')}</ThemedText>
          </ThemedText>
        </Link>
      }>
      <ControlledTextField
        control={control}
        name="email"
        label={t('auth.login.emailLabel')}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <ControlledTextField
        control={control}
        name="password"
        label={t('auth.login.passwordLabel')}
        secureTextEntry
        textContentType="password"
      />
      <Link href="/(auth)/forgot-password" style={styles.forgotPassword}>
        <ThemedText type="small" themeColor="accent">
          {t('auth.login.forgotPassword')}
        </ThemedText>
      </Link>
      <Button title={t('auth.login.submit')} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
  },
});
