import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/button';
import { ConfettiBurst } from '@/components/celebrate';
import { ReminderTimePicker } from '@/components/reminder-time-picker';
import { OnboardingProgress } from '@/components/onboarding-screen';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { SelectablePill } from '@/components/selectable-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { BEGINNER_LEVEL, CEFR_LEVELS, DAILY_MINUTES_OPTIONS, type CEFRLevel } from '@/constants/levels';
import { Motion } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { useAssessmentStore } from '@/store';

/**
 * The starting level: on first show it counts up the CEFR ladder to `level`
 * and lands with a spring; later changes just pop. `celebrate` adds the success
 * haptic and the confetti callback on landing.
 */
function LevelReveal({ level, celebrate, onRevealed }: { level: CEFRLevel; celebrate: boolean; onRevealed: () => void }) {
  const reducedMotion = useReducedMotion();
  const target = Math.max(0, CEFR_LEVELS.indexOf(level));
  const [shown, setShown] = useState(reducedMotion ? target : 0);
  const revealed = useRef(reducedMotion);
  const scale = useSharedValue(reducedMotion ? 1 : 0.7);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (revealed.current) {
      setShown(target);
      scale.value = withSequence(withTiming(1.12, Motion.press), withSpring(1, Motion.pop));
      return;
    }
    // Count up A1 → … → level, then land.
    const stepMs = Motion.countUp.duration / (target + 1);
    let step = 0;
    const timer = setInterval(() => {
      if (step >= target) {
        clearInterval(timer);
        revealed.current = true;
        scale.value = withSpring(1, Motion.pop);
        if (celebrate) {
          haptics.success();
          onRevealed();
        } else {
          haptics.select();
        }
        return;
      }
      step += 1;
      setShown(step);
      haptics.select();
    }, stepMs);
    scale.value = withTiming(0.92, Motion.countUp);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onRevealed is a fire-once callback
  }, [target, scale]);

  return (
    <Animated.View style={style} accessible accessibilityLabel={level} accessibilityLiveRegion="polite">
      <ThemedText themeColor="accent" style={styles.levelDisplay}>
        {CEFR_LEVELS[shown]}
      </ThemedText>
    </Animated.View>
  );
}

