# Přepis Kartiček do SwiftUI

Stav: plán, schválený majitelem 17. 11. 2026 („Teď pojedeme jen appku na iPhone“).
Důvod: Fakturo ve Swiftu je vizuálně i v plynulosti o level jinde. Vzhled: nativní iOS, grafiku dělají obrázky karet (majitel 17. 11. 2026 zrušil koncept „každá obrazovka je karta“), viz `docs/swiftui-design.md`.

Swift píše agent s Xcode na Macu (Codex nebo Claude Code), Claude v cloudu navrhuje, převádí logiku do testovacích dat a reviduje každý PR. Stejný postup jako u Fakturo (`jakubcabalek/fakturo`, `docs/swiftui-plan.md`).

## 1. Cíl a hranice

- **Jen iPhone.** Žádný iPad, Android ani nové funkce na webu.
- **Web se zmrazí.** karticky-9w4.pages.dev zůstane s poslední Expo verzí, nic nového tam nepřibude. Cloudflare Pages se dál nasazuje kvůli serverovým funkcím v `functions/api/` (ceny z českých e-shopů), které volá i Swift aplikace.
- **Stejné bundle id `com.jakubcabalek.karticky`.** Swift verze je aktualizace dnešní aplikace v TestFlightu (buildy Expo skončily na 3, Swift začíná od 100). Verze 0.2.0.
- **Data se nemění.** Knihovna má stejný JSON jako `Library` v `cardData.ts` (sbírka, wishlist, balíčky, `deleted`, `pricesUpdatedAt`), stejná tabulka `library_data` v Supabase. Neznámá pole přežijí načtení a uložení.
- **Dokud Swift aplikace nenahradí Expo aplikaci v TestFlightu, je TypeScript zdroj pravdy pro logiku.** Změna v `cardData.ts` a spol. přegeneruje testovací data (bod 8) a Swift ji dožene. Pak se Expo kód smaže a zdrojem pravdy je `KartickyCore`.

## 2. Kde to v repozitáři žije

```
swift/
  project.yml                 # XcodeGen; Karticky.xcodeproj se generuje a necommituje
  Karticky/                   # aplikace (SwiftUI)
    KartickyApp.swift
    AppModel.swift            # @Observable: knihovna, ukládání, synchronizace
    Screens/                  # Sbírka (+ hledání), Detail karty, Skenování, Balíčky, Detail balíčku, Wishlist, Životy, Profil
    Services/                 # Scryfall, LocalStore, Cloud (Supabase), ShopPrices, Scanner (kamera + Vision)
    Resources/                # Assets.xcassets, Localizable.xcstrings, scan-index-v1.bin (stahuje se při buildu)
  KartickyUI/                 # komponenty: obrázek karty, lesk fólie, barvy many, panel života, rámeček skeneru (docs/swiftui-design.md)
  KartickyCore/               # Swift Package: čistá logika (port cardData.ts a spol.), jen Foundation
    Tests/KartickyCoreTests/Fixtures/cases.json   # generované z TypeScriptu
  KartickyTests/              # testy aplikace a snapshoty obrazovek (__Snapshots__)
```

- Ne do `ios/`: tu si generuje Expo.
- `Karticky.xcodeproj`, `swift/build/`, `.build/` a `swift/Config/Secrets.xcconfig` jsou v `.gitignore`.
- `KartickyCore` nesmí importovat SwiftUI, UIKit ani Supabase. Testuje se `swift test` a Claude ho reviduje bez Xcode.

## 3. Technická rozhodnutí

| Věc | Rozhodnutí | Proč |
| --- | --- | --- |
| Minimální iOS | 18.0; Liquid Glass (`glassEffect`, systémová lišta) za `if #available(iOS 26, *)` | Nativní vzhled jako Fakturo. |
| Architektura | `@Observable` `AppModel` s knihovnou; ViewModel pro každou obrazovku (`@Observable`, protokol, mock v `#if DEBUG` pro náhledy a snapshoty) | Jako Fakturo. |
| Závislosti | `supabase-swift`, `swift-snapshot-testing` (jen testy). Nic dalšího bez domluvy. | |
| Scryfall | `URLSession`, 100 ms mezi požadavky (actor), hlavičky `Accept: application/json` a `User-Agent: Karticky/<verze>` (Scryfall ho vyžaduje), `/cards/collection` po 75 | Stejná pravidla jako `scryfall.ts`. |
| Obrázky karet | `AsyncImage` s vlastní cache na disku (`Caches/cards/`), nikdy neořezávat řádek s autorem a copyrightem | Pravidla Scryfall a WotC. |
| Ceny z e-shopů | `GET https://karticky-9w4.pages.dev/api/shop-prices?name=…` | Funkce už běží, Swift nic neparsuje. |
| Skenování | `Services/Scanner`: `AVCaptureSession` + `VNDetectRectanglesRequest` + perspektivní srovnání + Vision OCR, převzaté z `modules/card-scanner/ios` (bez ExpoModulesCore). Rozpoznání: `cardHash`, `liveScan`, `scanIdentify` z `KartickyCore`. Index `scan-index-v1.bin` v balíčku aplikace. | Kód kamery už je Swift; logika rozpoznání je otestovaná na fixture. |
| Lokální data | `Application Support/karticky-library-v1.json`, rozehraná hra `karticky-life-game-v1.json`; zápis po každé změně (s krátkým zpožděním) | Stejné názvy jako klíče v AsyncStorage. |
| Účty | Supabase: Sign in with Apple nativně (`ASAuthorizationController` → `signInWithIdToken`), Google/Facebook přes `ASWebAuthenticationSession` (PKCE, `karticky://auth-callback`), e-mail + heslo. Bez účtu vše funguje lokálně. | Jako `cloud.ts`. Účty jsou volitelné; bez `Secrets.xcconfig` jsou vypnuté. |
| Haptika | `sensoryFeedback` u změny životů, přidání karty, rozpoznání karty | Část „plynulosti“. |

