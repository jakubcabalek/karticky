# Kartičky – stav práce (sdílená paměť agentů)

Agenti si nic nepamatují mezi sezeními. Tady je, kde se skončilo. Na začátku sezení: `git fetch origin`, přečíst `AGENTS.md`, tento soubor a `gh pr list`. Při první commitu zapsat svůj řádek do „Teď rozpracované“, na konci ho přesunout a upravit frontu.

## Teď rozpracované

| Agent | Větev | Co | Stav |
| --- | --- | --- | --- |
| – | – | – | – |

## Fronta (Swift, podle docs/swiftui-plan.md)

1. **Fáze 0** – `xcodegen generate`, rozchodit kostru (psaná bez Xcode), `scripts/swift-check.sh` zelený.
2. **Fáze 1** – navigace (`TabView` + tlačítko Skenovat) a komponenty z `docs/swiftui-design.md`, náhledy a snapshoty s mock daty.
3. **Fáze 2** – knihovna offline, hledání s filtry, detail karty, Sbírka, Wishlist.
4. **Fáze 3** – šanony, import/export CSV.
5. Fáze 4–7 podle plánu.

## Pro Jakuba

- Self-hosted runner pro Swift testy u PR (`docs/lokalne.md`, bod 3) – volitelné.
- Ověřit, že aplikace Kartičky v App Store Connect patří týmu `NL96UW5HVB` (podepisování z Xcode).

## Hotovo

- 17. 11. 2026 – plán přepisu, kostra `swift/`, testovací data z TS (PR #8).
