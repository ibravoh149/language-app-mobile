import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { MotionReveal } from '@/components/motion-reveal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSessionStore } from '@/store/session';

/**
 * Placeholder home until the real one is designed (after F1). It confirms who is
 * signed in and offers log out, so the F1 phone test can do logout → login.
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const level = useSessionStore((state) => state.profile?.chosenLevel);
  const signOut = useSessionStore((state) => state.signOut);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <MotionReveal index={0}>
            <ThemedText type="title">{user?.name ? t('home.greetingName', { name: user.name }) : t('home.greeting')}</ThemedText>
          </MotionReveal>
          <MotionReveal index={1}>
            <ThemedText themeColor="textSecondary">{user?.email}</ThemedText>
          </MotionReveal>
          {level ? (
            <MotionReveal index={2}>
              <ThemedText themeColor="textSecondary">{t('home.level', { level })}</ThemedText>
            </MotionReveal>
          ) : null}
        </View>
        {/* The tabs gate sends the learner to welcome as soon as the session ends. */}
        <Button title={t('home.logOut')} variant="secondary" onPress={() => void signOut()} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  content: { flex: 1, justifyContent: 'center', gap: Spacing.sm },
});
