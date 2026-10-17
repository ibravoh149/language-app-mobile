# Motion

Shared timings and springs live in `src/constants/motion.ts`. Use these for
press feedback, selection color transitions, and entrances instead of adding
new timing values to each screen.

- `Motion.press`: short press-in feedback.
- `Motion.settle`: controlled spring back to rest.
- `Motion.color`: selection and border transitions.
- `Motion.enter`: short content entrance with an ease-out curve.
- `Motion.stagger`: spacing between related entrances, capped at six items.

`MotionReveal` animates content on screen focus. It translates visible content
instead of hiding it behind an opacity animation, so an interrupted transition
does not leave the screen invisible. It cancels its animation on blur/unmount.

`OnboardingChoice` combines staggered entrances, animated selection colors,
checkmark feedback, and press springs. `OnboardingScreen` provides consistent
scrolling, a fixed action area, and an animated progress indicator. Step counts
come from `src/constants/onboarding.ts`.

Keep native stack transitions and back gestures in charge of route navigation.
Do not delay navigation until a decorative animation finishes. Controls remain
usable while animations run. Reserve continuous animations for active states
such as recording, and cancel them when that state ends.

Respect the system's Reduce Motion setting: shared configurations use
`ReduceMotion.System`, content entrances and recording pulses honor
`useReducedMotion`, and the root stack disables transitions when requested.

## Fun layer (D16)

- `Motion.pop`: bouncy spring for wins (a selection, a typed code digit, a
  revealed result). `Motion.shake` + `shakeDistance`: error shake (`useShake`).
  `Motion.countUp`: rolling a value up to its final state. `Motion.confetti`
  and `celebrateDismissMs`: the celebration overlay.
- `celebrate({ title, subtitle, icon })` (`src/store/celebration.ts`) shows the
  prototype's `<Celebrate>` overlay: scrim, falling confetti, a popping card,
  a success haptic and a screen-reader announcement. It auto-dismisses after
  2.4 s or on tap. `CelebrationHost` sits above the root stack, so call it and
  navigate in the same tick; it never delays navigation.
- `ConfettiBurst` is the confetti on its own (touch-transparent), e.g. on the
  level reveal. Both render no confetti when Reduce Motion is on.
- `FormError` slides in, shakes and buzzes on every failed attempt. `OtpInput`
  pops each digit and shakes when `errorKey` increments.
- Haptics live in `src/services/haptics.ts` (`press`, `select`, `success`,
  `error`): Button press-in, choice/pill selection, celebrations and errors.
  Android uses the system haptic constants.

# Onboarding

The route order is `language` -> `target-language` -> `placement-test`
(self-assessment) -> `speaking-sample` -> `level-result` -> `choose-voice`.
Selections use the existing stores so native back navigation preserves them.

The screen fetches a prompt through `getPlacementPrompt`, passing source/target
languages and the self-reported level. The mock service issues an ID and text,
varying the text between fresh attempts. Fixtures live under services/mocks;
they are not validated assessment items. Prompts stay stable during recording.
The screen handles loading, retry, and skipping without a loaded prompt.

Submission sends the issued prompt ID (nullable when skipped), transcript,
languages, claimed level, and skipped status. Replace the service functions
with backend calls for real prompt selection and evaluation. The mock result
only echoes the claimed level; it does not evaluate speech. Users can still
change their level on the result screen.
