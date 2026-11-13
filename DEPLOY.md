# Kartotéka: nasazení a postup vývoje

Web se sestavuje jako statická aplikace Expo do složky `web-build` a běží na Cloudflare Pages: `main` → `kartoteka.pages.dev`. iPhone aplikace se staví přes EAS.

**Zatím je jen jedna verze.** Aplikaci ještě nikdo jiný nepoužívá, takže všechno jde rovnou do `main`, bez přepínačů funkcí a bez testovací verze. Až ji začneš sdílet, přejdeme na postup z Fakturo (`dev` na dev.kartoteka.pages.dev, přepínače, vydání do `main` na tvůj pokyn).

Data jsou uložená v zařízení (AsyncStorage, na webu v prohlížeči). Účet je nepovinný: po přihlášení (Google, Facebook nebo e-mail) se sbírka, wishlist a balíčky synchronizují přes Supabase s Row Level Security, stejně jako ve Fakturo.

## Jednorázové nastavení

1. Na Macu: `git clone` repozitáře do `~/kartoteka`, pak `npx expo install --fix` a `npm install`. Vznikne `package-lock.json`, ten commitni (přes PR do `main`). Do té doby CI instaluje bez něj.
2. `npx expo-doctor` musí projít. Pak `npx eas-cli@latest init`: propojí projekt s Expo účtem `jcabalek` a doplní `extra.eas.projectId` do `app.json`.
3. V Cloudflare vytvořit Pages projekt `kartoteka` (Direct Upload).
4. V GitHubu (`Settings → Secrets and variables → Actions`):
   - Secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (oprávnění `Cloudflare Pages → Edit`).
   - Variable: `CLOUD_DEPLOY_READY=true`, až je vše nastavené. Do té doby se změny jen kontrolují a sestavují.
5. V `Settings → Branches` ochránit `main` (jen přes PR).

## Účty (Supabase, Google, Facebook)

1. Vytvořit Supabase projekt v evropském regionu a v SQL Editoru spustit `supabase/schema.sql`.
2. Project URL a Publishable key dát do `.env` (podle `.env.example`), do GitHub Variables `EXPO_PUBLIC_SUPABASE_URL` a `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a do Expo prostředí `preview` a `production` (pro iPhone build). Nikdy ne Secret ani `service_role` key.
3. Supabase → Authentication → URL Configuration: Site URL `https://kartoteka.pages.dev`, Redirect URLs `https://kartoteka.pages.dev/**`, `http://localhost:8081/**` a `kartoteka://auth-callback`.
4. **Google:** Google Cloud Console → APIs & Services → OAuth consent screen (externí, název Kartotéka), pak Credentials → OAuth client ID typu Web application. Authorized redirect URI: `https://<projekt>.supabase.co/auth/v1/callback`. Client ID a Secret vložit do Supabase → Authentication → Providers → Google.
5. **Facebook:** developers.facebook.com → nová aplikace s Facebook Login. Valid OAuth Redirect URIs: stejná adresa `…/auth/v1/callback`. Aplikace potřebuje odkaz na zásady ochrany osobních údajů a na smazání dat a musí být přepnutá do režimu Live, jinak se přihlásí jen správci aplikace. App ID a App Secret vložit do Supabase → Providers → Facebook.
6. Vyzkoušet na webu i v telefonu: přihlásit se, přidat kartu, zkontrolovat ji na druhém zařízení.

Na iPhonu se Google a Facebook otevřou v Safari a vrátí se do aplikace přes `kartoteka://auth-callback` (schéma je v `app.json`, potřebuje nový build). **App Store:** aplikace, která nabízí přihlášení přes Google nebo Facebook, musí podle pravidel Applu nabídnout i Sign in with Apple. Pro vlastní testování v TestFlightu to nevadí, před vydáním do App Store je potřeba ho doplnit.

## Skenování karet

- Index ilustrací (`scan-index-v1.bin`, asi 5 MB) staví workflow **Scan index** (Actions → Scan index → Run workflow, poprvé trvá i 1–2 hodiny, pak jednou týdně jen nové karty). Výsledek je v release `scan-index`. Workflow webu ho při každém sestavení zkopíruje do webu, iPhone si ho stáhne z webu.
- Bez indexu skenování pozná jen karty s čitelným číslem a edicí vlevo dole.
- iPhone: skener je vlastní nativní modul (`modules/card-scanner`), takže potřebuje nový build přes EAS. Expo Go ho nemá.

## Ceny z obchodů

Funkce `functions/api/shop-prices.js` běží na Cloudflare Pages vedle webu. Adresy vyhledávání obchodů jsou označené `verified: false`, dokud je někdo neověří na skutečném webu obchodu (a nepřečte jejich podmínky). Při `npx expo start` funkce neběží; vyzkoušet jde na kartoteka.pages.dev nebo přes `npx wrangler pages dev web-build`.

## Každá změna

1. Větev z čerstvého `origin/main`: `claude/<téma>` nebo `codex/<téma>`.
2. PR do `main` s popisem v češtině, co se změnilo pro uživatele. CI (lint, typy, testy, sestavení webu) musí být zelené.
3. Po začlenění se `main` sám nasadí na `kartoteka.pages.dev`. `dev` se drží stejný jako `main`.
4. Po každém nasazení aktualizovat stavovou stránku „Kartotéka – kde co běží“.

## Lokální spuštění

`EXPO_NO_TELEMETRY=1 npm run web`.

## iPhone

Stejně jako Fakturo: `npx eas-cli@latest build --platform ios --profile production` a `npx eas-cli@latest submit --platform ios`, pak TestFlight. Skenování karet bude potřebovat kameru (`npx expo install expo-camera`), a tedy nový nativní build; v Expo Go a na webu poběží s omezeními.
