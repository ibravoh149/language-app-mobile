# Sprachbar — mobile app

React Native client for **Sprachbar**, a speaking-first language-learning app.
It is built with Expo SDK 57 and runs on iOS and Android, with a web build for
quick UI checks. The backend lives in
[language-app-server](https://github.com/ibravoh149/language-app-server).

Speech runs **on the device**: Whisper transcribes the learner's voice and
Kokoro speaks voice previews through
[`react-native-executorch`](https://docs.swmansion.com/react-native-executorch/),
so no audio has to leave the phone for these steps.

> **Project status — early development.** Onboarding is implemented end to
> end in the UI, but placement scoring is mocked, sign-up does not call a
> backend yet, and the main tab area is a placeholder. See
> [Current status](#current-status).

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [On-device speech](#on-device-speech)
- [Internationalisation and RTL](#internationalisation-and-rtl)
- [Design system](#design-system)
- [Current status](#current-status)
- [Building and releasing](#building-and-releasing)
- [Conventions](#conventions)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Six-step onboarding:** spoken language → learning language →
  self-assessment → speaking sample → level result → voice choice, followed by
  sign-up and email verification.
- **Live speaking sample:** the learner reads a level-appropriate prompt aloud
  and sees a streaming on-device transcript.
- **Voice preview:** streamed on-device text-to-speech at three speeds.
- **Starting level:** accept the suggested CEFR level (A1–C1) or pick your own,
  set a daily goal (5/15/30 min) and a reminder time with a native picker.
- **Six interface languages:** English, German, French, Spanish, Turkish and
  Arabic, with full right-to-left layout for Arabic.
- **Light and dark themes**, Reduce Motion support, and native stack navigation
  with system back gestures.
- **Persisted preferences:** choices survive restarts via AsyncStorage.

Courses: German is available; French, Spanish and Italian are listed as
"coming soon".

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK 57, React Native 0.86 (New Architecture), React 19 |
| Language | TypeScript 6, strict mode, React Compiler enabled |
| Navigation | expo-router (file-based, typed routes), native stack and native tabs |
| State | Zustand with `persist` + AsyncStorage |
| Server state | TanStack Query |
| HTTP | Axios |
| Forms | react-hook-form + zod |
| i18n | i18next + react-i18next + expo-localization |
| Animation | Reanimated 4, react-native-worklets |
| Speech | react-native-executorch (Whisper, Kokoro), react-native-audio-api |
| UI | Lucide icons, expo-linear-gradient, `@expo/ui` date-time picker |
| Builds | EAS Build / EAS Submit |

---

## Getting started

### Prerequisites

- Node.js 20+ and Yarn
- Xcode 16+ with an iOS 17+ simulator, and/or Android Studio with an API 26+
  emulator
- CocoaPods (`brew install cocoapods`) for iOS builds
- Optionally, the [backend](https://github.com/ibravoh149/language-app-server)
  running locally

### Install and run

```bash
git clone git@github.com:ibravoh149/language-app-mobile.git
cd language-app-mobile
yarn install
cp .env.example .env
```

The app uses native modules (ExecuTorch, audio API), so it **does not run in
Expo Go**. Build a development client once, then iterate with Metro:

```bash
yarn ios          # build and launch on the iOS simulator
yarn android      # build and launch on an Android emulator
yarn start        # afterwards: start Metro for the installed dev client
```

On first use of speech, the app downloads the Whisper and Kokoro model files,
so the first launch needs a network connection.

For a fast UI-only loop you can run `yarn web`. Speech hooks are no-ops on web,
so recording and previews will not work there.

### Environment

| Variable | Example | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | NestJS gateway base URL |

| Running on | Use |
|---|---|
| iOS simulator | `http://localhost:3000/api/v1` |
| Android emulator | `http://10.0.2.2:3000/api/v1` |
| Physical device | `http://<your-machine-LAN-IP>:3000/api/v1` |

`EXPO_PUBLIC_*` values are inlined at build time; restart Metro after changing
them.

---

## Scripts

| Command | What it does |
|---|---|
| `yarn start` | Start Metro |
| `yarn ios` / `yarn bi` | Build and run on iOS |
| `yarn android` / `yarn ba` | Build and run on Android |
| `yarn web` | Run the web build |
| `yarn pb` | `expo prebuild --clean`: regenerate both native projects |
| `yarn ri` | Clean iOS prebuild, then run without the build cache |
| `yarn ra` | Clean Android prebuild, then run without the build cache |
| `yarn lint` | Run ESLint through Expo |
| `npx tsc --noEmit` | Type-check the project |

`ios/` and `android/` are generated from `app.json` and are gitignored. Changes
to icons, splash, permissions or plugins need `yarn ri` / `yarn ra` (or
`yarn pb`) followed by a rebuild — a JavaScript reload is not enough. Clean
prebuild discards any manual edits inside the native folders.

---

## Project structure

```text
src/
├── app/                        expo-router routes (thin re-exports)
│   ├── _layout.tsx             fonts, providers, splash, root native stack
│   ├── (tabs)/                 main app — currently gated behind onboarding
│   ├── (onboarding)/           welcome, language, target-language,
│   │                           placement-test, speaking-sample,
│   │                           level-result, choose-voice
│   └── (auth)/                 login, signup, forgot-password, verify-email
├── screens/                    screen implementations used by the routes
│   ├── onboarding/
│   └── auth/
├── components/                 shared UI: Button, Icon, TextField, OtpInput,
│                               OnboardingScreen, OnboardingChoice,
│                               MotionReveal, ReminderTimePicker, …
├── hooks/                      theme, colour scheme, speech recognition,
│                               voice sample, streamed TTS playback
├── services/
│   ├── api.ts                  Axios instance — every backend call goes here
│   ├── placement-api.ts        placement prompt/submit boundary (mocked)
│   ├── mocks/                  mock fixtures, not validated assessment items
│   └── query-client.ts         TanStack Query client
├── store/index.ts              Zustand stores (language, theme, course,
│                               assessment)
├── constants/                  theme tokens, motion, levels, voices,
│                               learnable languages, onboarding steps
├── schemas/                    zod form schemas
├── i18n/                       i18next setup, language list, RTL, locales/
└── global.css
assets/images/                  Sprachbar brand mark, launcher, adaptive icons
docs/                           icons.md, motion.md
scripts/                        export-prototype-icon.cjs, reset-project.js
```

Platform-specific files use the `.web.tsx` / `.web.ts` suffix (for example
`use-speech-recognition.web.ts`).

The `@/*` path alias maps to `src/*`, and `@/assets/*` maps to `assets/*`.

---

## Architecture

```text
 ┌──────────── device ─────────────┐
 │ Microphone → Whisper (on-device)│
 │ Speaker  ← Kokoro  (on-device)  │        ┌─────────────────────┐
 │                                 │ HTTPS  │ NestJS gateway      │
 │ UI ─ Zustand ─ TanStack Query ──┼───────▶│ /api/v1             │
 │            services/api.ts      │        │ (LLM, profiles, …)  │
 └─────────────────────────────────┘        └─────────────────────┘
```

- **Only the NestJS gateway.** The app never calls the backend's internal
  Python services. All requests go through `src/services/api.ts`.
- **Routes stay thin.** Files in `src/app/` re-export components from
  `src/screens/`, which keeps navigation separate from screen logic.
- **Gating.** `(tabs)/_layout.tsx` redirects to onboarding. The check is
  hard-coded to `true` until onboarding and auth state are persisted.
- **State.** Each persisted Zustand store has its own AsyncStorage key:

  | Store | Holds |
  |---|---|
  | `useLanguageStore` | Interface/spoken language, RTL epoch |
  | `useThemeStore` | `system` / `light` / `dark` |
  | `useCourseStore` | Learning language |
  | `useAssessmentStore` | Self-rated, suggested and chosen level; daily minutes; reminder time; voice and speed |

  The root layout waits for store hydration and fonts before it renders.
- **Server boundary for assessment.** Placement prompts and scoring belong to
  the backend. `placement-api.ts` mimics that contract (issue a prompt ID, then
  submit against it) so the UI won't change when the real endpoint arrives.

---

## On-device speech

| Hook | Model / library | Notes |
|---|---|---|
| `useSpeechRecognition` | Whisper Tiny via ExecuTorch, mic via `react-native-audio-api` | Streams 16 kHz mono PCM; returns committed and in-progress text. Language currently fixed to `de` |
| `useVoiceSample` | Kokoro German via ExecuTorch | Speaks a sample sentence with voice `df_anna` at the selected speed |
| `useTtsBufferPlayer` | `react-native-audio-api` buffer queue | Plays streamed Float32 PCM chunks as they arrive; supports stop and interruption |

ExecuTorch features are enabled in `package.json` under
`"react-native-executorch": { "features": ["textToSpeech", "speechToText"] }`.
Microphone permission strings are declared in `app.json`
(`NSMicrophoneUsageDescription`, `RECORD_AUDIO`).

Only one real voice ships today. In `src/constants/voices.ts` the "Lena" persona
is marked available; the other personas are disabled placeholders. Model choices
and the bilingual voice strategy are still open. See
`ARCHITECTURE-AND-SPEECH-FINDINGS.md` in the parent workspace.

---

## Internationalisation and RTL

- Locale files: `src/i18n/locales/{en,de,fr,es,tr,ar}.json`.
- The initial language comes from the device locale and falls back to English.
- To add a language, add it to `SUPPORTED_LANGUAGES` in
  `src/i18n/languages.ts` and create a matching locale file.
- Switching between LTR and RTL calls `I18nManager.forceRTL` and increments
  `rtlEpoch`, which remounts the root stack so the new direction applies.
- Validation messages in `src/schemas/auth.ts` are i18n keys that screens
  translate.

---

## Design system

- **Tokens:** colours (light and dark), fonts, spacing and radii live in
  `src/constants/theme.ts`. Read them with `useTheme()`.
- **Typography:** Space Grotesk for display text, Manrope for body text, both
  loaded with `@expo-google-fonts`.
- **Icons:** use `<Icon name="…" />` (Lucide, type-checked names, RTL-aware).
  `AppIcon` renders the brand mark. See [docs/icons.md](docs/icons.md).
- **Motion:** shared timings in `src/constants/motion.ts`; `MotionReveal` for
  entrances. Everything respects Reduce Motion. See
  [docs/motion.md](docs/motion.md).
- **Brand assets:** in `assets/images/sprachbar-*`, exported from the prototype
  artwork by `scripts/export-prototype-icon.cjs`.

---

## Current status

| Area | State |
|---|---|
| Onboarding UI and navigation | Done |
| Preference persistence | Done (local only) |
| On-device STT for the speaking sample | Working in dev builds; German only |
| On-device TTS voice preview | One voice (`df_anna`) |
| Placement prompts and scoring | **Mocked**: the suggested level is the self-rating |
| Sign-up, login, verification | **UI only**: no backend calls yet |
| Reminder notifications | Time is stored; permission and scheduling are not implemented |
| Main app (tabs) | Placeholder, always redirects to onboarding |
| Automated tests | None yet |

Also known: the interface language and the spoken language share one setting,
and "Start as beginner" skips the level-result screen, where the daily goal and
reminder time are set.

---

## Building and releasing

EAS profiles are defined in `eas.json`:

| Profile | Purpose |
|---|---|
| `development` | Dev client, internal distribution |
| `preview` | Internal test builds |
| `production` | Store builds, auto-incremented build number |

```bash
npm install -g eas-cli
eas login
eas init                                         # once, links the project
eas build --profile development --platform ios
eas build --profile preview --platform android
eas build --profile production --platform all
eas submit --platform ios
eas submit --platform android
```

Bundle identifier and package: `com.languageapp.sprachbar`. Minimum targets:
iOS 17, Android API 26 (set through `expo-build-properties`).

---

## Conventions

- Yarn only; do not mix in npm or pnpm lockfiles.
- Read the versioned Expo docs at
  <https://docs.expo.dev/versions/v57.0.0/>, since SDK 57 APIs differ from
  older guides.
- New routes go in `src/app/`, screen components in `src/screens/`, shared
  components in `src/components/`, hooks in `src/hooks/`.
- All backend calls go through `src/services/api.ts`; keep mocks in
  `src/services/mocks/`.
- Use theme tokens, `Icon` and the shared motion constants instead of one-off
  values.
- Every user-facing string goes through i18n, in all six locale files.

---

## Troubleshooting

- **"Native module not found" / ExecuTorch errors:** you are in Expo Go or on
  a stale build. Rebuild the dev client with `yarn ios` / `yarn android`.
- **Icon, splash or permission changes don't appear:** run `yarn ri` / `yarn ra`
  to regenerate native projects, then reinstall.
- **Mic button stays disabled:** the Whisper model is still downloading, or
  microphone permission was denied. Check the status text below the button.
- **Can't reach the backend from a device:** use your machine's LAN IP in
  `EXPO_PUBLIC_API_URL` and restart Metro.
- **Layout direction is wrong after switching to Arabic:** the app should
  remount automatically; if it doesn't, fully restart the app.

---

## License

The project template is derived from Expo's starter, which is MIT-licensed (see
[LICENSE](LICENSE)). Application code and brand assets belong to the Sprachbar
project.
