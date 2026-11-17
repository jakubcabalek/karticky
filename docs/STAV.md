# Kartičky – stav práce (sdílená paměť agentů)

Agenti si nic nepamatují mezi sezeními. Tady je, kde se skončilo. Na začátku sezení: `git fetch origin`, přečíst `AGENTS.md`, tento soubor a `gh pr list`. Při první commitu zapsat svůj řádek do „Teď rozpracované“, na konci ho přesunout a upravit frontu.

## Teď rozpracované

| Agent | Větev | Co | Stav |
| --- | --- | --- | --- |
| Claude Code | `claude/swift-knihovna-core` | A1: modely a logika knihovny v KartickyCore | PR otevřený, čeká na revizi |
| Claude Code | `claude/swift-knihovna-app` | A2: ukládání, AppModel, skutečná Sbírka a Wishlist (staví na #13 a #12) | PR otevřený, čeká na revizi |

## Fronta (Swift, podle docs/swiftui-plan.md)

1. **Fáze 2** – knihovna offline, hledání s filtry, detail karty, Sbírka, Wishlist.
2. **Fáze 3** – šanony, import/export CSV.
3. Fáze 4–7 podle plánu.

## Pro Jakuba

- Self-hosted runner pro Swift testy u PR (`docs/lokalne.md`, bod 3) – volitelné.
- Ověřit, že aplikace Kartičky v App Store Connect patří týmu `NL96UW5HVB` (podepisování z Xcode).

## Hotovo

- 17. 11. 2026 – plán přepisu, kostra `swift/`, testovací data z TS (PR #8).
- 17. 11. 2026 – fáze 0 a 1 (`claude/swift-zaklad`): kostra jde přeložit beze změn; navigace s vlastní skleněnou lištou (4 záložky + kulaté Skenovat; systémová záložka s rolí hledání se na iOS 27 neoddělí), komponenty `CardImage` (cache v `Caches/cards/`), `FoilShine`, `ManaDots`, `PriceText`, `ColorIdentityGradient`, `CardSummary` + mock data, `formatPrice` v KartickyCore (6 případů z fixture), snapshoty obrazovek a komponent. Snapshoty obrazovek jdou jen s `drawHierarchyInKeyWindow: true` (jinak prázdné) a s tolerancí barvy kvůli sklu.
- 17. 11. 2026 – doladění (`claude/swift-dolazeni`): velký titulek Sbírky (hledání se ukáže stažením dolů), vybraná záložka na hustém materiálu, nová ikona bez fialové (`scripts/swift-icon.swift`).