## 4. Data a kompatibilita

1. **Neznámá pole se nesmí ztratit.** Každý model (`CardPrinting`, `CardEntry`, `Deck`, `Library`) si při dekódování schová nepoznané klíče (`extra: [String: JSONValue]`) a při zápisu je vrátí.
2. **Dekódování nesmí spadnout.** Načtení vždy přes port `normalizeLibrary` se stejným výsledkem jako TS na fixture. Jedna divná karta nesmí zablokovat celou knihovnu.
3. **Chybějící pole zůstávají chybějící** (nezapisovat `null`, kde TS pole vynechává).
4. **Čas jako text ISO 8601** (`addedAt`, `updatedAt`, `pricesUpdatedAt`, hodnoty v `deleted`), ceny jako čísla v eurech/dolarech jako ze Scryfallu.
5. **Synchronizace jako `App.tsx`:** při přihlášení a návratu do aplikace načíst `library_data` (`data`, `revision`), spojit přes `mergeLibraries`, zapsat s `revision = expected + 1 where revision = expected`; konflikt = načíst, spojit, zkusit znovu (max. 3×). Změny odcházejí 1,5 s po posledním ťuknutí. Mazání přes `recordDeletions`.
6. **Přechod z Expo aplikace na tomtéž iPhonu:** při prvním spuštění jednou přečíst AsyncStorage (`Application Support/RCTAsyncLocalStorage_V1/manifest.json`, větší hodnoty v souborech pojmenovaných MD5 klíče) – klíče `karticky-library-v1` a `karticky-life-game-v1` – převést přes `normalizeLibrary` / `normalizeGame` a uložit. Ověřit na telefonu s Expo buildem 3 před prvním Swift buildem v TestFlightu.

## 5. Převod logiky do `KartickyCore`

| TypeScript | Swift | Poznámka |
| --- | --- | --- |
| `cardData.ts` | `Models.swift`, `Library.swift`, `Prices.swift`, `Merge.swift` | Všechno exportované; `formatPrice` vlastní implementací ověřenou na fixture (ne `FormatStyle`, ten dává jiné mezery). |
| `scryfall.ts` (`parseCard`, `parseCollectorLine`) | `Scryfall.swift` | Síť (`searchCards`, `fetchCollection` …) patří do `Services/Scryfall` v aplikaci. |
| `cardHash.ts` | `CardHash.swift` | Stejný hash bit po bitu (index se staví v Node). `Pixels` = šířka, výška, RGBA bajty. |
| `scanIdentify.ts`, `liveScan.ts` | `ScanIdentify.swift`, `LiveScan.swift` | Hledání na Scryfallu se předává jako `async` closure. |
| `deckText.ts`, `deckStats.ts` | `DeckText.swift`, `DeckStats.swift` | Texty česky stejně jako v TS. |
| `keywords.ts` | `Keywords.swift` | Celý slovník. |
| `lifeCounter.ts` | `LifeCounter.swift` | Náhoda (`rollDie`, `flipCoin`, `pickStartingPlayer`) bere generátor jako parametr. |
| `base64.ts` | nepřevádí se, `Data(base64Encoded:)` | Fixture ho pokrývají jen pro kontrolu. |
| `theme.ts`, `cardFrame.tsx`, `nav.tsx` | nepřevádí se | Swift má nativní vzhled, viz `docs/swiftui-design.md`. |

Pravidla: stejné názvy funkcí (camelCase), ať jde review dělat vedle sebe; „teď“ jako parametr, ne `Date()` uvnitř; porovnávání textů jako TS (ne `localizedCompare`).

## 6. Fáze

