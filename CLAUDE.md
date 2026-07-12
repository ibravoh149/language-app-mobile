@AGENTS.md

# languageapp-mobile

React Native mobile app (Expo SDK 57, TypeScript, EAS) for a language learning app.

## Stack

- **Framework:** Expo SDK 57 + expo-router (file-based routing)
- **Language:** TypeScript strict mode (TypeScript 6, React 19)
- **State:** Zustand (`src/store/`)
- **API client:** Axios (`src/services/api.ts`)
- **Package manager:** yarn
- **Builds:** EAS (Expo Application Services)

## Key architecture decision

The mobile app talks **only to the NestJS API** (`languageapp-backend/apps/api` on port `3000`). Never calls the Python LLM or audio services directly.

## Project structure

```
languageapp-mobile/
├── src/                        # all source code — @/* alias maps here
│   ├── app/                    # expo-router file-based routes
│   │   ├── _layout.tsx         # root layout (theme, splash, tabs)
│   │   ├── index.tsx           # home tab screen
│   │   └── explore.tsx         # explore tab screen
│   ├── components/             # shared UI components (from Expo template)
│   │   ├── ui/                 # low-level primitives
│   │   └── ...
│   ├── constants/
│   │   └── theme.ts            # spacing, colors, layout constants
│   ├── hooks/
│   │   ├── use-color-scheme.ts
│   │   └── use-theme.ts
│   ├── screens/                # screen-level components imported by app/ routes
│   ├── services/
│   │   └── api.ts              # axios client — all API calls go here
│   ├── store/
│   │   └── index.ts            # zustand global state
│   └── global.css              # global CSS (web + NativeWind)
├── assets/
│   ├── expo.icon/              # iOS app icon (Expo format)
│   └── images/                 # icon.png, adaptive icons, splash, etc.
├── scripts/
│   └── reset-project.js        # wipes src/app back to blank (run once to clean up demo)
├── app.json                    # Expo + EAS config
├── eas.json                    # EAS build profiles
├── tsconfig.json
├── AGENTS.md                   # Expo SDK version reminder
└── .env.example
```

## Path alias

`@/*` maps to `src/`. Examples:
- `@/services/api` → `src/services/api.ts`
- `@/store` → `src/store/index.ts`
- `@/hooks/use-color-scheme` → `src/hooks/use-color-scheme.ts`
- `@/assets/images/icon.png` → `assets/images/icon.png` (separate alias)

## Routing

expo-router uses file-based routing. Files in `src/app/` become routes:

- `src/app/index.tsx` → home tab
- `src/app/explore.tsx` → explore tab
- `src/app/lesson/[id].tsx` → `/lesson/:id`
- `src/app/(auth)/_layout.tsx` → auth stack group

Keep reusable screen components in `src/screens/` and import them into `src/app/` route files.

## Dev setup

```bash
yarn install
cp .env.example .env
yarn start          # opens Expo dev tools
```

- Press `i` for iOS simulator, `a` for Android emulator
- Scan QR code with Expo Go for physical device

For physical device, set machine IP in `.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api/v1
```

To reset the demo boilerplate and get a blank slate:
```bash
yarn reset-project
```

## EAS builds

```bash
# Install EAS CLI (one-time)
npm install -g eas-cli

# Log in and link project (one-time)
eas login
eas init

# Build profiles (defined in eas.json)
eas build --profile development --platform ios
eas build --profile preview --platform android
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Before first EAS build

1. Run `eas init` to link to your Expo account and get a `projectId` in `app.json`
2. Replace `com.yourcompany.languageapp` in `app.json` with your real bundle identifier
3. Add real app icons to `assets/images/` (icon.png 1024×1024, adaptive-icon.png 1024×1024)

## Conventions

- **No auto-commits.** Always wait for explicit instruction before committing.
- **Package manager:** yarn
- All API calls must go through `src/services/api.ts`.
- New routes go in `src/app/`, reusable screen components go in `src/screens/`.
- Components in `src/components/`, hooks in `src/hooks/`.

## Backend API base URL

| Environment | `EXPO_PUBLIC_API_URL` |
|---|---|
| Local dev (simulator) | `http://localhost:3000/api/v1` |
| Local dev (device) | `http://<machine-ip>:3000/api/v1` |
| Production | `https://api.yourdomain.com/api/v1` |

## Key backend endpoints

- `GET  /health`
- `POST /llm/generate` — full LLM response (JSON)
- `POST /llm/stream` — streaming LLM response (SSE)
- `POST /stt/transcribe` — speech to text (multipart/form-data, optional `word_timestamps`)
- `POST /tts/synthesize` — text to speech (returns WAV stream, pass `language` for routing)
- `GET  /tts/voices` — list available TTS voices

## Repos

- Mobile: `git@github.com:ibravoh149/language-app-mobile.git`
- Backend: `git@github.com:ibravoh149/language-app-server.git`
