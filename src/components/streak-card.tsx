import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { CountUp } from '@/components/count-up';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { roleplayApi } from '@/services/roleplay-api';
import { progressQueryKey } from '@/screens/roleplay/scenario-list-screen';

/** Home: the speaking streak (days with at least one understood sentence), from GET /me/progress. */
export function StreakCard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const progress = useQuery({ queryKey: progressQueryKey, queryFn: roleplayApi.getProgress });
  const flame = useSharedValue(1);
  const current = progress.data?.streak.current ?? 0;
  const producedToday = progress.data?.streak.producedToday ?? false;

  // A gentle flicker while the streak is alive.
  useEffect(() => {
    if (reducedMotion || current === 0) return;
    flame.value = withRepeat(withSequence(withTiming(1.12, { duration: 600 }), withSpring(1, Motion.settle)), -1);
  }, [current, flame, reducedMotion]);
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flame.value }] }));

  return (
    <Pressable onPress={() => { haptics.press(); router.push('/(tabs)/practice'); }} accessibilityRole="button"
      style={({ pressed }) => [styles.card, { backgroundColor: theme.surface, borderColor: theme.border, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <Animated.View style={[styles.flame, { backgroundColor: theme.accentSoft }, flameStyle]}>
        <Icon name="flame" size={24} themeColor="accentBright" filled />
      </Animated.View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <CountUp value={current} style={styles.number} />
          <ThemedText type="smallBold">{t('home.streakDays', { count: current })}</ThemedText>
        </View>
        <ThemedText type="small" themeColor={producedToday ? 'success' : 'textSecondary'}>
          {t(producedToday ? 'home.streakDone' : current > 0 ? 'home.streakKeep' : 'home.streakStart')}
        </ThemedText>
      </View>
      <Icon name="fwd" size={18} themeColor="textMuted" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1 },
  flame: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  number: { fontFamily: FontFamily.displayBold, fontSize: 22, lineHeight: 28 },
});
