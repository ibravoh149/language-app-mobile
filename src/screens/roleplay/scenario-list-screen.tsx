import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { AccentCard } from '@/components/accent-card';
import { Button } from '@/components/button';
import { CountUp } from '@/components/count-up';
import { Icon } from '@/components/icon';
import { MotionReveal } from '@/components/motion-reveal';
import { SelectablePill } from '@/components/selectable-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThinkingDots } from '@/components/thinking-dots';
import { CEFR_LEVELS, type CEFRLevel } from '@/constants/levels';
import { Motion } from '@/constants/motion';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { roleplayApi, type ScenarioSummary } from '@/services/roleplay-api';
import { useRoleplayStore } from '@/store/roleplay';
import { useSessionStore } from '@/store/session';

export const scenarioQueryKey = ['roleplay', 'scenarios'] as const;
export const progressQueryKey = ['roleplay', 'progress'] as const;

/** Practice tab root (prototype `SpeakScenarios`): pick a situation, then a prep brief opens. */
export function ScenarioListScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const level = useSessionStore((state) => state.profile?.chosenLevel ?? null);
  const scenarios = useQuery({ queryKey: scenarioQueryKey, queryFn: roleplayApi.listScenarios });
  const progress = useQuery({ queryKey: progressQueryKey, queryFn: roleplayApi.getProgress });
  const [filter, setFilter] = useState<CEFRLevel | 'all'>('all');
  const activeSessionId = useRoleplayStore((state) => state.activeSessionId);

  const list = scenarios.data ?? [];
  const levels = CEFR_LEVELS.filter((l) => list.some((s) => s.level === l));
  const shown = filter === 'all' ? list : list.filter((s) => s.level === filter);
  // Highlight one scenario: the first untried one at the learner's level, else the first.
  const featured = shown.find((s) => s.level === level && s.timesPracticed === 0) ?? shown[0];

  function open(scenario: ScenarioSummary) {
    haptics.press();
    router.push({ pathname: '/roleplay/[scenario]', params: { scenario: scenario.slug } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <MotionReveal index={0} style={styles.header}>
            <ThemedText type="title" style={styles.title}>{t('roleplay.list.title')}</ThemedText>
            {level ? (
              <View style={[styles.levelBadge, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
                <ThemedText type="smallBold" themeColor="accentBright">{level}</ThemedText>
              </View>
            ) : null}
          </MotionReveal>
          <MotionReveal index={1}>
            <ThemedText themeColor="textSecondary" style={styles.intro}>{t('roleplay.list.intro')}</ThemedText>
          </MotionReveal>

          <MotionReveal index={2} style={styles.tiles}>
            {[
              { value: progress.data?.sessionsCompleted ?? 0, label: t('roleplay.list.statSessions') },
              { value: progress.data?.spokenTurnsToday ?? 0, label: t('roleplay.list.statTurnsToday') },
              { value: progress.data?.streak.current ?? 0, label: t('roleplay.list.statStreak') },
            ].map((tile) => (
              <View key={tile.label} style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <CountUp value={tile.value} style={styles.tileNumber} />
                <ThemedText type="small" themeColor="textMuted" style={styles.tileLabel}>{tile.label}</ThemedText>
              </View>
            ))}
          </MotionReveal>

          {activeSessionId ? (
            <MotionReveal index={3}>
              <Pressable accessibilityRole="button"
                onPress={() => { haptics.press(); router.push({ pathname: '/roleplay/session/[sessionId]', params: { sessionId: activeSessionId } }); }}
                style={({ pressed }) => [styles.resume, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                <Icon name="chat" size={20} themeColor="accentBright" />
                <ThemedText type="smallBold" themeColor="accentBright" style={styles.flex}>{t('roleplay.list.resume')}</ThemedText>
                <Icon name="fwd" size={18} themeColor="accentBright" />
              </Pressable>
            </MotionReveal>
          ) : null}

          {levels.length > 1 ? (
            <MotionReveal index={3} style={styles.filters}>
              <SelectablePill variant="soft" label={t('roleplay.list.filterAll')} selected={filter === 'all'} onPress={() => setFilter('all')} />
              {levels.map((l) => (
                <SelectablePill key={l} variant="soft" label={l} selected={filter === l} onPress={() => setFilter(l)} />
              ))}
            </MotionReveal>
          ) : null}

          {scenarios.isPending ? (
            <ThinkingDots label={t('common.loading')} />
          ) : scenarios.isError ? (
            <View style={styles.error}>
              <ThemedText type="small" themeColor="danger">{t('roleplay.list.loadFailed')}</ThemedText>
              <Button title={t('common.retry')} variant="secondary" onPress={() => void scenarios.refetch()} />
            </View>
          ) : (
            <View style={styles.cards}>
              {shown.map((scenario, index) => (
                <MotionReveal key={scenario.id} index={4 + index}>
                  <ScenarioCard scenario={scenario} featured={scenario.id === featured?.id} onPress={() => open(scenario)} />
                </MotionReveal>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ScenarioCard({ scenario, featured, onPress }: { scenario: ScenarioSummary; featured: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onAccent = featured ? 'textOnAccent' : undefined;

  const body = (
    <View style={styles.cardBody}>
      <View style={styles.cardTop}>
        <View style={[styles.emoji, { backgroundColor: featured ? 'rgba(255,255,255,0.18)' : theme.surfaceAlt }]}>
          <ThemedText style={styles.emojiText} allowFontScaling={false}>{scenario.emoji}</ThemedText>
        </View>
        <View style={styles.cardText}>
          <ThemedText type="smallBold" themeColor={onAccent} style={styles.cardTitle}>{scenario.title}</ThemedText>
          <ThemedText type="small" themeColor={onAccent ?? 'textSecondary'} style={featured ? styles.dim : undefined}>
            {scenario.subtitle}
          </ThemedText>
        </View>
        <Icon name="fwd" size={18} themeColor={onAccent ?? 'textMuted'} />
      </View>
      <View style={styles.meta}>
        {[scenario.level, t('roleplay.list.minutes', { count: scenario.estimatedMinutes }), t('roleplay.list.words', { count: scenario.wordCount })].map((m) => (
          <View key={m} style={[styles.metaPill, featured ? styles.metaPillOnAccent : { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <ThemedText type="small" themeColor={onAccent ?? 'textSecondary'} style={styles.metaText}>{m}</ThemedText>
          </View>
        ))}
        <View style={styles.flex} />
        <ThemedText type="small" themeColor={onAccent ?? 'textMuted'} style={[styles.metaText, featured ? styles.dim : undefined]}>
          {scenario.timesPracticed > 0 ? t('roleplay.list.practised', { count: scenario.timesPracticed }) : t('roleplay.list.notTried')}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.98, Motion.press); }}
      onPressOut={() => { scale.value = withSpring(1, Motion.settle); }}
      accessibilityRole="button"
      accessibilityLabel={`${scenario.title}, ${scenario.subtitle}, ${scenario.level}`}>
      <Animated.View style={pressStyle}>
        {featured ? (
          <AccentCard>{body}</AccentCard>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>{body}</View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing['3xl'], gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 30, lineHeight: 36 },
  levelBadge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.pill, borderWidth: 1 },
  intro: { fontSize: 14, lineHeight: 21, marginTop: -Spacing.sm },
  tiles: { flexDirection: 'row', gap: Spacing.sm },
  tile: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, gap: 3 },
  tileNumber: { fontFamily: FontFamily.displayBold, fontSize: 19, lineHeight: 24 },
  tileLabel: { fontSize: 10, lineHeight: 13, textTransform: 'uppercase' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  error: { gap: Spacing.sm },
  cards: { gap: Spacing.md },
  card: { padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1 },
  cardBody: { gap: Spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  emoji: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 26, lineHeight: 32 },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15.5 },
  dim: { opacity: 0.85 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  metaPill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.pill, borderWidth: 1 },
  metaPillOnAccent: { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'transparent' },
  metaText: { fontSize: 10.5, lineHeight: 15 },
  flex: { flex: 1 },
  resume: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1 },
});
