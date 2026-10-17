import { useIsFocused } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Motion } from '@/constants/motion';

export function MotionReveal({ children, index = 0, style }: {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (!focused || reducedMotion) {
      offset.value = 0;
      return;
    }
    // Keep content visible even if a native transition interrupts the entrance.
    offset.value = 18;
    offset.value = withDelay(Math.min(index, 6) * Motion.stagger, withTiming(0, Motion.enter));
    return () => cancelAnimation(offset);
  }, [focused, index, offset, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
