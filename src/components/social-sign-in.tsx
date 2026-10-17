import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FormError } from '@/components/form-error';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuthSubmit } from '@/hooks/use-auth-submit';
import { useTheme } from '@/hooks/use-theme';
import { authApi, type AuthResult } from '@/services/auth-api';
import { getAppleCredential, getGoogleIdToken, isAppleAvailable, isGoogleConfigured } from '@/services/social-auth';
import { useAssessmentStore } from '@/store';
import { buildProfile } from '@/store/profile';
import { routeAfterAuth, useSessionStore } from '@/store/session';

type Provider = 'apple' | 'google';

/** Onboarding answers from this device, if the learner went through onboarding first. */
function onboardingPayload() {
  const { chosenLevel, assessmentId } = useAssessmentStore.getState();
  if (!chosenLevel) return {};
  return { profile: buildProfile(), assessmentId: assessmentId ?? undefined };
}

/**
 * "or" divider plus Apple (iOS) and Google buttons, per the prototype's SocialRow.
 * Providers that aren't configured are hidden; with none, nothing renders.
 */
export function SocialSignIn() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const signIn = useSessionStore((state) => state.signIn);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [pending, setPending] = useState<Provider | null>(null);
  const { formError, errorAttempt, run } = useAuthSubmit();

  useEffect(() => {
    let mounted = true;
    void isAppleAvailable().then((available) => mounted && setAppleAvailable(available));
    return () => {
      mounted = false;
    };
  }, []);

  if (!appleAvailable && !isGoogleConfigured) return null;

  function start(provider: Provider) {
    setPending(provider);
    void run(async () => {
      try {
        let result: AuthResult;
        if (provider === 'google') {
          const idToken = await getGoogleIdToken();
          if (!idToken) return; // cancelled
          result = await authApi.signInWithGoogle({ idToken, ...onboardingPayload() });
        } else {
          const credential = await getAppleCredential();
          if (!credential) return; // cancelled
          result = await authApi.signInWithApple({ ...credential, ...onboardingPayload() });
        }
        await signIn(result);
        // New or not-yet-onboarded accounts continue onboarding; the rest go into the app.
        router.replace(routeAfterAuth(result.user));
      } finally {
        setPending(null);
      }
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <ThemedText type="small" themeColor="textMuted">
          {t('auth.login.orDivider')}
        </ThemedText>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>
      <View style={styles.socialRow}>
        {appleAvailable ? (
          <View style={styles.socialButton}>
            <Button
              title={t('auth.login.continueWithApple')}
              accessibilityLabel={t('auth.login.continueWithAppleA11y')}
              variant="secondary"
              loading={pending === 'apple'}
              disabled={pending !== null}
              onPress={() => start('apple')}
            />
          </View>
        ) : null}
        {isGoogleConfigured ? (
          <View style={styles.socialButton}>
            <Button
              title={t('auth.login.continueWithGoogle')}
              accessibilityLabel={t('auth.login.continueWithGoogleA11y')}
              variant="secondary"
              loading={pending === 'google'}
              disabled={pending !== null}
              onPress={() => start('google')}
            />
          </View>
        ) : null}
      </View>
      {formError ? <FormError message={formError} attempt={errorAttempt} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  socialRow: { flexDirection: 'row', gap: Spacing.sm },
  socialButton: { flex: 1 },
});
