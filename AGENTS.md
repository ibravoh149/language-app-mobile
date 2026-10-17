# AGENTS.md — languageapp-mobile

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before
writing any code that uses an Expo API. SDK 57 differs from older guides.

## Workspace rules

This repo is part of the Sprachbar workspace. **The workspace rules in
`/Users/ibrahimiliyasu/Projects/languageapp/AGENTS.md` are binding**: worktrees,
branch names, merge lock, fast-forward merge to `main`, quality gates, and the
TRACKER work board. Read that file and `TRACKER.md` first.

## Repo specifics

- The app runs as a **development build on a physical phone**. Expo Go can't
  load the native modules (ExecuTorch, audio API).
- Screens must match the hi-fi prototype in
  `/Users/ibrahimiliyasu/Projects/languageapp/Language_design_files/app/*.jsx`.
- Backend calls go through `src/services/` and follow the contracts in
  `languageapp-backend/docs/api/`. Until an endpoint exists, use a mock adapter
  behind the same typed interface.
- Every user-facing string goes through i18n, in all six locales
  (`src/i18n/locales/`).
- Use theme tokens (`useTheme`), `Icon`, and the motion constants. No one-off
  colours or timings.
- **Native changes** (new native dependency, `app.json` plugins or permissions,
  icons, splash) need a rebuild on the phone (`yarn ri` / `yarn ra`). Say so in
  your merge note.

## Quality gate (run in your worktree before merging)

```bash
yarn install && npx tsc --noEmit
```

More detail: `CLAUDE.md` and `README.md`.
