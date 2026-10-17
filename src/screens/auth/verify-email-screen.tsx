import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { OtpInput } from '@/components/otp-input';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { type VerifyEmailFormValues, verifyEmailSchema } from '@/schemas/auth';

const RESEND_SECONDS = 30;

export function VerifyEmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: '' },
    mode: 'onChange',
  });
  const code = watch('code');

  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const onSubmit = () => router.replace('/(tabs)');

  function handleResend() {
    if (secondsLeft > 0) return;
    setSecondsLeft(RESEND_SECONDS);
  }

  return (
    <AuthScreen
      variant="compact"
      title={t('auth.verifyEmail.title')}
      subtitle={t('auth.verifyEmail.subtitle')}
      footer={
        <View style={styles.footerRow}>
          {secondsLeft > 0 ? (
            <ThemedText type="small" themeColor="textMuted">
              {t('auth.verifyEmail.resendIn', { seconds: secondsLeft })}
            </ThemedText>
          ) : (
            <Pressable onPress={handleResend}>
              <ThemedText type="smallBold" themeColor="accent">
                {t('auth.verifyEmail.resend')}
              </ThemedText>
            </Pressable>
          )}
          <Pressable onPress={() => router.back()}>
            <ThemedText type="small">
              {t('auth.verifyEmail.wrongAddress')}{' '}
              <ThemedText type="smallBold">{t('auth.verifyEmail.changeEmail')}</ThemedText>
            </ThemedText>
          </Pressable>
        </View>
      }>
      <View style={styles.otpContainer}>
        <OtpInput value={code} onChange={(v) => setValue('code', v, { shouldValidate: true })} autoFocus />
        {errors.code ? (
          <ThemedText type="small" themeColor="danger">
            {t(errors.code.message ?? '')}
          </ThemedText>
        ) : null}
      </View>
      <Button title={t('auth.verifyEmail.submit')} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  otpContainer: {
    gap: Spacing.xs,
  },
  footerRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
