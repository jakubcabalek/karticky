# Kartotéka: nasazení a postup vývoje

Stejný postup jako u Fakturo. Web se sestavuje jako statická aplikace Expo do složky `web-build` a běží na Cloudflare Pages: `main` → `kartoteka.pages.dev` (veřejná verze), `dev` → `dev.kartoteka.pages.dev` (testovací verze). iPhone aplikace se staví přes EAS.

Data jsou zatím uložená jen v zařízení (AsyncStorage, na webu v prohlížeči). Testovací verze má vlastní oddělená data. Cloud (Supabase s Row Level Security jako ve Fakturo) přijde jako funkce pod přepínačem.

## Jednorázové nastavení

1. Na Macu: `git clone` repozitáře do `~/kartoteka`, pak `npx expo install --fix` a `npm install`. Vznikne `package-lock.json`, ten commitni (přes PR do `dev`). Do té doby CI instaluje bez něj.
2. `npx expo-doctor` musí projít. Pak `npx eas-cli@latest init`: propojí projekt s Expo účtem `jcabalek` a doplní `extra.eas.projectId` do `app.json`.
3. V Cloudflare vytvořit Pages projekt `kartoteka` (Direct Upload) a povolit preview deploymenty větve `dev`, aby vznikl alias `dev.kartoteka.pages.dev`.
4. V GitHubu (`Settings → Secrets and variables → Actions`):
   - Secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (oprávnění `Cloudflare Pages → Edit`).
   - Variable: `CLOUD_DEPLOY_READY=true`, až je vše nastavené. Do té doby se změny jen kontrolují a sestavují.
5. V `Settings → Branches` nastavit `dev` jako výchozí větev a ochránit `main` (jen přes PR).

## Skenování karet

- Index ilustrací (`scan-index-v1.bin`, asi 5 MB) staví workflow **Scan index** (Actions → Scan index → Run workflow, poprvé trvá i 1–2 hodiny, pak jednou týdně jen nové karty). Výsledek je v release `scan-index`. Workflow webu ho při každém sestavení zkopíruje do webu, iPhone si ho stáhne z webu.
- Bez indexu skenování pozná jen karty s čitelným číslem a edicí vlevo dole.
- iPhone: skener je vlastní nativní modul (`modules/card-scanner`), takže potřebuje nový build přes EAS. Expo Go ho nemá.

## Ceny z obchodů

Funkce `functions/api/shop-prices.js` běží na Cloudflare Pages vedle webu. Adresy vyhledávání obchodů jsou označené `verified: false`, dokud je někdo neověří na skutečném webu obchodu (a nepřečte jejich podmínky). Při `npx expo start` funkce neběží; vyzkoušet jde na dev.kartoteka.pages.dev nebo přes `npx wrangler pages dev web-build`.

## Každá změna

1. Větev z čerstvého `origin/dev`: `claude/<téma>` nebo `codex/<téma>`.
2. Nová funkce jde za přepínač v `devFeatures.ts` (v testovací verzi zapnutá, ve veřejné vypnutá).
3. PR do `dev` s popisem v češtině, co se změnilo pro uživatele. CI (lint, typy, testy, sestavení webu) musí být zelené.
4. Po začlenění se `dev` sám nasadí na `dev.kartoteka.pages.dev`.
5. Do `main` jen přes PR `dev → main`, když to majitel řekne (zjevná oprava chyby může rovnou).
6. Po každém nasazení aktualizovat stavovou stránku „Kartotéka – kde co běží“.

## Lokální spuštění

`EXPO_PUBLIC_APP_CHANNEL=development EXPO_NO_TELEMETRY=1 npm run web` – testovací verze s oddělenými daty. Bez proměnné jde o veřejnou verzi.

## iPhone

Stejně jako Fakturo: `npx eas-cli@latest build --platform ios --profile production` a `npx eas-cli@latest submit --platform ios`, pak TestFlight. Skenování karet bude potřebovat kameru (`npx expo install expo-camera`), a tedy nový nativní build; v Expo Go a na webu poběží s omezeními.
