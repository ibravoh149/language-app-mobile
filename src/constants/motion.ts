import { Easing, ReduceMotion } from 'react-native-reanimated';

export const Motion = {
  press: { duration: 100, reduceMotion: ReduceMotion.System },
  settle: { damping: 22, stiffness: 300, mass: 0.8, reduceMotion: ReduceMotion.System },
  enter: { duration: 420, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
  color: { duration: 220, reduceMotion: ReduceMotion.System },
  stagger: 45,
  /** Bouncy spring for "yes!" moments: a selection, a filled code digit, a revealed result. */
  pop: { damping: 9, stiffness: 320, mass: 0.7, reduceMotion: ReduceMotion.System },
  /** One leg of an error shake; `shakeDistance` is the peak offset in px. */
  shake: { duration: 55, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System },
  shakeDistance: 8,
  /** Rolling a number or level up to its final value. */
  countUp: { duration: 650, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
  /** Celebration overlay: confetti fall range, card entrance and auto-dismiss (prototype: 2.4 s). */
  confetti: { pieces: 30, minDuration: 1100, maxDuration: 2100, maxDelay: 350, easing: Easing.linear },
  celebrateDismissMs: 2400,
  /** Smoothing for live mic input level; buffers arrive every ~250 ms. */
  level: { duration: 240, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System },
  /** "AI is thinking" dots: one bounce cycle, offset per dot by `stagger * 3`. */
  thinking: { duration: 420, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System },
} as const;
