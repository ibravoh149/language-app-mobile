# languageapp-mobile

React Native mobile app (Expo) for languageapp.

Communicates exclusively with the NestJS API (`languageapp-backend/apps/api`). Never talks directly to the Python LLM service.

---

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Expo Go](https://expo.dev/go) app on your phone, or an iOS/Android simulator
- `languageapp-backend` stack running locally

---

## Setup

### 1. Install dependencies

```bash
yarn install
```

### 2. Create your env file

```bash
cp .env.example .env
```

`.env` defaults point to the local NestJS API — no changes needed for local dev:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

For testing on a physical device, replace `localhost` with your machine's local IP:

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api/v1
```

### 3. Start the dev server

```bash
yarn start
```

Then:
- Press `i` to open in iOS simulator
- Press `a` to open in Android emulator
- Scan the QR code with Expo Go on your phone

---

## Project structure

```
languageapp-mobile/
├── src/
│   ├── screens/            # Screen components
│   ├── components/         # Shared UI components
│   ├── services/
│   │   └── api.ts          # Axios client — all API calls go through here
│   └── store/
│       └── index.ts        # Zustand global state
├── app.json                # Expo config (name, slug, platforms)
├── tsconfig.json
└── .env.example
```

---

## Useful commands

```bash
# Start dev server
yarn start

# Start for specific platform
yarn ios
yarn android

# Clear Expo cache (if you see stale module errors)
npx expo start --clear
```

---

## Pointing to production API

Update `EXPO_PUBLIC_API_URL` in `.env` to your deployed NestJS URL:

```bash
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

No code changes needed — the `src/services/api.ts` client reads this at build time.
