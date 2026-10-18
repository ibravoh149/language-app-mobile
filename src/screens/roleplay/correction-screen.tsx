import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccentCard } from '@/components/accent-card';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { MotionReveal } from '@/components/motion-reveal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThinkingDots } from '@/components/thinking-dots';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useGermanVoice } from '@/hooks/use-german-voice';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { type Correction, roleplayApi } from '@/services/roleplay-api';

import { sessionQueryKey } from './prep-screen';

/**
 * Correction + the "why" (prototype `SpeakCorrection`). Shows one learner turn's
 * corrections (`turnId`), or all of the session's when no turn is given.
 */
export function CorrectionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { sessionId, turnId } = useLocalSearchParams<{ sessionId: string; turnId?: string }>();
  const detail = useQuery({ queryKey: sessionQueryKey(sessionId), queryFn: () => roleplayApi.getSession(sessionId), staleTime: Infinity });
  const voice = useGermanVoice();

  if (detail.isPending) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThinkingDots label={t('common.loading')} />
      </ThemedView>
    );
  }
  if (detail.isError) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText type="small" themeColor="danger">{t('roleplay.convo.loadFailed')}</ThemedText>
        <Button title={t('common.retry')} variant="secondary" onPress={() => void detail.refetch()} />
      </ThemedView>
    );
  }

  const corrections = detail.data.corrections.filter((c) => !turnId || c.turnId === turnId);
  const turnText = (c: Correction) => detail.data.turns.find((turn) => turn.id === c.turnId)?.text ?? c.original;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {corrections.length === 0 ? (
            <ThemedText themeColor="textSecondary">{t('roleplay.correction.none')}</ThemedText>
          ) : (
            corrections.map((c, i) => (
              <CorrectionBlock key={c.id} correction={c} sentence={turnText(c)} index={i} total={corrections.length}
                onListen={() => { haptics.press(); voice.speak(c.corrected); }} />
            ))
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Button title={t('roleplay.correction.tryAgain')} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function CorrectionBlock({ correction, sentence, index, total, onListen }: {
  correction: Correction;
  sentence: string;
  index: number;
  total: number;
  onListen: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  // Strike the wrong fragment inside the learner's own sentence when it's found there.
  const at = sentence.indexOf(correction.original);
  const before = at >= 0 ? sentence.slice(0, at) : '';
  const after = at >= 0 ? sentence.slice(at + correction.original.length) : '';
  const base = index * 3;

  return (
    <View style={styles.block}>
      {total > 1 ? (
        <ThemedText type="small" themeColor="textMuted" style={styles.sub}>{t('roleplay.correction.counter', { n: index + 1, total })}</ThemedText>
      ) : null}
      <MotionReveal index={base}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textMuted" style={styles.sub}>{t('roleplay.correction.youSaid')}</ThemedText>
          <ThemedText style={styles.sentence}>
            „{before}
            <ThemedText themeColor="danger" style={[styles.sentence, styles.strike]}>{at >= 0 ? correction.original : sentence}</ThemedText>
            {after}“
          </ThemedText>
        </View>
      </MotionReveal>

      <MotionReveal index={base + 1}>
        <Pressable onPress={onListen} accessibilityRole="button" accessibilityHint={t('roleplay.correction.listen')}>
          <AccentCard>
            <View style={styles.betterHeader}>
              <ThemedText type="small" themeColor="textOnAccent" style={[styles.sub, styles.dim]}>{t('roleplay.correction.better')}</ThemedText>
              <Icon name="speaker" size={16} themeColor="textOnAccent" />
            </View>
            <ThemedText themeColor="textOnAccent" style={[styles.sentence, styles.better]}>„{correction.corrected}“</ThemedText>
          </AccentCard>
        </Pressable>
      </MotionReveal>

      <MotionReveal index={base + 2}>
        <View style={[styles.card, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <View style={styles.whyHeader}>
            <ThemedText type="smallBold" style={styles.why}>{t('roleplay.correction.why')}</ThemedText>
            <View style={[styles.rulePill, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
              <ThemedText type="small" themeColor="accentBright">{correction.ruleName}</ThemedText>
            </View>
          </View>
          <ThemedText themeColor="textSecondary" style={styles.explanation}>{correction.explanation}</ThemedText>
        </View>
      </MotionReveal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.xl, gap: Spacing.xl },
  block: { gap: Spacing.md },
  card: { padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1, gap: Spacing.sm },
  sub: { fontSize: 11, textTransform: 'uppercase' },
  dim: { opacity: 0.85 },
  sentence: { fontSize: 16, lineHeight: 23 },
  strike: { textDecorationLine: 'line-through' },
  betterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  better: { fontWeight: '700', marginTop: 6 },
  whyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  why: { fontSize: 17 },
  rulePill: { flexShrink: 1, paddingHorizontal: Spacing.sm + 2, paddingVertical: 3, borderRadius: BorderRadius.pill, borderWidth: 1 },
  explanation: { fontSize: 14, lineHeight: 21 },
  footer: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
});
