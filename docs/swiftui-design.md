# Vzhled Swift aplikace: každá obrazovka je karta

Majitel schválil třetí návrh („every screen is a card“) 14. 11. 2026 po dvou kolech: pryč s fialovou, zemité barvy, žádná sterilita, celá aplikace má být v designu karet Magicu. Expo verze ho má v `theme.ts`, `cardFrame.tsx` a `nav.tsx`; Swift ho má udělat pořádně, s tím, co React Native nezvládl: přechody, textury, světlo, pohyb.

Tokeny jsou v `swift/KartickyUI/Theme.swift` (hodnoty 1:1 z `theme.ts`). Obrazovky si komponenty nevyrábějí samy, berou je z `KartickyUI`.

## Zásady

- **Vlastní symboly, ne oficiální.** Žádné kopie mana symbolů, symbolů edic, rámů ani písma z Magicu (Beleren, Plantin). Mana „kameny“ jsou naše jednoduché kruhy, symbol edice Kartiček je malá karta. Obrázky karet ze Scryfallu jen celé, s řádkem autora.
- **Stůl je tmavý** (`Ink.table` #0B0806), karta na něm svítí. Aplikace je jen v tmavém režimu (`UIUserInterfaceStyle = Dark`); pergamen je světlý sám o sobě.
- **Čitelnost má přednost před ozdobou.** Text na pergamenu `Ink.text`, kontrast AA, Dynamic Type do accessibility3 (rám se zúží, textbox roste a scrolluje).
- **Pohyb s fyzikou karty.** Pružiny (`.spring(response: 0.35, dampingFraction: 0.8)`), karty se zvedají, otáčejí a pokládají. Respektovat „Omezit pohyb“.

## Barvy sekcí

| Sekce | Rám | Typová řádka |
| --- | --- | --- |
| Skenovat | modrá U | Instant — Kamera |
| Hledat | modrá U | Sorcery — Věštba |
| Sbírka | bezbarvá C | Artifact — Truhla |
| Balíčky | zlatá M; otevřený balíček v barvách commandera (`FrameColor.forColors`) | Legendary — Balíček / Commander |
| Wishlist | zelená G | Enchantment — Přání |
| Životy | červená R | Instant — Souboj |
| Profil | bílá W | Planeswalker — Ty |
| Detail karty | barva karty | typová řádka karty |

Mana kameny (výplň / kroužek / písmo): W #EFE3C4/#8A6A35/#2B2014, U #5C8FB3/#2E4A5E/#FFFFFF, B #3E342D/#C99A45/#FFFFFF, R #C4623A/#7A3518/#FFFFFF, G #6B8A40/#3A4A22/#FFFFFF, C #B8AE9C/#5A4F40/#2B2014. Vzácnost (symbol edice): common #3A3A38, uncommon #8FA9BA, rare #C99A45, mythic #D9652E.

## Písmo

- Nadpisy (název karty, typová řádka, P/T, tlačítka): **Alegreya SC Bold**. Text: **Alegreya** (kurzíva pro vysvětlivky v závorkách jako reminder text). Čísla a drobné popisky: **Alegreya Sans**. Všechny pod licencí OFL; soubory `.ttf` do `KartickyUI/Resources/Fonts`, registrace přes `UIAppFonts` nebo `CTFontManagerRegisterFontsForURL`.
- Vždy přes `Font.custom(_:size:relativeTo:)`, aby fungoval Dynamic Type.

## Komponenty (`KartickyUI`)

### `CardFrame`
Obrazovka = jedna karta na stole, poměr volný (vyplní displej), max. šířka 560 bodů.

1. **Rám**: zaoblení 20, uvnitř odsazení 9. Výplň `palette.base` s jemným lineárním přechodem `light → base → dark` shora dolů a velmi slabou texturou (šum, `Canvas`). Okraj 2 body: nahoře a vlevo `light`, dole a vpravo `dark` (zkosená hrana).
2. **Lišta s názvem**: výška ≥ 48, zaoblení 16, výplň `bar`, okraj `barEdge` (dole 3, jinde 2). Vlevo kulaté tlačítko „ruka“ (tři malé vějířem rozložené karty; v podstránce šipka zpět), název `title` 22, vpravo mana kameny (např. barvy commandera).
3. **Okno obrázku** (volitelné): okraj 2 `barEdge`, zaoblení 3. Kamera při skenování, obrázek karty, vějíř tří nejdražších karet ve Sbírce.
4. **Typová řádka**: jako lišta s názvem, výška ≥ 38, vpravo symbol edice (malá karta s třemi řádky) v barvě vzácnosti.
5. **Textbox**: pergamen `Ink.parchment` s jemnou texturou a vnitřním stínem, okraj 2 `barEdge`, scrolluje. Tady je obsah obrazovky.
6. **Patička**: vlevo sběratelská řádka `KRT · 003/007` a „Data o kartách: Scryfall · Kartičky“ (`palette.text`), vpravo **P/T rámeček** s hlavními čísly obrazovky (Sbírka „128 · 412 €“, balíček „87/100“, Wishlist „14 · ↓3“).

Rám se při změně sekce **přebarví plynule** (animace barev), název a typová řádka se prolnou.

### `ManaSymbol`, `ManaCost`
Kruh s výplní, kroužkem 1,5 a spodním okrajem 3 (vypadá jako kámen). `ManaCost` = číslo (bezbarvý kámen s číslicí) + barevné kameny.

### `MiniCard`
Karta 63 : 88 v malém: rám, lišta s názvem, obrázek nebo velké iniciála na `glow`, typová řádka, kousek pergamenu s textem. Používá ruka karet, seznamy balíčků, hráči v Životech.

### Ruka karet (menu „Tvoje ruka“)
Ťuk na tlačítko v liště s názvem: stůl ztmavne, odspodu se vysune **vějíř sedmi karet** (jedna za sekci) – rotace ±5° na kartu, oblouk, aktuální sekce vystrčená nahoru se září `glow`. Tah prstem po kartách je zvedá (jako výběr karty z ruky), puštění „zahraje“ kartu: karta odletí nahoru a **zvětší se do nové obrazovky** (`matchedGeometryEffect` / zoom přechod). Haptika `.selection` při přejetí na další kartu. Popisky jako u VoiceOveru: „Sbírka. Karty, které máš. 128 karet.“

### Foil
Karty ve fólii (`finish == foil`) mají v seznamech a detailu duhový lesk: `LinearGradient` s průhlednými pruhy, posun podle náklonu telefonu (`CMMotionManager`, při „Omezit pohyb“ statický). Detail karty jde naklánět prstem (3D rotace, `rotation3DEffect`) a odlesk se pohybuje.

### Tlačítka a ovládání
- Hlavní: kůže `Ink.leather`, mosazný okraj `Ink.brass` (dole 3), text `Ink.brassLight` v `title`.
- Vedlejší: pergamen tmavší (#E6D3A8) s okrajem #B89A62, text #7A4E1C.
- Přepínače, segmenty a vstupy systémové, přebarvené tokeny (tint `Ink.leather`).
- Plovoucí ovládání nad kamerou: `glassEffect` na iOS 26, jinak `.ultraThinMaterial`.

## Obrazovky (obsah textboxu)

- **Skenovat**: v okně obrázku živá kamera s rámečkem, který se chytne karty (obrys z `VNDetectRectangles`, zezelená při rozpoznání). Rozpoznaná karta „vyletí“ z kamery jako `MiniCard` do pergamenu, kde je seznam naskenovaných s cenou. Nahoře volba cíle (Sbírka / Wishlist / balíček / jen ceny).
- **Hledat**: pole na pergamenu, výsledky jako řady karet (obrázek, název, edice, cena), ťuk = detail karty.
- **Detail karty**: karta v rámu své barvy, obrázek přes celé okno, foil, ceny Scryfall a e-shopy, „Co karta umí“ (klíčová slova kurzívou jako reminder text), tlačítka + Sbírka / + Wishlist / + Balíček.
- **Sbírka, Wishlist**: seznamy s mřížkou/řádky, množství stepperem, swipe akce, Wishlist s cílovou cenou a odznakem „zlevnilo“.
- **Balíčky**: balíčky jako `MiniCard` v barvách commandera; detail s křivkou many (sloupce jako malé karty), typy, barvy, problémy s legalitou česky.
- **Životy**: celá obrazovka je stůl; hráči jako velké karty v barvách many (horní řada otočená o 180°), život velkým číslem `title`, ťuk vlevo −1 / vpravo +1, podržení ±10, „−3“ bublina, haptika. Nástroje dole na kůži.
- **Profil**: bílá karta „Planeswalker — Ty“, účet, synchronizace, verze.

## Snapshoty

Každá komponenta a obrazovka s mock daty: iPhone 18 Pro, nejmenší podporovaný iPhone, Dynamic Type accessibility3. Referenční PNG v `swift/KartickyTests/__Snapshots__`.
