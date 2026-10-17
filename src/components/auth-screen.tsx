import { Children, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { AppIcon } from '@/components/app-icon';
import { MotionReveal } from '@/components/motion-reveal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Motion } from '@/constants/motion';
import { FontFamily, Spacing } from '@/constants/theme';

type AuthScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** 'centered' (icon + big title, entry points like Login/Sign up) or
   * 'compact' (left-aligned title, for screens pushed on top of a flow). */
  variant?: 'centered' | 'compact';
};

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  variant = 'centered',
}: Readonly<AuthScreenProps>) {
  const isCompact = variant === 'compact';
  // Each field/control rises in turn after the header (D16 entrance choreography).
  const items = Children.toArray(children);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            {isCompact ? (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.compactHeader}>
                <ThemedText type="smallBold" style={styles.compactTitle}>
                  {title}
                </ThemedText>
                {subtitle ? (
                  <ThemedText themeColor="textSecondary" style={styles.compactSubtitle}>
                    {subtitle}
                  </ThemedText>
                ) : null}
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
                <Animated.View entering={ZoomIn.springify().damping(Motion.pop.damping).stiffness(Motion.pop.stiffness)}>
                  <AppIcon size={58} />
                </Animated.View>
                <ThemedText type="title" style={styles.title}>
                  {title}
                </ThemedText>
                {subtitle ? (
                  <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                    {subtitle}
                  </ThemedText>
                ) : null}
              </Animated.View>
            )}
            <View style={styles.form}>
              {items.map((child, index) => (
                <MotionReveal key={(child as { key?: string }).key ?? index} index={index + 1}>
                  {child}
                </MotionReveal>
              ))}
            </View>
            {footer ? (
              <Animated.View entering={FadeIn.delay(Motion.stagger * (items.length + 1)).duration(Motion.enter.duration)}>
                <ThemedView style={styles.footer}>{footer}</ThemedView>
              </Animated.View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  compactHeader: {
    gap: 4,
    marginBottom: Spacing.xl,
  },
  compactTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 21,
    lineHeight: 27,
  },
  compactSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    marginTop: 18,
    fontSize: 30,
    lineHeight: 34,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.lg,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 22,
    gap: Spacing.sm,
  },
});
