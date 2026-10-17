import { Easing, ReduceMotion } from 'react-native-reanimated';

export const Motion = {
  press: { duration: 100, reduceMotion: ReduceMotion.System },
  settle: { damping: 22, stiffness: 300, mass: 0.8, reduceMotion: ReduceMotion.System },
  enter: { duration: 420, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
  color: { duration: 220, reduceMotion: ReduceMotion.System },
  stagger: 45,
} as const;
