import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { FormError } from '@/components/form-error';
import { OtpInput } from '@/components/otp-input';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuthSubmit } from '@/hooks/use-auth-submit';
import { authApi } from '@/services/auth-api';
import { haptics } from '@/services/haptics';
import { useSessionStore } from '@/store/session';

const secondsUntil = (at: number) => Math.max(0, Math.ceil((at - Date.now()) / 1000));

/**
 * Permanently deletes the account (contract v1.4: POST /me/delete/code, DELETE /me).
 * Password accounts confirm with their password or an emailed code; Google/Apple-only
 * accounts must use the code. Required for App Store accounts with in-app signup.
 */
export function DeleteAccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const deleteAccount = useSessionStore((state) => state.deleteAccount);
  const hasPassword = user?.authProviders.includes('password') ?? false;

  const [mode, setMode] = useState<'password' | 'code'>(hasPassword ? 'password' : 'code');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSentUntil, setCodeSentUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const remove = useAuthSubmit();
  const send = useAuthSubmit();

  useEffect(() => {
    if (!codeSentUntil) return;
    setSecondsLeft(secondsUntil(codeSentUntil));
    const timer = setInterval(() => setSecondsLeft(secondsUntil(codeSentUntil)), 1000);
    return () => clearInterval(timer);
  }, [codeSentUntil]);

  function sendCode() {
    send.run(
      async () => {
        const { resendAvailableAt } = await authApi.requestDeleteCode();
        setCodeSentUntil(new Date(resendAvailableAt).getTime());
      },
      (error) => {
        if (error.code === 'RATE_LIMITED' && error.retryAfter) setCodeSentUntil(Date.now() + error.retryAfter * 1000);
      }
    );
  }

  // Google/Apple-only accounts can only confirm by code, so send it straight away.
  useEffect(() => {
    if (!hasPassword) sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on open
  }, []);

  const canConfirm = mode === 'password' ? password.length > 0 : /^\d{6}$/.test(code);

  function confirm() {
    if (!canConfirm) return;
    remove.run(
      async () => {
        await deleteAccount(mode === 'password' ? { password } : { code });
        haptics.success();
        router.replace('/(onboarding)/welcome');
      },
      (error) => {
        // "Email or password doesn't match" reads oddly here; say which one.
        if (error.code === 'INVALID_CREDENTIALS') {
          remove.setFormError(t('account.delete.wrongPassword'));
          haptics.error();
          return true;
        }
      }
    );
  }

  function switchMode(next: 'password' | 'code') {
    remove.setFormError(null);
    setMode(next);
  }

  const formError = remove.formError ?? send.formError;

  return (
    <AuthScreen
      variant="compact"
      title={t('account.delete.title')}
      subtitle={t('account.delete.subtitle')}
      footer={
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
          <ThemedText type="smallBold" themeColor="accent">
            {t('common.cancel')}
          </ThemedText>
        </Pressable>
      }>
      {mode === 'password' ? (
        <TextField
          label={t('account.delete.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="done"
          onSubmitEditing={confirm}
        />
      ) : codeSentUntil ? (
        <View style={styles.codeBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('account.delete.codeSent', { email: user?.email ?? '' })}
          </ThemedText>
          <OtpInput value={code} onChange={setCode} autoFocus errorKey={remove.errorAttempt} />
          {secondsLeft > 0 ? (
            <ThemedText type="small" themeColor="textMuted">
              {t('auth.verifyEmail.resendIn', { seconds: secondsLeft })}
            </ThemedText>
          ) : (
            <Pressable onPress={sendCode} disabled={send.submitting} accessibilityRole="button" hitSlop={8}>
              <ThemedText type="smallBold" themeColor="accent">
                {t('auth.verifyEmail.resend')}
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        <Button title={t('account.delete.sendCode')} variant="secondary" loading={send.submitting} onPress={sendCode} />
      )}

      {hasPassword ? (
        <Pressable
          onPress={() => switchMode(mode === 'password' ? 'code' : 'password')}
          accessibilityRole="button"
          hitSlop={8}>
          <ThemedText type="smallBold" themeColor="accentBright">
            {t(mode === 'password' ? 'account.delete.useCode' : 'account.delete.usePassword')}
          </ThemedText>
        </Pressable>
      ) : null}

      {formError ? <FormError message={formError} attempt={remove.errorAttempt + send.errorAttempt} /> : null}
      <Button
        title={t('account.delete.confirm')}
        variant="danger"
        disabled={!canConfirm}
        loading={remove.submitting}
        onPress={confirm}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  codeBlock: { gap: Spacing.sm },
});
