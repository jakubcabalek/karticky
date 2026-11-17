This repository holds the Expo/React Native app (today's TestFlight build, frozen web) and its replacement, a SwiftUI iPhone app in `swift/` (see "SwiftUI app" below). New features go to the Swift app; the Expo app only gets fixes until Swift replaces it.

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
- Look of the Expo app (not carried over to Swift): every screen is an MTG card. `theme.ts` (frame colours per section, mana pips, parchment/brass, fonts), `cardFrame.tsx` (`CardFrame`: name bar + cost, art window, type line + set symbol, parchment text box, P/T box for the screen's numbers, collector line; `MiniCard`, `ManaCost`). Section colours: Skenovat/Hledat blue, Sbírka colourless, Balíčky gold (or the commander's colours), Wishlist green, Životy red, Profil white. No purple.
- Navigation: `nav.tsx` — "Tvoje ruka": the button in each card's name bar (via `MenuContext`) opens a hand of mini cards, one per section.
- Scanning: `liveScan.ts` (live camera: a card is read when recognised in consecutive frames), `cardHash.ts` (artwork hash + index format, shared with `scripts/scan-index/build.mjs`), `scanIdentify.ts` (collector line → artwork → language), `ScanScreen.tsx` (UI, web camera), `modules/card-scanner` (iPhone: live camera view `CardLiveScannerView` with rectangle detection, plus the VisionKit document camera for a stack; Vision OCR in all languages). The index `scan-index-v1.bin` is built weekly by the "Scan index" workflow into the release `scan-index`; the web build copies it into the site. Changing the hash means bumping the file name (v2) and rebuilding without the previous index.
- Accounts: `cloud.ts` (Supabase client, Apple/Google/Facebook/e-mail sign-in, one `library_data` row per user with a revision), `Account.tsx` (Profile), sync in `App.tsx` (pull + merge on sign-in and when the app comes back, push 1.5 s after a change; `mergeLibraries`/`recordDeletions` in `cardData.ts`). Accounts are optional; without Supabase settings they are off.
- Decks: `DecksScreen.tsx` (formats, Commander zone, stats, legality, import/export), `deckText.ts` (decklist text in/out), `deckStats.ts` (curve, types, colours, format rules in Czech). Default format is Commander (the owner's format).
- Wishlist price watch: `WishlistScreen.tsx`, `priceAlerts`/`refreshCards` in `cardData.ts`; the whole library is refreshed from Scryfall's collection endpoint at most once a day. Alerts are in the app only (no push yet).
- `lifeCounter.ts` + `LifeScreen.tsx`: life counter (players, life, poison, commander damage, counters, dice), the running game is saved on the device.
- `keywords.ts`: Czech explanations of keyword abilities and common rules terms ("Co karta umí", `CardExplain.tsx`). Add an entry when a new set brings a new keyword.
- `functions/api/` is for Cloudflare Pages Functions (server code for things the browser cannot call directly, e.g. Czech e-shops without CORS).

## Card data (Scryfall)

- Card search, images and daily prices come from the Scryfall API. Keep 50–100 ms between requests (`scryfall.ts` paces them), never poll: prices change once a day.
- Show "Data o kartách: Scryfall" where card data is shown. Card images are Wizards of the Coast's; do not alter or crop away the artist/copyright line.
- Prices from Czech e-shops (Najada, Černý rytíř, Blacklotus …) must go through a function in `functions/api/`, cached, with a polite rate. Check each shop's terms before scraping; prefer a feed or API when one exists.

## Kartičky release tracking

- **For now there is one version.** The owner is not sharing the app yet, so every change goes straight to `main` (via a pull request with green CI). No feature switches, no separate test release. `dev` is kept equal to `main`.
- **iPhone only (owner, 17. 11. 2026).** The web at karticky-9w4.pages.dev is frozen: no new features there. Cloudflare Pages keeps deploying because the Swift app calls `functions/api/` (shop prices).
- When the owner starts sharing the app, switch to the Fakturo way: new features to `dev` (dev.karticky-9w4.pages.dev) behind switches in `devFeatures.ts`, released to `main` only when the owner says so. Until then `developmentFeatures` stays empty.
- After every deploy (web or an iPhone build), update the owner's status page "Kartičky – kde co běží" (claude.ai artifact 8gEqQT18Jz9rGXyZRV3Yyr): what changed, where it is now, and the date.

## Agents on one repository (Claude Code, Codex, Claude in the cloud)

Three agents take turns on Kartičky, often because another one hit its usage limit: **Claude Code** and **Codex** on the owner's Mac (both can build and test the Swift app), and **Claude in the cloud** (no Xcode: plans, TypeScript, fixtures, reviews). Chats remember nothing between sessions. GitHub and `docs/STAV.md` are the only shared memory.

**Start of every session** (the owner usually just writes „pokračuj“)
1. `git fetch origin`, read this file and `docs/STAV.md`, run `gh pr list`.
2. Do **your own line** in `docs/STAV.md` („Linka Claude Code“ or „Linka Codex“) from the top: skip what is done or waiting. A PR from the other agent waiting for review comes first. If „Teď rozpracované“ names your unfinished branch, continue it.
3. Branch from fresh `origin/main`: `claude/<topic>` or `codex/<topic>`. Never build on an old checkout. Stay inside the files your line owns (`docs/STAV.md`, top).

**While working (a limit can end the session at any moment)**
- Commit and push after every working step (tests green), not at the end. Unpushed work is lost to the next agent.
- Open the pull request early as a draft and keep its description current: what is done, what is left, how it was tested.
- At the first commit, write your row into „Teď rozpracované“ in `docs/STAV.md` (agent, branch, what, state) in the same branch.

**End of every session (or when the limit is near)**
- Push, update `docs/STAV.md` (move the row to „Hotovo naposledy“, adjust your line, note decisions needed from Jakub) in the pull request, and leave the PR description saying exactly where to continue.

**Pull requests and review**
- Everything goes through a pull request into `main` with CI green. A review or test report names the commit it was done on (`git rev-parse --short HEAD`).
- The author does not review their own PR: the other agent does (Claude Code ↔ Codex, or Claude in the cloud). The reviewer merges (squash) when it is right. A small fix (under ~100 changed lines, tests green) may be merged by its author when no other agent is available that day.
- The PR description says what changed for the user, in Czech, with `scripts/swift-check.sh` output and, for UI, screenshots.
- Never push to `main` directly.

**Folders on the Mac**
- `~/karticky` stays on `main`, clean, for builds (`scripts/testflight.sh`).
- Each agent works in its own worktree: Claude Code in `~/karticky-claude`, Codex in `~/karticky-codex`. Never leave uncommitted changes in a folder another agent uses.
- Never read, print or commit passwords, secret keys or Keychain items; the owner types those himself.

## SwiftUI app (`swift/`)

The iPhone app is being rewritten in SwiftUI, the same way as Fakturo. Plan: `docs/swiftui-plan.md`, look: `docs/swiftui-design.md` (both in Czech). Read them before touching `swift/`.

- **Swift is written by an agent with Xcode** (Codex or Claude Code on the Mac) and reviewed by another one. Claude in the cloud has no Xcode: it plans, keeps the fixtures, ports logic only into `KartickyCore` (checked by the Mac run) and reviews.
- **The data format does not change.** Same `Library` JSON as `cardData.ts`, same `library_data` table; unknown fields survive a round trip.
- **TypeScript stays the source of truth for logic** until the Swift app replaces the Expo one. A change to a ported module regenerates the fixtures (`node scripts/swift-fixtures.cjs`) in the same pull request; CI checks it (`--check`).
- **`KartickyCore` is Foundation only**, tested with `swift test`; every ported function gets a line in `Fixtures.ports` so the TypeScript cases run against it.
- **Native iOS look** (owner, 17. 11. 2026): system navigation, tab bar, lists and sheets; card images are the graphics. The Expo "every screen is a card" look is not carried over. Reuse `KartickyUI` (`CardImage`, `FoilShine`, `ManaDots`, …); light and dark appearance; Dynamic Type through accessibility3.
- **User-facing copy in `Localizable.xcstrings`** (Czech).
- **Check Swift with `scripts/swift-check.sh`** (`--fast` while working, full before a PR, `--record` for snapshots). Do not read whole logs unless the script output is not enough.
- **TestFlight builds go through `scripts/testflight.sh`** (the owner can run it himself, see `docs/lokalne.md`). Swift build numbers start at 100. The first Swift build replaces the Expo app for testers, so it waits until the library, scanning basics and the data takeover from the Expo app work (plan, section 6).
