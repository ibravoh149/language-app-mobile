import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { CountUp } from '@/components/count-up';
import { Icon } from '@/components/icon';
import { MotionReveal } from '@/components/motion-reveal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThinkingDots } from '@/components/thinking-dots';
import { Motion } from '@/constants/motion';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { roleplayApi, type SessionSummary } from '@/services/roleplay-api';
import { celebrate } from '@/store/celebration';

import { sessionQueryKey } from './prep-screen';

/** End of a roleplay: what you produced, with a celebration, and the corrections to review. */
export function SummaryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  // Seeded by the conversation; otherwise ending again is safe (idempotent).
  const summary = useQuery<SessionSummary>({
    queryKey: ['roleplay', 'summary', sessionId],
    queryFn: async () => (await roleplayApi.endSession(sessionId)).summary,
    staleTime: Infinity,
  });
  const detail = useQuery({ queryKey: sessionQueryKey(sessionId), queryFn: () => roleplayApi.getSession(sessionId), staleTime: Infinity });
  const celebrated = useRef(false);

  useEffect(() => {
    if (!summary.data || celebrated.current) return;
    celebrated.current = true;
    if (summary.data.understoodCount > 0) {
      celebrate({ title: t('roleplay.summary.celebrateTitle'), subtitle: t('roleplay.summary.celebrateSubtitle', { count: summary.data.understoodCount }), icon: 'chat' });
    }
  }, [summary.data, t]);

  if (summary.isPending) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThinkingDots label={t('common.loading')} />
      </ThemedView>
    );
  }
  if (summary.isError) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText type="small" themeColor="danger">{t('roleplay.convo.loadFailed')}</ThemedText>
        <Button title={t('common.retry')} variant="secondary" onPress={() => void summary.refetch()} />
      </ThemedView>
    );
  }

  const s = summary.data;
  const understoodPct = s.turnCount > 0 ? Math.round((s.understoodCount / s.turnCount) * 100) : 0;
  const minutes = Math.floor(s.durationSec / 60);
  const seconds = s.durationSec % 60;
  const corrections = detail.data?.corrections ?? [];
  const scenario = detail.data?.scenario;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={ZoomIn.springify().damping(Motion.pop.damping).stiffness(Motion.pop.stiffness)} style={styles.hero}>
            <ThemedText style={styles.heroEmoji} allowFontScaling={false}>{scenario?.emoji ?? '💬'}</ThemedText>
            <ThemedText type="title" style={styles.title}>{t('roleplay.summary.title')}</ThemedText>
            {scenario ? <ThemedText themeColor="textSecondary">{scenario.title}</ThemedText> : null}
          </Animated.View>

          <MotionReveal index={1} style={styles.tiles}>
            <Stat value={s.turnCount} label={t('roleplay.summary.turns')} />
            <Stat value={understoodPct} suffix="%" label={t('roleplay.summary.understood')} />
          </MotionReveal>
          <MotionReveal index={2} style={styles.tiles}>
            <Stat value={s.correctionCount} label={t('roleplay.summary.corrections')} />
            <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ThemedText style={styles.tileNumber}>{minutes}:{String(seconds).padStart(2, '0')}</ThemedText>
              <ThemedText type="small" themeColor="textMuted" style={styles.tileLabel}>{t('roleplay.summary.duration')}</ThemedText>
            </View>
          </MotionReveal>

          {corrections.length > 0 ? (
            <MotionReveal index={3} style={styles.section}>
              <ThemedText type="small" themeColor="textMuted" style={styles.sub}>{t('roleplay.summary.review')}</ThemedText>
              {corrections.map((c) => (
                <Pressable key={c.id} accessibilityRole="button"
                  onPress={() => { haptics.press(); router.push({ pathname: '/roleplay/correction/[sessionId]', params: { sessionId, turnId: c.turnId } }); }}
                  style={({ pressed }) => [styles.row, { backgroundColor: theme.surface, borderColor: theme.border, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                  <View style={styles.rowText}>
                    <ThemedText type="small" themeColor="danger" style={styles.strike} numberOfLines={1}>{c.original}</ThemedText>
                    <ThemedText type="smallBold" numberOfLines={1}>{c.corrected}</ThemedText>
                    <ThemedText type="small" themeColor="accentBright" numberOfLines={1}>{c.ruleName}</ThemedText>
                  </View>
                  <Icon name="fwd" size={16} themeColor="textMuted" />
                </Pressable>
              ))}
            </MotionReveal>
          ) : s.turnCount > 0 ? (
            <MotionReveal index={3}>
              <ThemedText themeColor="success" style={styles.allGood}>{t('roleplay.summary.noCorrections')}</ThemedText>
            </MotionReveal>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {scenario ? (
            <Button title={t('roleplay.summary.again')} variant="secondary"
              onPress={() => router.replace({ pathname: '/roleplay/[scenario]', params: { scenario: scenario.slug } })} />
          ) : null}
          <Button title={t('roleplay.summary.done')} onPress={() => router.replace('/(tabs)/practice')} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Stat({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <CountUp value={value} suffix={suffix} style={styles.tileNumber} />
      <ThemedText type="small" themeColor="textMuted" style={styles.tileLabel}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.xl, gap: Spacing.md },
  hero: { alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  heroEmoji: { fontSize: 48, lineHeight: 58 },
  title: { fontSize: 28, lineHeight: 34, textAlign: 'center' },
  tiles: { flexDirection: 'row', gap: Spacing.sm },
  tile: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, gap: 3 },
  tileNumber: { fontFamily: FontFamily.displayBold, fontSize: 24, lineHeight: 30 },
  tileLabel: { fontSize: 10, lineHeight: 13, textTransform: 'uppercase' },
  section: { gap: Spacing.sm, marginTop: Spacing.md },
  sub: { fontSize: 11, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1 },
  rowText: { flex: 1, gap: 2 },
  strike: { textDecorationLine: 'line-through' },
  allGood: { textAlign: 'center', marginTop: Spacing.md },
  footer: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.sm },
});
