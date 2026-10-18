import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { ControlledTextField } from '@/components/controlled-text-field';
import { OtpInput } from '@/components/otp-input';
import { FormError } from '@/components/form-error';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuthSubmit } from '@/hooks/use-auth-submit';
import { type ResetPasswordFormValues, resetPasswordSchema } from '@/schemas/auth';
import { authApi } from '@/services/auth-api';
import { routeAfterAuth, useSessionStore } from '@/store/session';

export function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const signIn = useSessionStore((state) => state.signIn);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', newPassword: '' },
    mode: 'onChange',
  });
  const code = watch('code');
  const { submitting, formError, errorAttempt, run } = useAuthSubmit(setError);

  // A successful reset signs the user in (and revokes their other sessions).
  const onSubmit = ({ code: submitted, newPassword }: ResetPasswordFormValues) =>
    run(async () => {
      const result = await authApi.resetPassword(email, submitted, newPassword);
      await signIn(result);
      router.replace(routeAfterAuth(result.user));
    });

  return (
    <AuthScreen
      variant="compact"
      title={t('auth.resetPassword.title')}
      subtitle={t('auth.resetPassword.subtitle', { email })}
      footer={
        <Link href="/(auth)/forgot-password" replace>
          <ThemedText type="smallBold" themeColor="accent">
            {t('auth.resetPassword.resend')}
          </ThemedText>
        </Link>
      }>
      <View style={styles.otpContainer}>
        <OtpInput value={code} onChange={(v) => setValue('code', v, { shouldValidate: true })} autoFocus errorKey={errorAttempt} />
        {errors.code ? (
          <ThemedText type="small" themeColor="danger">
            {t(errors.code.message ?? '')}
          </ThemedText>
        ) : null}
      </View>
      <ControlledTextField
        control={control}
        name="newPassword"
        label={t('auth.resetPassword.passwordLabel')}
        placeholder={t('auth.signup.passwordPlaceholder')}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="done"
        onSubmitEditing={handleSubmit(onSubmit)}
      />
      {formError ? <FormError message={formError} attempt={errorAttempt} /> : null}
      <Button title={t('auth.resetPassword.submit')} loading={submitting} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  otpContainer: {
    gap: Spacing.xs,
  },
});
