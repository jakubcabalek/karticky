# Stav práce a fronta úkolů

Tohle je **jediné místo, kde se předává práce** mezi agenty (Claude Code na Macu, Codex na Macu, Claude v cloudu) a Jakubem. Chaty si nic nepamatují, tenhle soubor ano. Kdo začíná, čte ho první; kdo končí, aktualizuje ho ve svém PR. Pravidla jsou v `AGENTS.md`, sekce „Agents on one repository“.

Aktualizováno: 17. 11. 2026 v 15:40 (Claude v cloudu)

## Jak to teď funguje: dvě linky

Jakub napíše „pokračuj“ v Claude Code i v Codexu najednou. **Každý agent dělá jen svou linku** shora dolů a přeskočí, co je hotové nebo na co se čeká. Linky jsou rozdělené tak, aby si agenti nesahali do stejných souborů:

- **Claude Code = knihovna** (fáze 2 a 3 plánu): modely a ukládání, Scryfall, Sbírka, Wishlist, hledání, detail karty, šanony, import/export. Vlastní `KartickyCore/Sources/KartickyCore/Library/`, `Karticky/Services/` (kromě `Scanner/`), `Karticky/Screens/` Collection, Wishlist, Search, CardDetail, `Karticky/AppModel.swift`.
- **Codex = hra a skener** (fáze 6, 5 a 4 plánu): Životy, klíčová slova, rozpoznání karet, kamera, pak balíčky. Vlastní `KartickyCore/Sources/KartickyCore/Play/` a `Scan/`, `Karticky/Services/Scanner/`, `Karticky/Screens/` Life, Scan, Decks.
- **Společné soubory** (`project.yml`, `RootView.swift`, `Localizable.xcstrings`, `docs/STAV.md`): měnit jen to nutné. Při konfliktu platí verze v `main` a přidá se k ní vlastní změna.
- **Testy z fixture:** každá linka registruje porty ve vlastním souboru (`LibraryPorts.swift` / `PlayPorts.swift` v `KartickyCoreTests`), `Fixtures.ports` je jen spojí. Úkol A1 a B1 to zavede, kdo bude první; druhý se přidá.

**Revize vždy dělá ten druhý.** Když v jedné lince čeká PR na revizi, druhý agent ho zkontroluje a sloučí, jakmile dokončí rozdělaný krok, a teprve pak pokračuje ve své lince. Claude v cloudu reviduje taky (čte Swift, ale nepřeloží ho).

Velikost PR: jeden úkol = jeden PR, kolem 300–800 řádků bez snapshotů. Větší úkol rozdělit.

## Teď rozpracované

| Kdo | Větev / PR | Co | Stav |
| --- | --- | --- | --- |
| Jakub | – | Vyzkoušet build 0.2.0 (101) na iPhonu (J1) | čeká |

## Linka Claude Code (knihovna)

0. **Sloučit #10** (číslo buildu 101 v `swift/project.yml`, nic víc).
1. **A1: modely a logika knihovny v `KartickyCore/Library/`.** Port `cardData.ts`: typy `CardPrinting`, `CardEntry`, `Deck`, `Library` (neznámá pole přežijí, `docs/swiftui-plan.md` bod 4), `normalizeLibrary`, `entryKey`, `addCard`/`setQuantity`/`removeEntry` (jak se jmenují v TS), `totalCards`, `listValue`, `entryPrice`, `priceAlerts`, `mergeLibraries`, `recordDeletions` a vše, co tyhle funkce volají. Plus `parseCard` a `parseCollectorLine` ze `scryfall.ts`. Každá funkce s případy v `cases.json` má port v `LibraryPorts.swift` a test zelený. Jen `KartickyCore`, žádné obrazovky.
2. **A2: ukládání a skutečná Sbírka a Wishlist.** `LocalStore` (`Application Support/karticky-library-v1.json`, zápis se zpožděním, atomicky), `AppModel` (`@Observable`), Sbírka a Wishlist na skutečných datech: počet, hodnota, změna počtu (stepper, swipe smazat), prázdný stav („Zatím žádné karty – naskenuj nebo vyhledej první“). `Sample` zpět jen do `#if DEBUG` (náhledy a snapshoty). Data z Expo aplikace zatím nečíst ani nemazat.
3. **A3: Scryfall a hledání.** `Services/Scryfall` (actor, 100 ms mezi požadavky, `User-Agent: Karticky/<verze>`, `Accept: application/json`), `.searchable` ve Sbírce: nejdřív výsledky ze sbírky, pod nimi Scryfall (`/cards/search`, jména i v jiných jazycích jako `scryfall.ts`). Filtry jako kapsle: barvy, typ, edice, foil, cena; řazení. Denní obnova cen přes `/cards/collection` po 75 (`refreshCards`).
4. **A4: detail karty.** Z mřížky (zoom přechod) i z hledání: velký `CardImage` s `FoilShine`, natočení prstem, výběr edice/printingu, tlačítka Do sbírky / Wishlist (balíček až po B5), „Máš 2×…“, ceny Scryfall (EUR/USD, foil) a e-shopy (`https://karticky-9w4.pages.dev/api/shop-prices?name=…`), přepočet na Kč (kurz ČNB jednou denně, uložit), rulings ze Scryfallu, „Data o kartách: Scryfall“. „Co karta umí“ až po sloučení B2 (Codex).
5. **A5: první build se skutečnými daty.** `scripts/testflight.sh` (build 102) a do „Hotovo naposledy“ napsat Jakubovi, co zkusit.
6. **A6: šanony** (`docs/swiftui-plan.md` fáze 3): volitelné pole `binder` u `CardEntry` (popsat v plánu), seznam šanonů ve Sbírce, přesun karet, hodnota po šanonech.
7. **A7: import a export CSV** (ManaBox, Moxfield, Dragon Shield, Delver Lens, Archidekt; náhled před zápisem; ukázkové soubory jako testovací data v `KartickyCoreTests`). Export: stejné formáty + záloha celé knihovny jako JSON přes `ShareLink`.

