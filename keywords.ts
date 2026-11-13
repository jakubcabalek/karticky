// "Co karta umí": short Czech explanations of keyword abilities and common game terms.
// Magic is not printed in Czech, so the English term stays and the explanation is Czech.
// Written from the Magic Comprehensive Rules; keep each explanation to what a player needs at the table.

export type KeywordExplanation = { term: string; text: string };

const GLOSSARY: Record<string, string> = {
  // Evergreen keywords
  'flying': 'Létá. Může ji zablokovat jen tvor, který má taky flying nebo reach.',
  'reach': 'Dosáhne do vzduchu: může blokovat tvory s flying.',
  'trample': 'Když útočí a je zablokovaná, poškození navíc (nad to, co stačí k zabití blokujících tvorů) projde na hráče nebo planeswalkera, na kterého útočí.',
  'deathtouch': 'Smrtící dotek: jakékoli poškození od ní, i jediný bod, tvora zničí.',
  'lifelink': 'Kolik poškození způsobí, tolik životů získáš.',
  'first strike': 'Způsobuje bojové poškození dřív než tvorové bez first strike. Často tak zabije soupeře dřív, než stihne vrátit úder.',
  'double strike': 'Způsobuje bojové poškození dvakrát: nejdřív jako first strike, pak ještě v běžném kroku poškození.',
  'vigilance': 'Bdělost: když útočí, netapne se, takže může v dalším kole soupeře blokovat.',
  'haste': 'Spěch: může útočit a používat schopnosti s {T} hned v kole, kdy ji zahraješ.',
  'hexproof': 'Soupeři na ni nemohou cílit kouzly ani schopnostmi. Ty můžeš.',
  'shroud': 'Nikdo na ni nemůže cílit kouzly ani schopnostmi, ani ty.',
  'indestructible': 'Nezničitelná: efekty „destroy“ ani smrtelné poškození ji nezničí. Pořád ale může jít pryč obětováním, vyhoštěním nebo snížením odolnosti na 0.',
  'menace': 'Hrozba: může ji zablokovat jen dva a více tvorů naráz.',
  'defender': 'Obránce: nemůže útočit, jen blokovat.',
  'flash': 'Můžeš ji zahrát kdykoli, kdy bys mohl zahrát instant, třeba v tahu soupeře.',
  'ward': 'Ochrana: když na ni soupeř zacílí kouzlem nebo schopností, zruší se mu, pokud nezaplatí uvedenou cenu.',
  'protection': 'Ochrana před něčím (barvou, typem…): nedá se tím cílit, zablokovat, poškození od toho je zabráněno a nedá se na ni tím nic připojit.',
  'prowess': 'Kdykoli zahraješ kouzlo, které není tvor, dostane do konce kola +1/+1.',
  'equip': 'Vybavení: zaplať cenu a připoj ho ke svému tvorovi. Jen ve svém tahu, když je prázdný stack (jako sorcery).',
  'enchant': 'Aura: při zahrání ji připojíš k tomu, co je napsané (např. Enchant creature = k tvorovi).',
  'scry': 'Podívej se na vrchních N karet knihovny. Kterékoli dej dospod, zbytek nahoru v pořadí, jaké chceš.',
  'surveil': 'Podívej se na vrchních N karet knihovny. Kterékoli dej do hřbitova, zbytek nahoru v pořadí, jaké chceš.',
  'mill': 'Dej vrchních N karet knihovny do hřbitova.',
  'fight': 'Dva tvorové se poperou: každý způsobí druhému poškození rovné své síle.',
  // Common set mechanics
  'cycling': 'Zaplať cenu a odhoď kartu z ruky: lízni si novou. Hodí se, když ji zrovna nepotřebuješ.',
  'kicker': 'Při zahrání můžeš zaplatit navíc; pak má kouzlo silnější efekt.',
  'multikicker': 'Při zahrání můžeš kicker zaplatit kolikrát chceš; efekt se násobí.',
  'flashback': 'Můžeš ji zahrát znovu ze hřbitova za uvedenou cenu. Pak se vyhostí.',
  'convoke': 'Při zahrání můžeš tapnout své tvory: každý zaplatí {1} nebo jednu manu své barvy.',
  'delve': 'Při zahrání můžeš vyhostit karty ze svého hřbitova: každá zaplatí {1}.',
  'cascade': 'Když ji zahraješ, otáčej vrchní karty knihovny, dokud nenajdeš nezemi s nižší hodnotou many. Tu můžeš zahrát zdarma.',
  'storm': 'Když ji zahraješ, zkopíruje se za každé kouzlo, které bylo v tomto kole zahrané před ní.',
  'persist': 'Když zemře a neměla −1/−1 žeton, vrátí se na bojiště s −1/−1 žetonem.',
  'undying': 'Když zemře a neměla +1/+1 žeton, vrátí se na bojiště s +1/+1 žetonem.',
  'annihilator': 'Kdykoli útočí, bránící se hráč musí obětovat N svých permanentů.',
  'infect': 'Tvorům dává poškození jako −1/−1 žetony, hráčům jako jed (poison). Hráč s 10 jedy prohrává.',
  'toxic': 'Když způsobí bojové poškození hráči, ten dostane N jedů (poison). 10 jedů = prohra.',
  'poisonous': 'Když způsobí bojové poškození hráči, ten dostane N jedů (poison). 10 jedů = prohra.',
  'wither': 'Poškození tvorům dává jako −1/−1 žetony, takže se nezahojí na konci kola.',
  'affinity': 'Stojí o {1} méně za každý tvůj permanent uvedeného typu (nejčastěji artefakt).',
  'morph': 'Můžeš ji zahrát lícem dolů jako bezejmennou 2/2 za {3}. Kdykoli ji pak otočíš za morph cenu.',
  'disguise': 'Můžeš ji zahrát lícem dolů jako 2/2 s ward {2} za {3}. Kdykoli ji pak otočíš za disguise cenu.',
  'ninjutsu': 'Zaplať cenu a vrať do ruky svého neblokovaného útočníka: tuhle kartu dej na bojiště, tapnutou a útočící.',
  'exalted': 'Kdykoli tvůj tvor útočí sám, dostane do konce kola +1/+1 (za každou kartu s exalted).',
  'evolve': 'Když ti přijde tvor s větší sílou nebo odolností než tenhle, dej na tenhle +1/+1 žeton.',
  'proliferate': 'Vyber libovolné hráče a permanenty se žetony a každému přidej po jednom žetonu každého druhu, který už má.',
  'crew': 'Posádka: tapni své tvory s celkovou silou aspoň N a vozidlo se do konce kola stane tvorem.',
  'investigate': 'Vytvoř žeton Clue (stopa): {2}, obětuj ho: lízni kartu.',
  'explore': 'Odhal vrchní kartu knihovny. Země jde do ruky; jinak dostane tvor +1/+1 žeton a kartu můžeš dát do hřbitova.',
  'adapt': 'Pokud na tvorovi nejsou +1/+1 žetony, dej na něj N +1/+1 žetonů.',
  'amass': 'Dej N +1/+1 žetonů na svou Armádu. Když žádnou nemáš, nejdřív vytvoř žeton Army 0/0.',
  'afterlife': 'Když zemře, vytvoř N bílo-černých duchů 1/1 s flying.',
  'riot': 'Při příchodu si vybereš: +1/+1 žeton, nebo haste.',
  'mentor': 'Když útočí, dej +1/+1 žeton na jiného útočícího tvora s menší silou.',
  'partner': 'Commander: můžeš mít dva velitele, pokud mají partner oba.',
  'companion': 'Pokud celý tvůj balíček splňuje podmínku, můžeš kartu mít mimo hru a jednou za hru ji za {3} vzít do ruky.',
  'disturb': 'Můžeš ji zahrát ze hřbitova otočenou na druhou stranu za disturb cenu.',
  'changeling': 'Je současně každým typem tvora (elf, goblin, drak…).',
  'devoid': 'Je bezbarvá, i když má barevnou manu v ceně.',
  'escape': 'Můžeš ji zahrát ze hřbitova za escape cenu, která zahrnuje vyhoštění dalších karet z hřbitova.',
  'foretell': 'Ve svém tahu ji za {2} vyhostíš lícem dolů. V pozdějším tahu ji zahraješ za levnější foretell cenu.',
  'training': 'Když útočí spolu s tvorem s větší silou, dostane +1/+1 žeton.',
  'blitz': 'Můžeš ji zahrát za blitz cenu: má haste, když zemře, lízneš kartu, a na konci kola se obětuje.',
  'casualty': 'Při zahrání můžeš obětovat tvora se silou N a víc; pak se kouzlo zkopíruje.',
  'connive': 'Lízni kartu, pak jednu odhoď. Když odhodíš nezemi, dej na tvora +1/+1 žeton.',
  'discover': 'Otáčej vrchní karty, dokud nenajdeš nezemi s hodnotou many N nebo nižší. Zahraj ji zdarma, nebo si ji dej do ruky.',
  'offspring': 'Při zahrání můžeš zaplatit navíc; pak vytvoříš žeton, který je jeho kopií, ale 1/1.',
  'exploit': 'Když přijde, můžeš obětovat tvora; karta pak obvykle udělá něco navíc.',
  'monstrosity': 'Pokud ještě není monstrózní, dej na něj N +1/+1 žetonů a stane se monstrózním.',
  'unearth': 'Zaplať cenu: vrať ji ze hřbitova na bojiště s haste. Na konci kola, nebo kdyby měla odejít, se vyhostí.',
  'madness': 'Když ji odhodíš, můžeš ji hned zahrát za madness cenu.',
  'suspend': 'Za suspend cenu ji vyhostíš s N časovými žetony. Na začátku každého tvého tahu jeden odeber; po posledním ji zahraješ zdarma.',
  'split second': 'Dokud je na stacku, nikdo nemůže hrát kouzla ani aktivovat schopnosti (kromě many).',
  'shadow': 'Může blokovat a být blokována jen tvory, které mají taky shadow.',
  'fear': 'Může ji zablokovat jen artefaktový nebo černý tvor.',
  'intimidate': 'Může ji zablokovat jen artefaktový tvor nebo tvor, který s ní sdílí barvu.',
  'skulk': 'Nemůže ji zablokovat tvor s větší silou.',
  'landwalk': 'Nedá se zablokovat, dokud bránící hráč ovládá zemi uvedeného typu (např. Islandwalk = ostrov).',
  'regenerate': 'Příště, když by měla být zničena, místo toho se tapne, odejde z boje a odstraní se z ní poškození.',
  'bestow': 'Můžeš ji zahrát jako auru na tvora za bestow cenu. Když ten tvor odejde, zůstane jako samostatný tvor.',
  'dash': 'Můžeš ji zahrát za dash cenu: má haste a na konci kola se vrátí do ruky.',
  'emerge': 'Můžeš ji zahrát za emerge cenu, když obětuješ tvora; cena se sníží o jeho hodnotu many.',
  'improvise': 'Při zahrání můžeš tapnout své artefakty: každý zaplatí {1}.',
  'fabricate': 'Když přijde, vyber: N +1/+1 žetonů na ni, nebo N servo žetonů 1/1.',
  'embalm': 'Ze hřbitova: zaplať cenu a vyhosti ji, vytvoř její žetonovou kopii (bílá mumie).',
  'eternalize': 'Ze hřbitova: zaplať cenu a vyhosti ji, vytvoř její kopii jako černou 4/4 mumii.',
  'mutate': 'Můžeš ji zahrát na svého ne-lidského tvora: spojí se v jednoho, který má schopnosti obou.',
  'boast': 'Schopnost, kterou můžeš aktivovat jen jednou za kolo a jen pokud tvor v tomto kole útočil.',
  'daybound': 'Den a noc: když hráč ve svém tahu nezahraje žádné kouzlo, nastane noc a karta se otočí. Když někdo zahraje dvě kouzla v jednom tahu, nastane den.',
  'nightbound': 'Den a noc: noční strana karty. Když někdo zahraje dvě kouzla v jednom tahu, nastane den a karta se otočí zpět.',
  'backup': 'Když přijde, dej N +1/+1 žetonů na cílového tvora. Pokud je to jiný tvor, získá do konce kola i schopnosti této karty.',
  'bargain': 'Při zahrání můžeš obětovat artefakt, očarování nebo žeton; kouzlo pak udělá něco navíc.',
  'craft': 'Zaplať cenu a vyhosti ji spolu s uvedenými kartami: vrátí se otočená na silnější stranu.',
  'plot': 'Ve svém tahu ji za plot cenu vyhostíš lícem nahoru. V pozdějším tahu ji zahraješ zdarma.',
  'saddle': 'Tapni tvory s celkovou silou N: osedláš ho a při útoku dostaneš bonus.',
  'gift': 'Při zahrání můžeš soupeři dát dárek; kouzlo pak udělá něco silnějšího.',
  'impending': 'Můžeš ji zahrát levněji s N časovými žetony; dokud je má, není tvor. Na konci tvého tahu jeden odeber.',
  'eerie': 'Spustí se, když ti přijde očarování nebo když plně odemkneš místnost.',
  'landfall': 'Spustí se pokaždé, když ti na bojiště přijde země.',
  'raid': 'Platí, pokud jsi v tomto kole útočil.',
  'threshold': 'Platí, když máš ve hřbitově aspoň 7 karet.',
  'metalcraft': 'Platí, když ovládáš aspoň 3 artefakty.',
  'morbid': 'Platí, pokud v tomto kole zemřel nějaký tvor.',
  'revolt': 'Platí, pokud ti v tomto kole odešel z bojiště permanent.',
  'heroic': 'Spustí se, kdykoli na tohoto tvora zacílíš kouzlem.',
  'constellation': 'Spustí se, kdykoli ti přijde očarování.',
  'magecraft': 'Spustí se, kdykoli zahraješ nebo zkopíruješ instant nebo sorcery.',
  'treasure': 'Žeton Treasure (poklad): {T}, obětuj ho: přidej jednu manu libovolné barvy.',
  'food': 'Žeton Food (jídlo): {2}, {T}, obětuj ho: získáš 3 životy.',
  'clue': 'Žeton Clue (stopa): {2}, obětuj ho: lízni kartu.',
  'blood': 'Žeton Blood: {1}, {T}, odhoď kartu, obětuj ho: lízni kartu.',
  // Common terms in rules text
  'sacrifice': 'Obětovat: dáš vlastní permanent do hřbitova. Indestructible ani regenerace tomu nezabrání.',
  'exile': 'Vyhostit: karta jde úplně mimo hru, ne do hřbitova.',
  'counter target spell': 'Zrušit kouzlo: kouzlo se vůbec neprovede a jde do hřbitova.',
  'token': 'Žeton: herní objekt vytvořený efektem, ne skutečná karta. Když opustí bojiště, zmizí.',
  'mana value': 'Hodnota many: kolik many celkem karta stojí (barevná i bezbarvá dohromady).',
  'legendary': 'Legendární: nemůžeš ovládat dva legendární permanenty se stejným jménem; když se to stane, jeden si vybereš a druhý jde do hřbitova.',
};

