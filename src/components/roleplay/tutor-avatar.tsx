import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

export type TutorMood = 'idle' | 'listening' | 'thinking' | 'speaking';

/**
 * The conversation partner's face (F2-T3). It breathes and blinks when idle, leans in and
 * pulses with the learner's mic while they speak, looks up while the reply is generated,
 * and moves its mouth with the real loudness of the Piper voice. `cheerKey` changes
 * trigger a happy hop (goal reached, streak, scene done).
 */
export function TutorAvatar({ mood, voiceLevel, micLevel, cheerKey, size = 76, badge }: {
  mood: TutorMood;
  /** Loudness of the tutor's voice, 0–1 (`useGermanVoice().level`). */
  voiceLevel: SharedValue<number>;
  /** Loudness of the learner's mic, 0–1 (`useSpeechRecognition().level`). */
  micLevel: SharedValue<number>;
  cheerKey: number;
  size?: number;
  /** The scenario's emoji, worn as a badge (the role: 🏥, ☕, …). */
  badge?: string;
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const breath = useSharedValue(0);
  const blink = useSharedValue(1);
  const tilt = useSharedValue(0);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const jump = useSharedValue(0);
  const happy = useSharedValue(0);
  const speaking = useSharedValue(0);
  const thinking = useSharedValue(0);
  const listening = useSharedValue(0);

  // Idle life: slow breathing and a blink every few seconds (off with Reduce Motion).
  useEffect(() => {
    if (reducedMotion) {
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(withTiming(1, Motion.breathe), -1, true);
    let timer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      timer = setTimeout(() => {
        blink.value = withSequence(withTiming(0.1, Motion.blink), withTiming(1, Motion.blink));
        scheduleBlink();
      }, Motion.blinkEveryMs * (0.6 + Math.random() * 0.8));
    };
    scheduleBlink();
    return () => {
      clearTimeout(timer);
      cancelAnimation(breath);
    };
  }, [reducedMotion, breath, blink]);

  // Pose per mood.
  useEffect(() => {
    tilt.value = withSpring(mood === 'listening' ? -7 : mood === 'thinking' ? 6 : 0, Motion.settle);
    lookX.value = withSpring(mood === 'thinking' ? 0.6 : mood === 'listening' ? -0.2 : 0, Motion.settle);
    lookY.value = withSpring(mood === 'thinking' ? -0.7 : 0, Motion.settle);
    speaking.value = withTiming(mood === 'speaking' ? 1 : 0, Motion.color);
    thinking.value = withTiming(mood === 'thinking' ? 1 : 0, Motion.color);
    listening.value = withTiming(mood === 'listening' ? 1 : 0, Motion.color);
  }, [mood, tilt, lookX, lookY, speaking, thinking, listening]);

  // A cheer: happy eyes and a hop.
  useEffect(() => {
    if (!cheerKey) return;
    happy.value = withSequence(withTiming(1, Motion.color), withDelay(1400, withTiming(0, Motion.color)));
    jump.value = withSequence(withTiming(-size * 0.2, Motion.color), withSpring(0, Motion.pop));
  }, [cheerKey, happy, jump, size]);

  const head = useAnimatedStyle(() => ({
    transform: [
      { translateY: jump.value - breath.value * 2 - listening.value * micLevel.value * 4 },
      { rotate: `${tilt.value}deg` },
      { scale: 1 + breath.value * 0.025 + listening.value * micLevel.value * 0.06 + speaking.value * voiceLevel.value * 0.03 },
    ],
  }));
  const halo = useAnimatedStyle(() => {
    const active = Math.max(speaking.value * voiceLevel.value, listening.value * micLevel.value);
    return { opacity: Math.max(speaking.value, listening.value) * (0.25 + active * 0.5), transform: [{ scale: 1.04 + active * 0.22 }] };
  });

  const eyeSize = size * 0.19;
  const pupil = eyeSize * 0.52;
  const eye = useAnimatedStyle(() => ({
    opacity: 1 - happy.value,
    transform: [{ scaleY: blink.value * (1 + listening.value * 0.1) }],
  }));
  const pupilStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: lookX.value * eyeSize * 0.2 }, { translateY: lookY.value * eyeSize * 0.2 }],
  }));
  const happyEye = useAnimatedStyle(() => ({ opacity: happy.value }));
  const cheek = useAnimatedStyle(() => ({ opacity: 0.55 + happy.value * 0.45 }));

  const mouthWide = size * 0.26;
  const mouthRound = size * 0.085;
  const openMouth = useAnimatedStyle(() => {
    const talk = speaking.value * (size * 0.035 + voiceLevel.value * size * 0.17);
    const ooh = thinking.value * mouthRound;
    return {
      opacity: Math.min(1, speaking.value + thinking.value),
      height: Math.max(talk, ooh, 1),
      width: mouthRound + speaking.value * (mouthWide * 0.85 - mouthRound),
    };
  });
  const smile = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, speaking.value + thinking.value),
    transform: [{ scaleX: 1 + happy.value * 0.2 }, { scaleY: 1 + happy.value * 0.4 }],
  }));

  const stroke = Math.max(2, size * 0.04);
  const radius = size * 0.36;

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: theme.accentGlow }, halo]} />
      <Animated.View style={[StyleSheet.absoluteFill, head]}>
        <LinearGradient colors={[theme.accentGradientStart, theme.accentGradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />

        <View style={[styles.eyes, { top: size * 0.3, gap: size * 0.16 }]}>
          {[0, 1].map((i) => (
            <View key={i} style={{ width: eyeSize, height: eyeSize }}>
              <Animated.View style={[styles.center, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: theme.textOnAccent }, eye]}>
                <Animated.View style={[{ width: pupil, height: pupil, borderRadius: pupil / 2, backgroundColor: theme.characterInk }, pupilStyle]} />
              </Animated.View>
              <Animated.View style={[styles.overlay, {
                top: eyeSize * 0.2, height: eyeSize * 0.55, borderTopLeftRadius: eyeSize, borderTopRightRadius: eyeSize,
                borderWidth: stroke, borderBottomWidth: 0, borderColor: theme.textOnAccent,
              }, happyEye]} />
            </View>
          ))}
        </View>

        <View style={[styles.cheeks, { top: size * 0.52, gap: size * 0.4 }]}>
          {[0, 1].map((i) => (
            <Animated.View key={i} style={[{ width: size * 0.12, height: size * 0.07, borderRadius: size, backgroundColor: theme.characterBlush }, cheek]} />
          ))}
        </View>

        <View style={[styles.mouthBox, { top: size * 0.6, height: size * 0.24 }]}>
          <Animated.View style={[styles.overlay, styles.smileBox, {
            left: (size - mouthWide) / 2, width: mouthWide, height: mouthWide / 2,
            borderBottomLeftRadius: mouthWide, borderBottomRightRadius: mouthWide,
            borderWidth: stroke, borderTopWidth: 0, borderColor: theme.textOnAccent,
          }, smile]} />
          <Animated.View style={[{ borderRadius: size, backgroundColor: theme.characterInk }, openMouth]} />
        </View>
      </Animated.View>

      {badge ? (
        <View style={[styles.badge, styles.center, {
          width: size * 0.38, height: size * 0.38, borderRadius: size * 0.19, right: -size * 0.06, bottom: -size * 0.04,
          backgroundColor: theme.surface, borderColor: theme.border,
        }]}>
          <ThemedText style={{ fontSize: size * 0.2, lineHeight: size * 0.26 }}>{badge}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  eyes: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  cheeks: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  overlay: { position: 'absolute', left: 0, right: 0 },
  mouthBox: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  smileBox: { top: 0, right: undefined },
  badge: { position: 'absolute', borderWidth: 1 },
});
