import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { AccentCard } from '@/components/accent-card';
import { CountUp } from '@/components/count-up';
import { Icon } from '@/components/icon';
import { MotionReveal } from '@/components/motion-reveal';
import { ProgressRing } from '@/components/progress-ring';
import { Sparkline } from '@/components/sparkline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DEFAULT_DAILY_MINUTES } from '@/constants/levels';
import { Motion } from '@/constants/motion';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { type Progress, roleplayApi, type ScenarioSummary } from '@/services/roleplay-api';
import { progressQueryKey, scenarioQueryKey } from '@/screens/roleplay/scenario-list-screen';
import { useSessionStore } from '@/store/session';

/** German greeting by time of day: part of the immersion, so not translated. */
function germanGreeting(hour: number): string {
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

/** Home (prototype `Home`): greeting, streak + goal, today's conversation, this week. */
export function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((state) => state.user);
  const profile = useSessionStore((state) => state.profile);
  const progress = useQuery({ queryKey: progressQueryKey, queryFn: roleplayApi.getProgress });
  const scenarios = useQuery({ queryKey: scenarioQueryKey, queryFn: roleplayApi.listScenarios });
  const level = profile?.chosenLevel ?? null;
  const initial = (user?.name ?? user?.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <MotionReveal index={0} style={styles.header}>
            <Pressable onPress={() => { haptics.press(); router.push('/profile'); }} accessibilityRole="button"
              accessibilityLabel={t('profile.title')} style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderStrong }]}>
                <ThemedText style={styles.avatarLetter}>{initial}</ThemedText>
              </View>
              {level ? (
                <View style={[styles.levelBadge, { backgroundColor: theme.accent, borderColor: theme.background }]}>
                  <ThemedText themeColor="textOnAccent" style={styles.levelText}>{level}</ThemedText>
                </View>
              ) : null}
            </Pressable>
            <View style={styles.flex}>
              <ThemedText type="small" themeColor="textMuted" style={styles.sub}>{germanGreeting(new Date().getHours())}</ThemedText>
              <ThemedText type="subtitle" numberOfLines={1}>{user?.name ?? ''}</ThemedText>
            </View>
          </MotionReveal>

          <MotionReveal index={1}>
            <StreakStrip progress={progress.data} dailyMinutes={profile?.dailyMinutes ?? DEFAULT_DAILY_MINUTES} />
          </MotionReveal>

          <MotionReveal index={2}>
            <TodayHero scenarios={scenarios.data ?? []} level={level} />
          </MotionReveal>

          {progress.data?.week?.length ? (
            <MotionReveal index={3}>
              <WeekCard progress={progress.data} />
            </MotionReveal>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Streak + today's goal (prototype "streak + goal strip"). */
function StreakStrip({ progress, dailyMinutes }: { progress?: Progress; dailyMinutes: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const current = progress?.streak.current ?? 0;
  const producedToday = progress?.streak.producedToday ?? false;
  const seconds = progress?.secondsPracticedToday;
  const goalSeconds = dailyMinutes * 60;
  const minutesLeft = seconds == null ? null : Math.max(0, Math.ceil((goalSeconds - seconds) / 60));

  // Last 7 days, today last: real per-day data when the backend sends it, else the streak run.
  const days = progress?.week?.length
    ? progress.week.slice(-7).map((d) => d.turns > 0)
    : Array.from({ length: 7 }, (_, i) => {
        const daysAgo = 6 - i;
        const firstStreakDay = producedToday ? 0 : 1;
        return daysAgo >= firstStreakDay && daysAgo < firstStreakDay + current;
      });

  const flame = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion || current === 0) return;
    flame.value = withRepeat(withSequence(withTiming(1.15, { duration: 600 }), withSpring(1, Motion.settle)), -1);
  }, [current, flame, reducedMotion]);
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flame.value }] }));

  return (
    <View style={[styles.card, styles.strip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <ProgressRing progress={seconds == null ? (producedToday ? 1 : 0) : seconds / goalSeconds}>
        {seconds == null ? (
          <Icon name="mic" size={18} themeColor="accentBright" />
        ) : (
          <ThemedText style={styles.ringText}>{Math.floor(seconds / 60)}<ThemedText style={styles.ringUnit}>m</ThemedText></ThemedText>
        )}
      </ProgressRing>
      <View style={styles.flex}>
        <View style={styles.streakRow}>
          <Animated.View style={flameStyle}><Icon name="flame" size={15} themeColor="accentBright" filled /></Animated.View>
          <CountUp value={current} style={styles.streakNumber} />
          <ThemedText type="smallBold">{t('home.streakDays', { count: current })}</ThemedText>
        </View>
        <View style={styles.days}>
          {days.map((on, i) => (
            <View key={i} style={[styles.day, { backgroundColor: on ? theme.accent : theme.surfaceSunken }]} />
          ))}
        </View>
        <ThemedText type="small" themeColor={producedToday ? 'success' : 'textSecondary'} style={styles.stripNote}>
          {minutesLeft != null
            ? minutesLeft > 0 ? t('home.goalLeft', { count: minutesLeft }) : t('home.goalDone')
            : t(producedToday ? 'home.streakDone' : current > 0 ? 'home.streakKeep' : 'home.streakStart')}
        </ThemedText>
      </View>
    </View>
  );
}

/** "Today's conversation": an untried scenario at the learner's level, else the least practised one. */
function TodayHero({ scenarios, level }: { scenarios: ScenarioSummary[]; level: string | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const atLevel = scenarios.filter((s) => s.level === level);
  const pool = atLevel.length ? atLevel : scenarios;
  const pick = [...pool].sort((a, b) => a.timesPracticed - b.timesPracticed)[0];
  if (!pick) return null;

  return (
    <AccentCard style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.flex}>
          <ThemedText type="small" themeColor="textOnAccent" style={[styles.sub, styles.dim]}>{t('home.todayTitle')}</ThemedText>
          <ThemedText themeColor="textOnAccent" style={styles.heroTitle}>{pick.emoji} {pick.title}</ThemedText>
          <ThemedText type="small" themeColor="textOnAccent" style={styles.dim}>{pick.subtitle}</ThemedText>
          <View style={styles.heroPills}>
            {[pick.level, t('roleplay.list.minutes', { count: pick.estimatedMinutes }), t('roleplay.list.words', { count: pick.wordCount })].map((p) => (
              <View key={p} style={styles.heroPill}>
                <ThemedText themeColor="textOnAccent" style={styles.heroPillText}>{p}</ThemedText>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.heroOrb}>
          <Icon name="mic" size={26} themeColor="textOnAccent" />
        </View>
      </View>
      <Pressable accessibilityRole="button"
        onPress={() => { haptics.press(); router.push({ pathname: '/roleplay/[scenario]', params: { scenario: pick.slug } }); }}
        style={({ pressed }) => [styles.heroButton, { backgroundColor: theme.textOnAccent, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
        <Icon name="mic" size={17} themeColor="accent" />
        <ThemedText type="smallBold" themeColor="accent" style={styles.heroButtonText}>{t('home.startTalking')}</ThemedText>
      </Pressable>
    </AccentCard>
  );
}

/** "This week" (prototype momentum card): practice time and a sparkline. */
function WeekCard({ progress }: { progress: Progress }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const week = progress.week ?? [];
  const minutes = Math.round(week.reduce((n, d) => n + d.secondsPracticed, 0) / 60);
  return (
    <Pressable onPress={() => { haptics.press(); router.push('/(tabs)/practice'); }} accessibilityRole="button"
      style={({ pressed }) => [styles.card, styles.week, { backgroundColor: theme.surface, borderColor: theme.border, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <View style={styles.flex}>
        <ThemedText type="small" themeColor="textMuted" style={styles.sub}>{t('home.weekTitle')}</ThemedText>
        <View style={styles.weekRow}>
          <CountUp value={minutes} style={styles.weekNumber} />
          <ThemedText type="small" themeColor="textSecondary">{t('home.weekMinutes', { count: minutes })}</ThemedText>
        </View>
      </View>
      <Sparkline data={week.map((d) => d.secondsPracticed)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing['3xl'], gap: Spacing.md },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xs },
  avatarWrap: { width: 46, height: 46 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: FontFamily.displayBold, fontSize: 18 },
  levelBadge: { position: 'absolute', right: -2, bottom: -2, minWidth: 20, height: 20, paddingHorizontal: 3, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  levelText: { fontSize: 9, lineHeight: 12, fontFamily: FontFamily.bodyBold },
  sub: { fontSize: 11, textTransform: 'uppercase' },
  dim: { opacity: 0.85 },
  card: { padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  ringText: { fontFamily: FontFamily.displayBold, fontSize: 13, lineHeight: 16 },
  ringUnit: { fontSize: 9, opacity: 0.6 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  streakNumber: { fontFamily: FontFamily.displayBold, fontSize: 15, lineHeight: 20 },
  days: { flexDirection: 'row', gap: 5 },
  day: { flex: 1, height: 6, borderRadius: 3 },
  stripNote: { marginTop: 6, fontSize: 11.5 },
  hero: { padding: Spacing.xl, gap: Spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  heroTitle: { fontFamily: FontFamily.displayBold, fontSize: 22, lineHeight: 27, marginTop: Spacing.sm },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  heroPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.pill },
  heroPillText: { fontSize: 10.5, lineHeight: 15 },
  heroOrb: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  heroButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: 50, borderRadius: BorderRadius.pill },
  heroButtonText: { fontSize: 15 },
  week: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  weekRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  weekNumber: { fontFamily: FontFamily.displayBold, fontSize: 20, lineHeight: 26 },
});