/** Strengths / focus areas from placement scoring, popping in one by one. */
function FeedbackChips({ groups }: { groups: { label: string; items: string[]; tone: 'success' | 'accent' }[] }) {
  const theme = useTheme();
  let order = 0;
  return (
    <View style={styles.chipGroups}>
      {groups.filter((group) => group.items.length > 0).map((group) => (
        <View key={group.label} style={styles.chipRow}>
          <ThemedText type="small" themeColor="textMuted" style={styles.chipLabel}>
            {group.label}
          </ThemedText>
          {group.items.map((item) => (
            <Animated.View
              key={item}
              entering={ZoomIn.delay(Motion.countUp.duration + order++ * Motion.stagger)
                .springify()
                .damping(Motion.pop.damping)
                .stiffness(Motion.pop.stiffness)}
              style={[styles.chip, { backgroundColor: group.tone === 'success' ? theme.successSoft : theme.surface, borderColor: theme.border }]}>
              <ThemedText type="small" themeColor={group.tone === 'success' ? 'success' : 'accentBright'}>
                {item}
              </ThemedText>
            </Animated.View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function LevelResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();

  const aiSuggestedLevel = useAssessmentStore((state) => state.aiSuggestedLevel);
  const chosenLevel = useAssessmentStore((state) => state.chosenLevel);
  const setChosenLevel = useAssessmentStore((state) => state.setChosenLevel);
  const dailyMinutes = useAssessmentStore((state) => state.dailyMinutes);
  const setDailyMinutes = useAssessmentStore((state) => state.setDailyMinutes);
  const reminderHour = useAssessmentStore((state) => state.reminderHour);
  const reminderMinute = useAssessmentStore((state) => state.reminderMinute);
  const setReminderTime = useAssessmentStore((state) => state.setReminderTime);

  const feedback = useAssessmentStore((state) => state.placementFeedback);
  // No suggestion means the learner chose "start as beginner" (B-FLOW-5).
  const isBeginnerPath = aiSuggestedLevel === null;
  const suggestedLevel = aiSuggestedLevel ?? BEGINNER_LEVEL;
  const scored = !!feedback?.scored;
  const cardLabel = isBeginnerPath ? 'beginnerLabel' : scored ? 'aiSuggestsLabel' : 'selfRatedLabel';
  const [pickingOwn, setPickingOwn] = useState(chosenLevel !== suggestedLevel);
  const [burst, setBurst] = useState(0);
  // Confetti only when the placement result is at or above the learner's own rating;
  // scoring below it isn't a win to celebrate.
  const selfRatedLevel = useAssessmentStore((state) => state.selfRatedLevel);
  const metSelfRating = !aiSuggestedLevel || !selfRatedLevel
    || CEFR_LEVELS.indexOf(aiSuggestedLevel) >= CEFR_LEVELS.indexOf(selfRatedLevel);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <OnboardingProgress step={ONBOARDING_STEPS.result} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
            <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
              {t('onboarding.levelResult.startingLevelLabel')}
            </ThemedText>
            <LevelReveal level={chosenLevel ?? suggestedLevel} celebrate={metSelfRating} onRevealed={() => setBurst((n) => n + 1)} />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(150).duration(300)}
            style={[styles.suggestionCard, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
            <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
              {t(`onboarding.levelResult.${cardLabel}`)}
            </ThemedText>
            <ThemedText style={styles.suggestionText}>
              {isBeginnerPath
                ? t('onboarding.levelResult.beginnerNote')
                : t('onboarding.levelResult.suggestion', { level: suggestedLevel })}
            </ThemedText>
            {scored && feedback?.reason ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.reason}>
                {feedback.reason}
              </ThemedText>
            ) : null}
            {scored && feedback ? (
              <FeedbackChips
                groups={[
                  { label: t('onboarding.levelResult.strengthsLabel'), items: feedback.strengths, tone: 'success' },
                  { label: t('onboarding.levelResult.focusLabel'), items: feedback.focusAreas, tone: 'accent' },
                ]}
              />
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.choiceRow}>
            <View style={styles.choiceButton}>
              <Button
                title={t('onboarding.levelResult.acceptLevel', { level: suggestedLevel })}
                variant={pickingOwn ? 'secondary' : 'primary'}
                onPress={() => {
                  setPickingOwn(false);
                  setChosenLevel(suggestedLevel);
                }}
              />
            </View>
            <View style={styles.choiceButton}>
              <Button
                title={t('onboarding.levelResult.pickOwn')}
                variant={pickingOwn ? 'primary' : 'secondary'}
                onPress={() => setPickingOwn(true)}
              />
            </View>
          </Animated.View>

          {pickingOwn ? (
            <Animated.View entering={FadeInDown.duration(220)} style={styles.pillsRow}>
              {CEFR_LEVELS.map((level: CEFRLevel) => (
                <SelectablePill
                  key={level}
                  label={level}
                  selected={chosenLevel === level}
                  onPress={() => setChosenLevel(level)}
                />
              ))}
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.section}>
            <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
              {t('onboarding.levelResult.dailyMinutesLabel')}
            </ThemedText>
            <View style={styles.pillsRow}>
              {DAILY_MINUTES_OPTIONS.map((minutes) => (
                <SelectablePill
                  key={minutes}
                  variant="soft"
                  label={`${minutes} min`}
                  selected={dailyMinutes === minutes}
                  onPress={() => setDailyMinutes(minutes)}
                />
              ))}
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(300).duration(300)}
            style={[styles.reminderRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.reminderText}>
              <ThemedText type="smallBold">{t('onboarding.levelResult.reminderTitle')}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {t('onboarding.levelResult.reminderTimeLabel')}
              </ThemedText>
            </View>
            <ReminderTimePicker hour={reminderHour} minute={reminderMinute} onChange={setReminderTime} />
          </Animated.View>

        </ScrollView>
        <Button
          title={t('onboarding.levelResult.nextChooseVoice')}
          onPress={() => router.push('/(onboarding)/choose-voice')}
        />
      </SafeAreaView>
      {burst > 0 ? <ConfettiBurst burstKey={burst} /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  levelDisplay: {
    fontFamily: FontFamily.displayBold,
    fontSize: 56,
    lineHeight: 64,
  },
  suggestionCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: 4,
  },
  suggestionText: {
    fontSize: 15,
    lineHeight: 21,
  },
  reason: {
    lineHeight: 19,
  },
  chipGroups: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chipLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  chip: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  choiceButton: {
    flex: 1,
  },
  section: {
    gap: Spacing.sm,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  reminderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  reminderText: {
    flex: 1,
    minWidth: 140,
    marginEnd: Spacing.sm,
    gap: 2,
  },
});
