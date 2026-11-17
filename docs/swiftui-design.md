# Vzhled Swift aplikace: nativní iOS, grafiku dělají karty

Majitel 17. 11. 2026: „Zahoďme ten koncept, že každá stránka je jiná karta. Chci, ať to je native vypadající a do toho nějaká hezká grafika.“ Koncept „každá obrazovka je karta“ (Expo verze, `theme.ts`, `cardFrame.tsx`) se do Swiftu **nepřebírá**.

Náhledy: návrhové plátno „Kartičky – nový design“ (claude.ai), řada „Nativní iOS verze“ (Sbírka, Detail karty, Skenování, Balíček, Životy).

## Zásady

- **Systémové všechno.** `TabView` s Liquid Glass lištou (iOS 26, jinak systémová lišta), `NavigationStack` s velkými titulky, `List` / `.insetGrouped`, `.searchable`, `sheet` s detenty, `Menu`, `confirmationDialog`, swipe akce, kontextové menu s náhledem karty. Písmo SF (Dynamic Type do accessibility3), ikony SF Symbols.
- **Grafiku dělají karty samy.** Obrázky karet ze Scryfallu jsou hlavní vizuál: mřížka karet ve Sbírce, velká karta v detailu, karty v seznamech. Kolem nich jen jemná „atmosféra“: rozmazaný obrázek karty jako pozadí hlavičky (`.blur` + gradient do pozadí), barevná identita balíčku jako přechod v hlavičce.
- **Pohyb a světlo tam, kde dávají smysl:** fólie s duhovým leskem podle náklonu telefonu (`CMMotionManager`, při „Omezit pohyb“ statický), detail karty jde natočit prstem (`rotation3DEffect`), zoom přechod z mřížky do detailu (`navigationTransition(.zoom)`), haptika při změně životů a při rozpoznání karty.
- **Tmavý i světlý režim** (systémové barvy). Tmavý je výchozí na náhledech, protože karty v něm vyniknou.
- **Žádné kopie grafiky Magicu** (rámy, mana symboly, písmo Beleren/Plantin). Barvy many jsou naše jednoduché kolečka; obrázky karet jen celé, s řádkem autora.

## Barvy

- **Akcent:** jantarová `#E8973A` (tint aplikace, hlavní tlačítka, ceny, tlačítko Skenovat). Žádná fialová.
- **Barvy many** (kolečka, grafy, přechody balíčků): W `#F4EBCF`, U `#5C9BD1`, B `#4A3F4F`, R `#E0663A`, G `#5E9B4C`, C `#B8AE9C`.
- **Životy:** panely hráčů v přechodech barev many (modrá `#6FAEDD → #16324A`, zelená `#9CC870 → #1F3514`, červená `#F49A5C → #5A1C0C`, černá `#7D6E8A → #1A151E`, bílá a zlatá podobně).
- Zelená `#6FCF8E` pro „přidáno“ / „zlevnilo“, žlutá `#F2C14E` pro varování (chybí karty).

## Navigace

Spodní lišta se čtyřmi záložkami **Sbírka, Balíčky, Wishlist, Životy** a vedle ní samostatné kulaté tlačítko **Skenovat** (akcent, ikona fotoaparátu), jako hledání v Apple Music na iOS 26. Hledání karet je `.searchable` ve Sbírce (hledá ve sbírce i na Scryfallu). Profil je avatar vpravo nahoře ve Sbírce.

## Obrazovky

- **Sbírka**: velký titulek, pod ním počet karet a hodnota (s týdenní změnou), vyhledávání, filtry jako kapsle (Vše, Foil, barvy many, Commander, řazení), mřížka 3 sloupce: obrázek karty, název, počet × edice, cena. Fólie se lesknou.
- **Detail karty**: rozmazaný obrázek karty jako pozadí, velká karta (lesk, natočení prstem), název + mana, typ · edice · číslo, tlačítka *Do sbírky* (akcent) / *Wishlist* / *Balíček*, „Máš 2×…“, sekce **Ceny** (Scryfall, e-shopy) a **Co karta umí** (vysvětlení klíčových slov česky), „Data o kartách: Scryfall“.
- **Skenování**: celá obrazovka kamera, rohy rámečku v akcentu, které se chytí karty; nahoře skleněná tlačítka (Zavřít, *Ukládat do: Sbírka ▾*, blesk); dole skleněný panel s poslední rozpoznanou kartou (obrázek, název, edice, jazyk, cena, „✓ Přidáno… máš 4×“), tlačítka Foil / Jiná edice / Vrátit a seznam posledních.
- **Balíček**: hlavička s přechodem barevné identity a kartou commandera, dlaždice (98/100 karet, průměr many, chybí ti), křivka many jako graf (Swift Charts), seznam po typech s náhledy karet.
- **Životy**: celá obrazovka, 2–6 panelů v barvách many (horní řada otočená), velká čísla (SF, `tabular-nums`, `contentTransition(.numericText())`), „−3“ bublina, jed a commander damage jako štítky, uprostřed skleněná kapsle s nástroji (Zpět, kostka, zavřít).

## Komponenty (`KartickyUI`)

`CardImage` (obrázek ze Scryfallu s cache, zaoblení podle poměru karty, placeholder), `FoilShine` (modifikátor lesku), `ManaDots`, `PriceText`, `ColorIdentityGradient`, `LifePanel`, `ScanFrame`. Obrazovky si je nekreslí samy.

## Snapshoty

Každá obrazovka s mock daty: tmavý a světlý režim, iPhone 18 Pro, nejmenší iPhone, accessibility3. Referenční PNG v `swift/KartickyTests/__Snapshots__`.
