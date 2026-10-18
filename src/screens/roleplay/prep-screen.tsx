import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AccentCard } from '@/components/accent-card';
import { Button } from '@/components/button';
import { FormError } from '@/components/form-error';
import { Icon } from '@/components/icon';
import { MotionReveal } from '@/components/motion-reveal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThinkingDots } from '@/components/thinking-dots';
import { Motion } from '@/constants/motion';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useAuthSubmit } from '@/hooks/use-auth-submit';
import { useGermanVoice } from '@/hooks/use-german-voice';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { roleplayApi, type SessionDetail } from '@/services/roleplay-api';

export const sessionQueryKey = (id: string) => ['roleplay', 'session', id] as const;

/** "Before you talk" (prototype `SpeakPrep`): the scene, the goals, words and phrases to arm yourself. */
export function PrepScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { scenario: slug } = useLocalSearchParams<{ scenario: string }>();
  const scenario = useQuery({ queryKey: ['roleplay', 'scenario', slug], queryFn: () => roleplayApi.getScenario(slug) });
  const voice = useGermanVoice();
  const start = useAuthSubmit();
  const [speaking, setSpeaking] = useState<string | null>(null);

  useEffect(() => {
    if (!voice.isBusy) setSpeaking(null);
  }, [voice.isBusy]);

  function say(text: string) {
    haptics.press();
    setSpeaking(text);
    voice.speak(text);
  }

  function begin() {
    const s = scenario.data;
    if (!s) return;
    voice.stop();
    start.run(async () => {
      const { session, opening } = await roleplayApi.startSession(s.id);
      // Seed the conversation so it opens instantly with the AI's first line.
      const { situation: _a, youAre: _b, aiIs: _c, goals: _d, words: _e, phrases: _f, grammar: _g, ...summary } = s;
      queryClient.setQueryData<SessionDetail>(sessionQueryKey(session.id), { session, scenario: summary, turns: [opening], corrections: [] });
      router.replace({ pathname: '/roleplay/session/[sessionId]', params: { sessionId: session.id } });
    });
  }

  if (scenario.isPending || scenario.isError) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        {scenario.isError ? (
          <View style={styles.error}>
            <ThemedText type="small" themeColor="danger">{t('roleplay.prep.loadFailed')}</ThemedText>
            <Button title={t('common.retry')} variant="secondary" onPress={() => void scenario.refetch()} />
          </View>
        ) : (
          <ThinkingDots label={t('common.loading')} />
        )}
      </ThemedView>
    );
  }

  const s = scenario.data;
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <MotionReveal index={0}>
            <AccentCard style={styles.scene}>
              <View style={styles.sceneTop}>
                <ThemedText style={styles.sceneEmoji} allowFontScaling={false}>{s.emoji}</ThemedText>
                <View>
                  <ThemedText type="smallBold" themeColor="textOnAccent" style={styles.sceneTitle}>{s.title}</ThemedText>
                  <ThemedText type="small" themeColor="textOnAccent" style={styles.sceneKicker}>
                    {t('roleplay.prep.kicker', { level: s.level })}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="small" themeColor="textOnAccent" style={styles.situation}>{s.situation}</ThemedText>
              <View style={styles.roles}>
                <View style={styles.rolePill}>
                  <ThemedText type="small" themeColor="textOnAccent">{t('roleplay.prep.youAre', { role: s.youAre })}</ThemedText>
                </View>
                <View style={styles.rolePill}>
                  <ThemedText type="small" themeColor="textOnAccent">{t('roleplay.prep.aiIs', { role: s.aiIs })}</ThemedText>
                </View>
              </View>
            </AccentCard>
          </MotionReveal>

          <MotionReveal index={1}>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textMuted" style={styles.sub}>{t('roleplay.prep.goals')}</ThemedText>
              <View style={styles.goals}>
                {s.goals.map((goal) => (
                  <View key={goal} style={styles.goal}>
                    <View style={[styles.goalCheck, { backgroundColor: theme.accentSoft }]}>
                      <Icon name="check" size={14} themeColor="accentBright" />
                    </View>
                    <ThemedText type="small" style={styles.goalText}>{goal}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </MotionReveal>

          {s.words.length > 0 ? (
            <MotionReveal index={2}>
              <Collapsible title={t('roleplay.prep.words', { count: s.words.length })}>
                {s.words.map((w) => (
                  <Pressable key={w.de} onPress={() => say(w.de)} accessibilityRole="button" accessibilityLabel={w.de}
                    style={({ pressed }) => [styles.word, { backgroundColor: theme.surfaceSunken, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                    <Icon name="speaker" size={15} themeColor={speaking === w.de ? 'accent' : 'accentBright'} />
                    <ThemedText type="smallBold">{w.de}</ThemedText>
                    <View style={styles.flex} />
                    <ThemedText type="small" themeColor="textSecondary">{w.en}</ThemedText>
                  </Pressable>
                ))}
              </Collapsible>
            </MotionReveal>
          ) : null}

          {s.phrases.length > 0 ? (
            <MotionReveal index={3}>
              <Collapsible title={t('roleplay.prep.phrases', { count: s.phrases.length })}>
                {s.phrases.map((p) => (
                  <Pressable key={p} onPress={() => say(p)} accessibilityRole="button" accessibilityLabel={p}
                    style={({ pressed }) => [styles.phrase, { backgroundColor: theme.accentSoft, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                    <ThemedText type="smallBold" style={styles.flex}>„{p}“</ThemedText>
                    <Icon name="speaker" size={15} themeColor={speaking === p ? 'accent' : 'accentBright'} />
                  </Pressable>
                ))}
              </Collapsible>
            </MotionReveal>
          ) : null}

          {s.grammar.length > 0 ? (
            <MotionReveal index={4} style={styles.grammarBlock}>
              <ThemedText type="small" themeColor="textMuted" style={styles.sub}>{t('roleplay.prep.grammar')}</ThemedText>
              <View style={styles.chips}>
                {s.grammar.map((g) => (
                  <View key={g} style={[styles.chip, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
                    <Icon name="spark" size={13} themeColor="accentBright" />
                    <ThemedText type="small" themeColor="accentBright">{g}</ThemedText>
                  </View>
                ))}
              </View>
            </MotionReveal>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {start.formError ? <FormError message={start.formError} attempt={start.errorAttempt} /> : null}
          <Button title={t('roleplay.prep.start')} loading={start.submitting} onPress={begin} />
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>{t('roleplay.prep.hint')}</ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Card with a header that expands its content (collapsed by default, like the prototype). */
function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value * 90}deg` }] }));

  function toggle() {
    haptics.select();
    rotation.value = withTiming(open ? 0 : 1, Motion.color);
    setOpen(!open);
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.collapsibleHeader}>
        <ThemedText type="small" themeColor="textMuted" style={styles.sub}>{title}</ThemedText>
        <Animated.View style={chevron}>
          <Icon name="fwd" size={15} themeColor="textMuted" />
        </Animated.View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeInDown.duration(Motion.color.duration)} style={styles.collapsibleBody}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  error: { gap: Spacing.sm, alignItems: 'center' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.xl, gap: Spacing.md },
  scene: { padding: Spacing.lg + 2, gap: Spacing.md },
  sceneTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sceneEmoji: { fontSize: 30, lineHeight: 38 },
  sceneTitle: { fontSize: 17 },
  sceneKicker: { fontSize: 11, textTransform: 'uppercase', opacity: 0.8 },
  situation: { fontSize: 13.5, lineHeight: 20, opacity: 0.92 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  rolePill: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.pill },
  card: { padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1 },
  sub: { fontSize: 11, textTransform: 'uppercase' },
  goals: { gap: 9, marginTop: Spacing.sm },
  goal: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  goalCheck: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  goalText: { flex: 1, fontSize: 13.5, lineHeight: 19 },
  collapsibleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  collapsibleBody: { gap: Spacing.sm, marginTop: Spacing.md },
  word: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 9, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md },
  phrase: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 10, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md },
  grammarBlock: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm + 2, paddingVertical: 4, borderRadius: BorderRadius.pill, borderWidth: 1 },
  footer: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.sm },
  hint: { textAlign: 'center', fontSize: 12 },
  flex: { flex: 1 },
});
