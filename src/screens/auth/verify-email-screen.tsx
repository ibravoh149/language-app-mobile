import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { ControlledTextField } from '@/components/controlled-text-field';
import { ThemedText } from '@/components/themed-text';
import { type VerifyEmailFormValues, verifyEmailSchema } from '@/schemas/auth';

export function VerifyEmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { control, handleSubmit } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: '' },
    mode: 'onChange',
  });

  const onSubmit = () => router.replace('/(tabs)');

  return (
    <AuthScreen
      title={t('auth.verifyEmail.title')}
      subtitle={t('auth.verifyEmail.subtitle')}
      footer={
        <Pressable onPress={() => {}}>
          <ThemedText type="smallBold" themeColor="accent">
            {t('auth.verifyEmail.resend')}
          </ThemedText>
        </Pressable>
      }>
      <ControlledTextField
        control={control}
        name="code"
        label={t('auth.verifyEmail.codeLabel')}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
      />
      <Button title={t('auth.verifyEmail.submit')} onPress={handleSubmit(onSubmit)} />
    </AuthScreen>
  );
}
