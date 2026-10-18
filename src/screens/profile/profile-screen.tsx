import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { MotionReveal } from '@/components/motion-reveal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { useSessionStore } from '@/store/session';

/**
 * Minimal profile until the prototype's You tab + Settings are built: who's signed in,
 * legal, log out, delete account (and the dev voice lab).
 */
export function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((state) => state.user);
  const level = useSessionStore((state) => state.profile?.chosenLevel);
  const signOut = useSessionStore((state) => state.signOut);
  const initial = (user?.name ?? user?.email ?? '?').trim().charAt(0).toUpperCase();

  const rows: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: 'book', label: t('profile.legal'), onPress: () => router.push('/legal') },
    ...(__DEV__ ? [{ icon: 'speaker' as IconName, label: 'Voice lab (dev)', onPress: () => router.push('/voice-lab') }] : []),
    { icon: 'back', label: t('home.logOut'), onPress: () => void signOut() },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <MotionReveal index={0} style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderStrong }]}>
              <ThemedText style={styles.avatarLetter}>{initial}</ThemedText>
            </View>
            <ThemedText type="subtitle">{user?.name ?? ''}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{user?.email}</ThemedText>
            {level ? (
              <View style={[styles.levelPill, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
                <ThemedText type="smallBold" themeColor="accentBright">{t('home.level', { level })}</ThemedText>
              </View>
            ) : null}
          </MotionReveal>

          <MotionReveal index={1}>
            <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {rows.map((row, i) => (
                <Pressable key={row.label} accessibilityRole="button"
                  onPress={() => { haptics.press(); row.onPress(); }}
                  style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }, pressed && { backgroundColor: theme.surfaceAlt }]}>
                  <Icon name={row.icon} size={18} themeColor="textSecondary" />
                  <ThemedText style={styles.flex}>{row.label}</ThemedText>
                  <Icon name="fwd" size={16} themeColor="textMuted" />
                </Pressable>
              ))}
            </View>
          </MotionReveal>

          <MotionReveal index={2}>
            <Pressable onPress={() => router.push('/delete-account')} accessibilityRole="button" hitSlop={8} style={styles.delete}>
              <ThemedText type="small" themeColor="danger">{t('account.delete.homeLink')}</ThemedText>
            </Pressable>
          </MotionReveal>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.xl },
  identity: { alignItems: 'center', gap: Spacing.xs },
  avatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  avatarLetter: { fontFamily: FontFamily.displayBold, fontSize: 30, lineHeight: 36 },
  levelPill: { marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.pill, borderWidth: 1 },
  list: { borderRadius: BorderRadius.xl, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md + 2 },
  flex: { flex: 1 },
  delete: { alignSelf: 'center' },
});
