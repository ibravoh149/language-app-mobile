import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { MotionReveal } from '@/components/motion-reveal';
import { StreakCard } from '@/components/streak-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSessionStore } from '@/store/session';

/**
 * Placeholder home until the real one is designed. It confirms who is signed in,
 * shows the speaking streak (F2), and offers log out / delete account.
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const level = useSessionStore((state) => state.profile?.chosenLevel);
  const signOut = useSessionStore((state) => state.signOut);
  const router = useRouter();

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
          <MotionReveal index={3} style={styles.streak}>
            <StreakCard />
          </MotionReveal>
        </View>
        {/* Development only: compare voices by ear (not shown in release builds). */}
        {__DEV__ ? <Button title="Voice lab (dev)" variant="secondary" onPress={() => router.push('/voice-lab')} /> : null}
        {/* The tabs gate sends the learner to welcome as soon as the session ends. */}
        <Button title={t('home.logOut')} variant="secondary" onPress={() => void signOut()} />
        <Pressable onPress={() => router.push('/delete-account')} accessibilityRole="button" hitSlop={8} style={styles.deleteLink}>
          <ThemedText type="small" themeColor="danger">
            {t('account.delete.homeLink')}
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.sm },
  content: { flex: 1, justifyContent: 'center', gap: Spacing.sm },
  deleteLink: { alignSelf: 'center', paddingVertical: Spacing.xs },
  streak: { marginTop: Spacing.lg },
});
