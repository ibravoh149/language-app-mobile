import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { OtpInput } from '@/components/otp-input';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuthSubmit } from '@/hooks/use-auth-submit';
import { type VerifyEmailFormValues, verifyEmailSchema } from '@/schemas/auth';
import { authApi } from '@/services/auth-api';
import { routeAfterAuth, useSessionStore } from '@/store/session';

/** The backend allows one resend per 60 s. Right after signup a code was just sent, so start cooling down. */
const RESEND_COOLDOWN_MS = 60_000;

const secondsUntil = (at: number) => Math.max(0, Math.ceil((at - Date.now()) / 1000));

export function VerifyEmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { sent } = useLocalSearchParams<{ sent?: string }>();
  const email = useSessionStore((state) => state.user?.email);
  const setMe = useSessionStore((state) => state.setMe);
  const signOut = useSessionStore((state) => state.signOut);
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
  const verify = useAuthSubmit();
  const resend = useAuthSubmit();

  const [resendAvailableAt, setResendAvailableAt] = useState(() => (sent === '1' ? Date.now() + RESEND_COOLDOWN_MS : 0));
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(resendAvailableAt));

  useEffect(() => {
    setSecondsLeft(secondsUntil(resendAvailableAt));
    const timer = setInterval(() => {
      const left = secondsUntil(resendAvailableAt);
      setSecondsLeft(left);
      if (left === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendAvailableAt]);

  const onSubmit = ({ code: submitted }: VerifyEmailFormValues) =>
    verify.run(async () => {
      const { user } = await authApi.verifyEmail(submitted);
      setMe({ user });
      router.replace(routeAfterAuth(user));
    });

  function handleResend() {
    if (secondsLeft > 0) return;
    resend.run(
      async () => {
        const { resendAvailableAt: at } = await authApi.resendVerification();
        setResendAvailableAt(new Date(at).getTime());
        verify.setFormError(null);
      },
      (error) => {
        if (error.code === 'RATE_LIMITED' && error.retryAfter) {
          setResendAvailableAt(Date.now() + error.retryAfter * 1000);
        }
      }
    );
  }

  // The account was created with this address; start over with a different one.
  async function handleChangeEmail() {
    await signOut();
    router.replace('/(auth)/signup');
  }

  const formError = verify.formError ?? resend.formError;

  return (
    <AuthScreen
      variant="compact"
      title={t('auth.verifyEmail.title')}
      subtitle={email ? t('auth.verifyEmail.subtitleWithEmail', { email }) : t('auth.verifyEmail.subtitle')}
      footer={
        <View style={styles.footerRow}>
          {secondsLeft > 0 ? (
            <ThemedText type="small" themeColor="textMuted">
              {t('auth.verifyEmail.resendIn', { seconds: secondsLeft })}
            </ThemedText>
          ) : (
            <Pressable onPress={handleResend} disabled={resend.submitting} accessibilityRole="button">
              <ThemedText type="smallBold" themeColor="accent">
                {t('auth.verifyEmail.resend')}
              </ThemedText>
            </Pressable>
          )}
          <Pressable onPress={handleChangeEmail} accessibilityRole="button">
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
        {formError ? (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {formError}
          </ThemedText>
        ) : null}
      </View>
      <Button title={t('auth.verifyEmail.submit')} loading={verify.submitting} onPress={handleSubmit(onSubmit)} />
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
