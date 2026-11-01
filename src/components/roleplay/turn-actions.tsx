import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { AccentCard } from '@/components/accent-card';
import { Icon } from '@/components/icon';
import { WordCard } from '@/components/roleplay/word-card';
import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { type Action, KNOWN_ACTION_TYPES } from '@/services/roleplay-api';

const spring = (delay: number) => FadeInDown.delay(delay).springify().damping(Motion.pop.damping).stiffness(Motion.pop.stiffness);

/**
 * The tutor's actions for one reply (roleplay v3, D24), in order. Unknown types are
 * ignored, as the contract requires.
 */
export function TurnActions({ actions, onSpeak, onFinish, finishing }: {
  actions: Action[];
  onSpeak: (text: string) => void;
  onFinish: () => void;
  finishing: boolean;
}) {
  const known = actions.filter((a) => (KNOWN_ACTION_TYPES as readonly string[]).includes(a.type));
  if (known.length === 0) return null;
  return (
    <View style={styles.list}>
      {known.map((action, i) => {
        const delay = Motion.enter.duration + i * Motion.stagger * 3;
        switch (action.type) {
          case 'word_card':
            return <WordCard key={`w-${action.word.id}-${i}`} word={action.word} onSpeak={onSpeak} delay={delay} />;
          case 'play':
            return <PlayChip key={`p-${i}`} text={action.text} onSpeak={onSpeak} delay={delay} />;
          case 'grammar_card':
            return <GrammarCard key={`g-${i}`} action={action} onSpeak={onSpeak} delay={delay} />;
          case 'goal_achieved':
            return <GoalReached key={`goal-${action.goalIndex}`} goal={action.goal} delay={delay} />;
          case 'scenario_complete':
            return <ScenarioComplete key={`done-${i}`} reason={action.reason} onFinish={onFinish} finishing={finishing} delay={delay} />;
          default:
            return null;
        }
      })}
    </View>
  );
}

function PlayChip({ text, onSpeak, delay }: { text: string; onSpeak: (text: string) => void; delay: number }) {
  const theme = useTheme();
  return (
    <Animated.View entering={spring(delay)} style={styles.left}>
      <Pressable onPress={() => { haptics.press(); onSpeak(text); }} accessibilityRole="button"
        style={({ pressed }) => [styles.play, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
        <Icon name="play" size={14} themeColor="accentBright" filled />
        <ThemedText type="smallBold" themeColor="accentBright" style={styles.playText}>{text}</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

function GrammarCard({ action, onSpeak, delay }: { action: Extract<Action, { type: 'grammar_card' }>; onSpeak: (text: string) => void; delay: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Animated.View entering={spring(delay)} style={[styles.card, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <View style={styles.grammarHead}>
        <Icon name="spark" size={14} themeColor="accentBright" />
        <ThemedText type="small" themeColor="textMuted" style={styles.sub}>{t('roleplay.actions.grammar')}</ThemedText>
      </View>
      <ThemedText type="smallBold" style={styles.ruleName}>{action.ruleName}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.explanation}>{action.explanation}</ThemedText>
      {action.examples.map((ex) => (
        <Pressable key={ex} onPress={() => { haptics.press(); onSpeak(ex); }} accessibilityRole="button" style={styles.example}>
          <Icon name="speaker" size={13} themeColor="accentBright" />
          <ThemedText type="small" style={styles.exampleText}>„{ex}“</ThemedText>
        </Pressable>
      ))}
    </Animated.View>
  );
}

function GoalReached({ goal, delay }: { goal: string; delay: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Animated.View entering={ZoomIn.delay(delay).springify().damping(Motion.pop.damping).stiffness(Motion.pop.stiffness)}
      style={[styles.goal, { backgroundColor: theme.successSoft }]}>
      <Icon name="check" size={15} themeColor="success" />
      <ThemedText type="small" themeColor="success" style={styles.goalText}>{t('roleplay.actions.goalReached', { goal })}</ThemedText>
    </Animated.View>
  );
}

function ScenarioComplete({ reason, onFinish, finishing, delay }: { reason: string; onFinish: () => void; finishing: boolean; delay: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Animated.View entering={spring(delay)}>
      <AccentCard style={styles.complete}>
        <ThemedText type="smallBold" themeColor="textOnAccent" style={styles.completeTitle}>🎉 {t('roleplay.actions.completeTitle')}</ThemedText>
        <ThemedText type="small" themeColor="textOnAccent" style={styles.dim}>{reason}</ThemedText>
        <Pressable onPress={() => { haptics.press(); onFinish(); }} disabled={finishing} accessibilityRole="button"
          style={({ pressed }) => [styles.finish, { backgroundColor: theme.textOnAccent, opacity: finishing ? 0.6 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <ThemedText type="smallBold" themeColor="accent">{t('roleplay.actions.finish')}</ThemedText>
        </Pressable>
      </AccentCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm, alignSelf: 'stretch', maxWidth: '92%' },
  left: { alignItems: 'flex-start' },
  play: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.pill, borderWidth: 1, maxWidth: '100%' },
  playText: { flexShrink: 1 },
  card: { padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, gap: 4 },
  grammarHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sub: { fontSize: 11, textTransform: 'uppercase' },
  ruleName: { fontSize: 15 },
  explanation: { lineHeight: 19 },
  example: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  exampleText: { flex: 1, fontStyle: 'italic' },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.pill },
  goalText: { flexShrink: 1 },
  complete: { gap: Spacing.sm },
  completeTitle: { fontSize: 16 },
  dim: { opacity: 0.9 },
  finish: { alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: BorderRadius.pill, marginTop: 4 },
});