// Keywords whose Scryfall name differs from the glossary entry.
const ALIASES: Record<string, string> = {
  'protection from': 'protection',
  'islandwalk': 'landwalk', 'swampwalk': 'landwalk', 'forestwalk': 'landwalk', 'mountainwalk': 'landwalk', 'plainswalk': 'landwalk',
  'day': 'daybound', 'night': 'nightbound',
};

// Terms found in rules text even when Scryfall does not list them as keywords
// (e.g. "gains flying", "create a Treasure token").
const TEXT_TERMS = Object.keys(GLOSSARY);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const titleCase = (term: string) => term.replace(/(^|\s)\S/g, letter => letter.toUpperCase());

const glossaryKey = (keyword: string) => {
  const lower = keyword.toLowerCase().trim();
  if (GLOSSARY[lower]) return lower;
  if (ALIASES[lower]) return ALIASES[lower];
  for (const [alias, key] of Object.entries(ALIASES)) if (lower.startsWith(alias)) return key;
  return null;
};

/** Explanations for everything the card's keywords and rules text mention, in the order they appear. */
export const explainCard = (card: { keywords?: string[]; oracleText?: string }): KeywordExplanation[] => {
  const text = card.oracleText ?? '';
  const found = new Map<string, number>();
  for (const keyword of card.keywords ?? []) {
    const key = glossaryKey(keyword);
    if (key && !found.has(key)) {
      const at = text.toLowerCase().indexOf(keyword.toLowerCase());
      found.set(key, at >= 0 ? at : 0);
    }
  }
  for (const term of TEXT_TERMS) {
    if (found.has(term)) continue;
    const match = new RegExp(`(^|[^a-z])${escape(term)}(s|ed|d)?([^a-z]|$)`, 'i').exec(text);
    if (match) found.set(term, match.index);
  }
  return [...found.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([term]) => ({ term: titleCase(term), text: GLOSSARY[term] }));
};
