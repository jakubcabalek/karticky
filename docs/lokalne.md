# Co běží na Macu bez agentů

Překlad, testy i nahrání do TestFlightu jsou obyčejné příkazy. Agent je potřeba na psaní kódu a revize, ne na jejich spouštění.

Jednou nainstalovat: Xcode, `brew install xcodegen mint gh` a ve složce `swift/` `mint bootstrap` (SwiftLint).

## 1. Kontrola Swiftu: `scripts/swift-check.sh`

```bash
scripts/swift-check.sh          # všechno: SwiftLint, výpočty (KartickyCore), testy aplikace
scripts/swift-check.sh --fast   # rychlá kontrola během práce
scripts/swift-check.sh --core   # jen výpočty (swift test)
scripts/swift-check.sh --record # přenahraje referenční snímky obrazovek
```

Vypíše pár řádků; celé výpisy jsou ve `swift/build/check/`.

## 2. Build do TestFlightu: `scripts/testflight.sh`

```bash
cd ~/karticky && git pull && scripts/testflight.sh
```

Postaví aktuální `main` s číslem buildu o 1 vyšším, přibalí index obrázků karet, nahraje build do App Store Connect a otevře malý PR s novým číslem. Podepisuje účtem Apple přihlášeným v Xcode. Za 10–30 minut je v TestFlightu.

Účty (Supabase) potřebují `swift/Config/Secrets.xcconfig` (vzor `Secrets.example.xcconfig`: jen veřejná adresa projektu a publishable klíč). Bez něj aplikace běží bez přihlášení.

## 3. Testy u každého PR samy: GitHub Actions na Macu

Stejně jako u Fakturo, jen pro repozitář karticky (runner je vázaný na repozitář, takže potřebuje druhou instalaci ve vlastní složce):

1. GitHub → karticky → **Settings → Actions → Runners → New self-hosted runner** → macOS, ARM64. Příkazy, které GitHub ukáže, spusť ve složce `~/actions-runner-karticky`. Token vlož sám, agentům ho nedávej.
2. Tamtéž `./svc.sh install && ./svc.sh start`, ať se spouští po startu Macu.
3. **Settings → Secrets and variables → Actions → Variables**: `MAC_RUNNER` = `true`.

Pak se u každého PR, který mění `swift/`, spustí `scripts/swift-check.sh` na simulátoru „Karticky CI“. Vypnutý Mac = úloha počká.
