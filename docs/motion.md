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

The speaking sample creates a placement attempt (`placementApi.createAttempt`)
with the learner's **spoken** language (B-FLOW-3; separate from the interface
language), target `de` and the self-rating. The server picks the prompt (D8).
Submitting sends the on-device transcript, or `skipped: true`; it's idempotent,
so retries are safe, and an expired attempt (404) fetches a fresh prompt.
`scored: false` is the self-rating fallback, not an error. The attempt id is
stored as `assessmentId` and linked at signup or `PATCH /me/profile`.

While scoring, `ThinkingDots` shows; while recording, the mic halo follows the
input level (`useSpeechRecognition().level`) and transcript words fade in.
The level result shows the AI's `reason`, strengths and focus areas when the
sample was scored. "Start as beginner" also goes through the level result with
A1 preselected, so the daily goal and reminder are set (B-FLOW-5).