Každá fáze je jeden nebo víc PR do `main` (větve `codex/swift-<téma>` nebo `claude/swift-<téma>`). Další fáze začíná, až je předchozí sloučená.

0. **Kostra** – hotová v tomto PR: `project.yml`, `KartickyCore` s `JSONValue` a testem fixture, `KartickyUI/Theme.swift`, prázdná aplikace, skripty `swift-check.sh` a `testflight.sh`, workflow na Macu. Úkol pro Mac: `xcodegen generate`, build v simulátoru, opravit, co v kostře nejde přeložit (psáno bez Xcode).
1. **Navigace a komponenty** – `TabView` (Sbírka, Balíčky, Wishlist, Životy + tlačítko Skenovat), `CardImage`, `FoilShine`, `ManaDots`, `PriceText`, `ColorIdentityGradient`, barvy a akcent. Náhledy a snapshoty s mock daty, bez sítě.
2. **Knihovna offline** – modely a `normalizeLibrary`, `LocalStore`, `AppModel`, hledání ve Sbírce (Scryfall), Detail karty (obrázek, ceny Scryfall + e-shopy, „Co karta umí“), Sbírka, Wishlist (cílová cena, zlevnilo), denní obnova cen.
3. **Balíčky** – seznam, detail s commanderem, statistiky (křivka, typy, barvy), legalita, import a export textu, chybějící karty do wishlistu.
4. **Skenování** – živá kamera, rozpoznání (index + OCR + jazyky), volba cíle (sbírka / wishlist / balíček / jen ceny), foil, série karet za sebou.
5. **Životy** – celé počítadlo (panely v barvách many, otočená horní polovina, jed, commander damage, žetony, kostky, zpět), uložení hry, obrazovka nezhasíná (`isIdleTimerDisabled`).
6. **Účet a převod** – přihlášení, synchronizace, převzetí dat z Expo aplikace, Profil, porovnání s Expo aplikací obrazovku po obrazovce, první Swift build do TestFlightu.

Build do TestFlightu jde udělat po kterékoli fázi (`scripts/testflight.sh`), ale nahradí Expo aplikaci u testerů. Proto první Swift build až po fázi 2 a s převzetím dat (část fáze 6 se udělá dřív).

## 7. Co se nedělá (zatím)

iPad, Android, web, widgety, push upozornění na zlevnění (jen v aplikaci jako dnes), sdílení balíčků odkazem.

## 8. Jak ověřit, že Swift počítá stejně

1. **Testovací data z TypeScriptu.** `node scripts/swift-fixtures.cjs` spustí stávající testy (`tests/*.test.cjs`) a každé volání exportované funkce z převáděných modulů s čistými daty zapíše jako případ `{ module, function, args, result }` do `swift/KartickyCore/Tests/KartickyCoreTests/Fixtures/cases.json` (dnes 187 případů). „Teď“ je pevné (`now` v hlavičce), takže výchozí argumenty s časem jsou stabilní. Kódování hodnot, které JSON neumí (`undefined`, bajty, typová pole), je popsané v hlavičce skriptu.
2. **Swift test `portedFunctionsMatchTypeScript`** projde případy a pro každou funkci, která má záznam v `Fixtures.ports`, zavolá port a porovná výsledek jako JSON. Port funkce = řádek v `ports` + zelený test.
3. **Když se změní TS logika**, PR přegeneruje fixture. CI (`web.yml`) spouští `node scripts/swift-fixtures.cjs --check` a selže, když commitnuté fixture neodpovídají TS.
4. **Nový test v TS = nové případy pro Swift.** Kde Swift potřebuje víc pokrytí, přidá se test do `tests/`, ne ruční JSON.

## 9. Build, kontroly, TestFlight

- `scripts/swift-check.sh` (`--fast`, `--core`, `--record`): XcodeGen, SwiftLint, `swift test` v `KartickyCore`, testy aplikace na simulátoru „iPhone 18 Pro“. Krátký výstup, celé výpisy ve `swift/build/check/`.
- `scripts/testflight.sh [číslo]`: build z `origin/main` do App Store Connect, malý PR s novým číslem. Podepisuje tým `NL96UW5HVB` přihlášený v Xcode (ověřit při prvním buildu, že aplikace Kartičky v App Store Connect patří stejnému týmu).
- Workflow „Swift checks (Jakubův Mac)“ běží na self-hosted runneru u PR do `main`, když je proměnná `MAC_RUNNER=true` (návod v `docs/lokalne.md`).

## 10. Review

- Každý Swift PR reviduje druhý agent: porovnání s TS, kompatibilita dat (bod 4), fixture, texty, snapshoty.
- PR popis česky: co je hotové pro uživatele, jak to bylo vyzkoušeno (simulátor / telefon, iOS), výstup `scripts/swift-check.sh`.
- Snapshoty obrazovek v PR, když se mění vzhled.
