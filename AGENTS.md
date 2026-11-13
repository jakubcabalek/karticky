This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## How the code is laid out

- `index.ts` → `App.tsx` (screens). Pure logic lives in root modules with no React and no storage (`cardData.ts`, `scryfall.ts`), so `node --test` can test it through `tests/load.cjs`. Every new piece of logic gets a test there.
- `appVersion.ts` decides test vs. public version (baked in at build time, `EXPO_PUBLIC_APP_CHANNEL`). The test version keeps its data under a separate storage key.
- `devFeatures.ts` holds feature switches for later (empty while there is one version).
- Scanning: `cardHash.ts` (artwork hash + index format, shared with `scripts/scan-index/build.mjs`), `scanIdentify.ts` (collector line → artwork → language), `ScanScreen.tsx` (UI, web camera), `modules/card-scanner` (iPhone: VisionKit document camera + Vision OCR in all languages). The index `scan-index-v1.bin` is built weekly by the "Scan index" workflow into the release `scan-index`; the web build copies it into the site. Changing the hash means bumping the file name (v2) and rebuilding without the previous index.
- Accounts: `cloud.ts` (Supabase client, Google/Facebook/e-mail sign-in, one `library_data` row per user with a revision), `Account.tsx` (Profile), sync in `App.tsx` (pull + merge on sign-in and when the app comes back, push 1.5 s after a change; `mergeLibraries`/`recordDeletions` in `cardData.ts`). Accounts are optional; without Supabase settings they are off.
- `lifeCounter.ts` + `LifeScreen.tsx`: life counter (players, life, poison, commander damage, counters, dice), the running game is saved on the device.
- `keywords.ts`: Czech explanations of keyword abilities and common rules terms ("Co karta umí", `CardExplain.tsx`). Add an entry when a new set brings a new keyword.
- `functions/api/` is for Cloudflare Pages Functions (server code for things the browser cannot call directly, e.g. Czech e-shops without CORS).

## Card data (Scryfall)

- Card search, images and daily prices come from the Scryfall API. Keep 50–100 ms between requests (`scryfall.ts` paces them), never poll: prices change once a day.
- Show "Data o kartách: Scryfall" where card data is shown. Card images are Wizards of the Coast's; do not alter or crop away the artist/copyright line.
- Prices from Czech e-shops (Najada, Černý rytíř, Blacklotus …) must go through a function in `functions/api/`, cached, with a polite rate. Check each shop's terms before scraping; prefer a feed or API when one exists.

## Kartičky release tracking

- **For now there is one version.** The owner is not sharing the app yet, so every change goes straight to `main` (via a pull request with green CI) and is deployed to karticky.pages.dev. No feature switches, no separate test release. `dev` is kept equal to `main`.
- When the owner starts sharing the app, switch to the Fakturo way: new features to `dev` (dev.karticky.pages.dev) behind switches in `devFeatures.ts`, released to `main` only when the owner says so. Until then `developmentFeatures` stays empty.
- After every deploy (web or an iPhone build), update the owner's status page "Kartičky – kde co běží" (claude.ai artifact 8gEqQT18Jz9rGXyZRV3Yyr): what changed, where it is now, and the date.

## Two agents on one repository (Claude and Codex)

Claude (in the cloud) and Codex (on the owner's Mac) both work on Kartičky. GitHub is the only source of truth; nobody's local copy is.

- **Start from fresh `origin/main`** (while there is one version, see above). Before any change or review run `git fetch origin` and branch from it: `claude/<topic>` or `codex/<topic>`. Never build changes on an old checkout.
- **Name the commit.** A review or a test report starts with the commit hash it was done on (`git rev-parse --short HEAD`), and checks first that it is the current `origin/main`.
- **Everything goes through a pull request into `main`** (later `dev`), with CI green before merging. Leave no uncommitted changes in `~/karticky`: the other agent cannot see them and they block the owner's `git pull`. If you cannot push, commit to a local branch and tell the owner its name.
- Never push to `main` directly; always a pull request.
- **One agent per area at a time.** Before starting, check open pull requests (`gh pr list`); if the other agent has one touching the same files, wait or build on top of it.
- **The PR description says what changed for the user**, in Czech. Claude keeps the status page up to date from it; Codex does not need to.
- **`~/karticky` on the Mac is for builds.** It stays on `main`, clean, and is refreshed before every build with `git checkout -- package.json package-lock.json && git pull`.
