import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { ControlledTextField } from '@/components/controlled-text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type LoginFormValues, loginSchema } from '@/schemas/auth';

export function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
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
      />
      <ControlledTextField
        control={control}
        name="password"
        label={t('auth.login.passwordLabel')}
        placeholder={t('auth.login.passwordPlaceholder')}
        secureTextEntry
        textContentType="password"
      />
      <Link href="/(auth)/forgot-password" style={styles.forgotPassword}>
        <ThemedText type="smallBold" themeColor="accentBright">
          {t('auth.login.forgotPassword')}
        </ThemedText>
      </Link>
      <Button title={t('auth.login.submit')} onPress={handleSubmit(onSubmit)} />

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <ThemedText type="small" themeColor="textMuted">
          {t('auth.login.orDivider')}
        </ThemedText>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>

      <View style={styles.socialRow}>
        <View style={styles.socialButton}>
          {/* TODO: wire up Sign in with Apple (expo-apple-authentication) once backend auth exists */}
          <Button title={t('auth.login.continueWithApple')} variant="secondary" onPress={() => {}} />
        </View>
        <View style={styles.socialButton}>
          {/* TODO: wire up Google sign-in (expo-auth-session) once backend auth exists */}
          <Button title={t('auth.login.continueWithGoogle')} variant="secondary" onPress={() => {}} />
        </View>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  socialButton: {
    flex: 1,
  },
});
