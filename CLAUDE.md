@AGENTS.md

# languageapp-mobile

React Native app for Sprachbar (Expo SDK 57, TypeScript, EAS), a speaking-first
German-learning app.

> **Workspace rules come first.** Read
> `/Users/ibrahimiliyasu/Projects/languageapp/AGENTS.md` and `TRACKER.md` there
> before changing anything.

## Stack

- **Framework:** Expo SDK 57, React Native 0.86 (New Architecture), expo-router (file-based, typed routes), React Compiler on
- **Language:** TypeScript strict (TypeScript 6, React 19)
- **State:** Zustand with AsyncStorage persistence (`src/store/`)
- **Server state:** TanStack Query (`src/services/query-client.ts`)
- **API client:** Axios (`src/services/api.ts`)
- **Speech:** `react-native-executorch` (Whisper STT) + `react-native-sherpa-onnx` (Piper TTS) + `react-native-audio-api`
- **Forms:** react-hook-form + zod; **i18n:** i18next (en, de, fr, es, tr, ar; RTL for Arabic)
- **Package manager:** yarn · **Builds:** EAS

## Key architecture decisions

- The app talks **only to the NestJS gateway** (`languageapp-backend/apps/api`,
  `/api/v1`). Never call the Python services directly.
- **Speech runs on the device** (Whisper for the learner, Piper voices via
  sherpa-onnx for German playback, downloaded per voice on first use, D21). Explanations in the learner's language are text, not speech.
- Routes in `src/app/` are thin re-exports of components in `src/screens/`.

## Project structure

```text
src/
├── app/                 routes: _layout.tsx (root stack), (tabs)/, (onboarding)/, (auth)/
├── screens/             screen components (onboarding/, auth/, …)
├── components/          shared UI: Button, Icon, TextField, OtpInput, OnboardingScreen, …
├── hooks/               use-theme, use-speech-recognition, use-voice-sample, use-tts-buffer-player, …
├── services/            api.ts (axios + auth/refresh), auth-api.ts, placement-api.ts, social-auth.ts, token-storage.ts, haptics.ts, mocks/
├── store/               index.ts (language, theme, course, assessment), session.ts, profile.ts
├── constants/           theme, motion, levels, voices, learnable-languages, onboarding
├── schemas/             zod schemas
└── i18n/                setup, languages, rtl, locales/
docs/                    icons.md, motion.md
```

Path aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`.

## Routing

- `(tabs)/_layout.tsx` gates on the session (`src/store/session.ts`, restored
  on launch via `GET /me`): signed out → `/(onboarding)/welcome` on a fresh
  device, or `/(auth)/login` once anyone has had an account here
  (`hasHadAccount`, reset by account deletion); unverified →
  `/(auth)/verify-email`; no profile → `/(onboarding)/language`; else tabs.
- Onboarding: welcome → language → target-language → placement-test →
  speaking-sample → level-result → choose-voice → `/(auth)/signup` →
  `/(auth)/verify-email`. A signed-in learner finishing onboarding saves the
  profile with `PATCH /me/profile` instead of signing up.
- Forgot password → `/(auth)/reset-password` (6-digit code + new password).
- `/legal` (Terms / Privacy / Imprint placeholders, linked from signup) and
  `/delete-account` (password or emailed code, `DELETE /me`; linked from home).
- Signup and social sign-in send the onboarding profile only if onboarding was
  done on this device (`onboardingPayload()`); otherwise the account goes through
  onboarding after verifying.
- `EXPO_PUBLIC_API_MOCK=1` swaps in the in-memory auth and placement mocks (codes are `123456`).
- Google / Apple sign-in (`src/services/social-auth.ts`, buttons on login) are
  **off until configured**: `app.config.ts` adds the Google plugin only when
  `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is set, and the Apple capability only when
  `EXPO_PUBLIC_APPLE_SIGN_IN=1` (needs a paid Apple Developer team). Buttons
  without a configured provider are hidden. Changing these needs a rebuild.

## Running on the phone

```bash
yarn install
cp .env.example .env        # EXPO_PUBLIC_API_URL=auto: the API host follows Metro's
yarn ios                    # or: yarn android — builds and installs the dev client
yarn start                  # afterwards, for JS-only changes
```

- With `EXPO_PUBLIC_API_URL=auto` (development only) the app reaches the API at
  `http://<Metro host>:3000/api/v1`, so a new Wi-Fi IP on the Mac needs no .env
  change. An explicit URL wins; release builds always use the explicit value.
  `localhost` doesn't work from the phone.
- Clean native rebuild: `yarn ri` (iOS) / `yarn ra` (Android). Needed after
  native dependency, plugin, permission or icon changes.
- From a worktree, run Metro on another port: `yarn start --port 8082`.

## Conventions

- **Git:** work in a worktree on a branch and merge to `main` per the workspace
  `AGENTS.md`. Never edit or commit in the main checkout.
- All API calls go through `src/services/`; follow the contracts in
  `languageapp-backend/docs/api/`.
- New routes go in `src/app/`, screen components in `src/screens/`, shared
  components in `src/components/`, hooks in `src/hooks/`.
- Every user-facing string goes through i18n in all six locale files.
- Quality gate: `npx tsc --noEmit`.

## Repos

- Mobile: `git@github.com:ibravoh149/language-app-mobile.git`
- Backend: `git@github.com:ibravoh149/language-app-server.git`
