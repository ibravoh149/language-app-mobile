import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/icon';
import { MotionReveal } from '@/components/motion-reveal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Motion } from '@/constants/motion';
import { ONBOARDING_STEP_COUNT } from '@/constants/onboarding';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function OnboardingProgress({ step }: { step: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const progress = useSharedValue((step - 1) / ONBOARDING_STEP_COUNT);
  useEffect(() => {
    progress.value = withTiming(step / ONBOARDING_STEP_COUNT, Motion.enter);
  }, [step, progress]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as `${number}%` }));

  return (
    <View style={styles.progress} accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: ONBOARDING_STEP_COUNT, now: step }}
      accessibilityLabel={t('onboarding.stepIndicator', { step, total: ONBOARDING_STEP_COUNT })}>
      <View style={[styles.track, { backgroundColor: theme.surfaceSunken }]}>
        <Animated.View style={[styles.fill, { backgroundColor: theme.accent }, fill]} />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.step}>
        {t('onboarding.stepIndicator', { step, total: ONBOARDING_STEP_COUNT })}
      </ThemedText>
    </View>
  );
}

export function OnboardingScreen({ step, title, subtitle, icon, children, footer }: {
  step: number;
  title: string;
  subtitle?: string;
  icon: IconName;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <OnboardingProgress step={step} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <MotionReveal style={styles.header}>
            <Icon name={icon} size={28} themeColor="accentBright" />
            <ThemedText type="title">{title}</ThemedText>
            {subtitle ? <ThemedText type="small" themeColor="textSecondary">{subtitle}</ThemedText> : null}
          </MotionReveal>
          <View style={styles.choices}>{children}</View>
        </ScrollView>
        <View style={styles.footer}>{footer}</View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  progress: { gap: Spacing.sm, paddingTop: Spacing.sm, paddingBottom: Spacing.xl },
  track: { height: 4, overflow: 'hidden', borderRadius: 2 },
  fill: { height: '100%', borderRadius: 2 },
  step: { fontSize: 11, lineHeight: 16 },
  content: { gap: Spacing['2xl'], paddingBottom: Spacing.xl },
  header: { gap: Spacing.md },
  choices: { gap: Spacing.md },
  footer: { gap: Spacing.sm, paddingTop: Spacing.md },
});
