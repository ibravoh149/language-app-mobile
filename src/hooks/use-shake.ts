import { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Motion } from '@/constants/motion';

/** A short horizontal "no" shake for errors. Spread `style` on an Animated.View and call `shake()`. */
export function useShake() {
  const reducedMotion = useReducedMotion();
  const offset = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  function shake() {
    if (reducedMotion) return;
    const d = Motion.shakeDistance;
    offset.value = withSequence(
      withTiming(-d, Motion.shake),
      withTiming(d, Motion.shake),
      withTiming(-d * 0.6, Motion.shake),
      withTiming(d * 0.6, Motion.shake),
      withTiming(0, Motion.shake)
    );
  }

  return { style, shake };
}
