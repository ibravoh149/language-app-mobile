import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The app icon is a fixed brand mark — it doesn't change with light/dark theme. */
const BRAND = Colors.dark;

const DURATION = 900;
const BOUNCE_HEIGHT = 8;
const BOUNCE_DURATION = 320;
const DOT_STAGGER = 140;

const splashKeyframe = new Keyframe({
  0: { opacity: 1 },
  75: { opacity: 1 },
  100: { opacity: 0, easing: Easing.out(Easing.ease) },
});

export function AppIcon() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.iconBadge,
        { experimental_backgroundImage: `linear-gradient(135deg, ${BRAND.accentBright}, ${BRAND.accent})` },
      ]}>
      <Text style={[styles.iconLetter, { color: BRAND.textOnAccent }]}>S</Text>
      <View
        style={[styles.iconDot, { backgroundColor: BRAND.highlight, borderColor: theme.background }]}
      />
    </View>
  );
}

function BouncingDot({ delay, color }: { delay: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: BOUNCE_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: BOUNCE_DURATION, easing: Easing.in(Easing.quad) })
        ),
        -1
      )
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.value * BOUNCE_HEIGHT }],
    opacity: 0.4 + progress.value * 0.6,
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, animatedStyle]} />;
}

function BouncingDots() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View style={[styles.dots, { bottom: insets.bottom + Spacing['3xl'] }]}>
      <BouncingDot delay={0} color={theme.accentBright} />
      <BouncingDot delay={DOT_STAGGER} color={theme.accentBright} />
      <BouncingDot delay={DOT_STAGGER * 2} color={theme.accentBright} />
    </View>
  );
}

function SplashContent() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <>
      <View style={styles.content}>
        <AppIcon />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Sprachbar</Text>
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>{t('splash.tagline')}</Text>
      </View>
      <BouncingDots />
    </>
  );
}

export function AnimatedSplashOverlay() {
  const theme = useTheme();
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={[styles.splashOverlay, { backgroundColor: theme.background }]}>
      <SplashContent />
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={[styles.splashOverlay, { backgroundColor: theme.background }]}>
      <SplashContent />
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLetter: {
    fontFamily: FontFamily.displayBold,
    fontSize: 44,
  },
  iconDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
  },
  title: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 32,
  },
  tagline: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 16,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