## Linka Codex (hra a skener)

1. **B1: Životy celé** (fáze 6). Port `lifeCounter.ts` do `KartickyCore/Play/` s porty v `PlayPorts.swift` (náhoda jako parametr). Obrazovka podle `docs/swiftui-design.md`: 2–6 hráčů, panely v barvách many, horní řada otočená, ťuk −1/+1, podržení ±10, bublina „−3“, `contentTransition(.numericText())`, haptika, jed, commander damage, žetony, kostky a mince, zpět, nová hra, uložení rozehrané hry (`karticky-life-game-v1.json`), obrazovka nezhasíná. Snapshoty 2/4/6 hráčů.
2. **B2: „Co karta umí“.** Port `keywords.ts` do `KartickyCore/Play/Keywords.swift` (celý slovník, stejné texty) + komponenta `KeywordExplanations` v `KartickyUI`, kterou pak použije detail karty (A4).
3. **B3: rozpoznání karet v `KartickyCore/Scan/`.** Port `cardHash.ts` (bit po bitu stejný hash; ověřit na fixture i na pár skutečných obrázcích proti indexu), `liveScan.ts`, `scanIdentify.ts` (hledání na Scryfallu jako `async` closure). Čtení `scan-index-v1.bin` z balíčku aplikace.
4. **B4: skenování** (fáze 5). `Services/Scanner`: kamera, obdélník karty, srovnání perspektivy a OCR převzaté z `modules/card-scanner/ios` (bez ExpoModulesCore). Obrazovka podle náhledu: rohy rámečku, „Ukládat do: Sbírka ▾“, skleněný panel s poslední kartou, Foil / Jiná edice / Vrátit, seznam dávky se součtem hodnoty, zamčení edice, dávka přežije zavření. Ukládání do knihovny přes `AppModel` až po sloučení A2.
5. **B5: balíčky** (fáze 4, až po sloučení A1): port `deckText.ts`, `deckStats.ts` do `KartickyCore/Play/`, seznam balíčků, detail s hlavičkou v barvách commandera, dlaždice, křivka many (Swift Charts), seznam po typech, legalita česky, import/export textu, chybějící do wishlistu, zkušební ruka (7 karet, mulligan, líznutí).

## Body pro Jakuba

- **J1. Vyzkoušet build 0.2.0 (101) z TestFlightu.** Ukázková data, žádná síť. Jde o vzhled a plynulost: lišta, tlačítko Skenovat, lesk fólie při naklonění telefonu, světlý/tmavý režim. Co se nelíbí, napiš kterémukoli agentovi; zapíše to sem.
- **J2. Codex na Macu:** jednou `git -C ~/karticky worktree add ~/karticky-codex origin/main`, pak Codex otevřít v `~/karticky-codex`. Claude Code pracuje v `~/karticky-claude`.
- **J3. Volitelné:** self-hosted runner pro Swift testy u PR (`docs/lokalne.md`, bod 3).

## Společná fronta (až budou obě linky prázdné)

- **Fáze 7:** převzetí dat z Expo aplikace (AsyncStorage), účet a synchronizace (Supabase), Profil.
- **Po prvním buildu se skutečnými daty** (plán, fáze 8): doporučení z EDHREC, nástroj na výměnu, vývoj hodnoty sbírky + widget, stav karty a jazyk u kusu, sdílení balíčku odkazem.

## Čeká na rozhodnutí Jakuba

- Zatím nic.

## Hotovo naposledy

- 17. 11.: **Build 0.2.0 (101) nahraný do App Store Connect** (`scripts/testflight.sh`, commit `701f360`): první Swift verze s ukázkovými daty. PR s číslem buildu #10.
- 17. 11.: fáze 0 a 1 (#9): kostra jde přeložit beze změn; navigace s vlastní skleněnou lištou (4 záložky + kulaté Skenovat; systémová záložka s rolí hledání se na iOS 27 neoddělí), komponenty `CardImage` (cache v `Caches/cards/`), `FoilShine`, `ManaDots`, `PriceText`, `ColorIdentityGradient`, `CardSummary` + mock data, `formatPrice` v KartickyCore (6 případů z fixture), snapshoty. Snapshoty obrazovek jdou jen s `drawHierarchyInKeyWindow: true` (jinak prázdné) a s tolerancí barvy kvůli sklu.
- 17. 11.: plán přepisu, kostra `swift/`, testovací data z TS (#8).
