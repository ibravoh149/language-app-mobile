import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';

import { Button } from '@/components/button';
import { ReminderTimePicker } from '@/components/reminder-time-picker';
import { OnboardingProgress } from '@/components/onboarding-screen';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { SelectablePill } from '@/components/selectable-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { CEFR_LEVELS, DAILY_MINUTES_OPTIONS, type CEFRLevel } from '@/constants/levels';
import { useTheme } from '@/hooks/use-theme';
import { useAssessmentStore } from '@/store';

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

  const suggestedLevel = aiSuggestedLevel ?? 'B1';
  const [pickingOwn, setPickingOwn] = useState(chosenLevel !== suggestedLevel);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <OnboardingProgress step={ONBOARDING_STEPS.result} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
            <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
              {t('onboarding.levelResult.startingLevelLabel')}
            </ThemedText>
            <Animated.View entering={ZoomIn.delay(100).duration(400)}>
              <ThemedText themeColor="accent" style={styles.levelDisplay}>
                {chosenLevel ?? suggestedLevel}
              </ThemedText>
            </Animated.View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(150).duration(300)}
            style={[styles.suggestionCard, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
            <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
              {t('onboarding.levelResult.aiSuggestsLabel')}
            </ThemedText>
            <ThemedText style={styles.suggestionText}>
              {t('onboarding.levelResult.suggestion', { level: suggestedLevel })}
            </ThemedText>
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
