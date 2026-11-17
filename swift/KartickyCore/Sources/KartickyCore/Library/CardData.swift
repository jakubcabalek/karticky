import Foundation

// Port funkcí z cardData.ts. Stejné názvy a stejné chování (ověřuje cases.json),
// „teď“ je vždy parametr. Pořadí docs/swiftui-plan.md, bod 5.

public func emptyLibrary() -> Library { Library() }

public func entryKey(_ cardId: String, _ finish: Finish) -> String { "\(cardId):\(finish.rawValue)" }

/// Přidá kusy printingu; stejný printing a provedení jen zvýší počet.
public func addCard(
    _ list: [CardEntry], _ card: CardPrinting, quantity: Int = 1, finish: Finish = .nonfoil, now: String
) -> [CardEntry] {
    let key = entryKey(card.id, finish)
    let count = max(1, quantity)
    if list.contains(where: { $0.key == key }) {
        return list.map { entry in
            guard entry.key == key else { return entry }
            var updated = entry
            updated.card = card
            updated.quantity = entry.quantity + count
            return updated
        }
    }
    return list + [CardEntry(key: key, card: card, quantity: count, finish: finish, addedAt: now)]
}

/// Nastaví počet jednoho řádku; nula a méně ho smaže.
public func setQuantity(_ list: [CardEntry], _ key: String, _ quantity: Int) -> [CardEntry] {
    guard quantity >= 1 else { return list.filter { $0.key != key } }
    return list.map { entry in
        guard entry.key == key else { return entry }
        var updated = entry
        updated.quantity = quantity
        return updated
    }
}

public func totalCards(_ list: [CardEntry]) -> Int { list.reduce(0) { $0 + $1.quantity } }

/// Cena jednoho kusu v provedení řádku, `nil` když ji Scryfall nemá.
public func entryPrice(_ entry: CardEntry, _ currency: PriceCurrency) -> Double? {
    let prices = entry.card.prices
    switch (currency, entry.finish) {
    case (.eur, .foil): return prices.eurFoil
    case (.eur, .nonfoil): return prices.eur
    case (.usd, .foil): return prices.usdFoil
    case (.usd, .nonfoil): return prices.usd
    }
}

/// `Math.round(value * 100) / 100` z JavaScriptu (polovina nahoru).
func roundCents(_ value: Double) -> Double { (value * 100 + 0.5).rounded(.down) / 100 }

public struct ListValue: Hashable, Sendable {
    public var total: Double
    /// Kusy bez ceny, které v součtu chybí.
    public var unpriced: Int
}

public func listValue(_ list: [CardEntry], _ currency: PriceCurrency) -> ListValue {
    list.reduce(ListValue(total: 0, unpriced: 0)) { sum, entry in
        guard let price = entryPrice(entry, currency) else {
            return ListValue(total: sum.total, unpriced: sum.unpriced + entry.quantity)
        }
        return ListValue(total: roundCents(sum.total + price * Double(entry.quantity)), unpriced: sum.unpriced)
    }
}

/// Kolik kusů téhle karty (jakýkoli printing a provedení) je v seznamu.
public func copiesOf(_ list: [CardEntry], _ card: CardPrinting) -> Int {
    let identity = card.identity
    return list.filter { $0.card.identity == identity }.reduce(0) { $0 + $1.quantity }
}

public func createDeck(_ library: Library, _ name: String, id: String, now: String, format: DeckFormat = .commander) -> Library {
    var result = library
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    result.decks.append(Deck(
        id: id, name: trimmed.isEmpty ? "Nový balíček" : trimmed, format: format.rawValue, createdAt: now, updatedAt: now
    ))
    return result
}

public func deckEntries(_ deck: Deck) -> [CardEntry] { deck.commander + deck.main + deck.sideboard }

public func updateDeck(_ library: Library, _ deckId: String, now: String, _ change: (inout Deck) -> Void) -> Library {
    var result = library
    result.decks = library.decks.map { deck in
        guard deck.id == deckId else { return deck }
        var updated = deck
        change(&updated)
        updated.updatedAt = now
        return updated
    }
    return result
}

public func deleteDeck(_ library: Library, _ deckId: String) -> Library {
    var result = library
    result.decks = library.decks.filter { $0.id != deckId }
    return result
}

public struct MissingCard: Hashable, Sendable {
    public var card: CardPrinting
    public var missing: Int
}

/// Karty, které balíčku chybí ve sbírce. Karta v main i sideboardu se počítá dohromady.
public func missingForDeck(_ deck: Deck, _ collection: [CardEntry]) -> [MissingCard] {
    var order: [String] = []
    var needed: [String: (card: CardPrinting, count: Int)] = [:]
    for entry in deckEntries(deck) {
        let id = entry.card.identity
        if let current = needed[id] {
            needed[id] = (current.card, current.count + entry.quantity)
        } else {
            order.append(id)
            needed[id] = (entry.card, entry.quantity)
        }
    }
    return order.compactMap { id in
        guard let item = needed[id] else { return nil }
        let missing = item.count - copiesOf(collection, item.card)
        return missing > 0 ? MissingCard(card: item.card, missing: missing) : nil
    }
}

/// Dá do wishlistu, co balíčku chybí, bez zdvojení toho, co už ve wishlistu je.
public func wishMissingCards(_ library: Library, _ deckId: String, now: String) -> Library {
    guard let deck = library.decks.first(where: { $0.id == deckId }) else { return library }
    var result = library
    for item in missingForDeck(deck, library.collection) {
        let toAdd = item.missing - copiesOf(result.wishlist, item.card)
        if toAdd > 0 { result.wishlist = addCard(result.wishlist, item.card, quantity: toAdd, now: now) }
    }
    return result
}

/// Přesune kartu z wishlistu do sbírky (koupená nebo vyměněná).
public func markWishAcquired(_ library: Library, _ key: String, now: String) -> Library {
    guard let entry = library.wishlist.first(where: { $0.key == key }) else { return library }
    var result = library
    result.wishlist = library.wishlist.filter { $0.key != key }
    result.collection = addCard(library.collection, entry.card, quantity: entry.quantity, finish: entry.finish, now: now)
    return result
}

/// Uložená data → knihovna. Nikdy nespadne: co je poškozené, vypadne.
/// Na rozdíl od TypeScriptu zachová neznámá pole knihovny a balíčků (docs/swiftui-plan.md, bod 4.1).
public func normalizeLibrary(_ value: JSONValue) -> Library {
    // V JavaScriptu je pole také objekt; normalizeLibrary([]) tedy dá prázdnou knihovnu s `deleted`.
    if case .array = value { return Library(deleted: [:]) }
    guard let object = value.objectValue else { return emptyLibrary() }
    func entries(_ key: String) -> [CardEntry] { (object[key]?.arrayValue ?? []).compactMap(CardEntry.init(json:)) }
    let decks: [Deck] = (object["decks"]?.arrayValue ?? []).compactMap { item in
        guard var deck = Deck(json: item) else { return nil }
        if DeckFormat(rawValue: deck.format) == nil { deck.format = DeckFormat.casual.rawValue }
        return deck
    }
    var library = Library(
        collection: entries("collection"), wishlist: entries("wishlist"), decks: decks,
        deleted: object["deleted"]?.objectValue?.compactMapValues(\.stringValue) ?? [:],
        pricesUpdatedAt: object["pricesUpdatedAt"]?.stringValue
    )
    library.extra = object.filter { !Library.knownKeys.contains($0.key) }
    return library
}

// MARK: - Obnova cen a hlídání wishlistu

/// Nahradí uložená data karet (ceny, legalita…) čerstvými ze Scryfallu podle id.
public func refreshCards(_ library: Library, _ fresh: [CardPrinting], now: String) -> Library {
    var byId: [String: CardPrinting] = [:]
    for card in fresh { byId[card.id] = card }
    func update(_ list: [CardEntry]) -> [CardEntry] {
        list.map { entry in
            guard let card = byId[entry.card.id] else { return entry }
            var updated = entry
            updated.card = card
            return updated
        }
    }
    var result = library
    result.collection = update(library.collection)
    result.wishlist = update(library.wishlist)
    result.decks = library.decks.map { deck in
        var updated = deck
        for board in DeckBoard.allCases { updated[board] = update(deck[board]) }
        return updated
    }
    result.pricesUpdatedAt = now
    return result
}

/// Id všech karet v knihovně (bez opakování, v pořadí výskytu) pro jeden požadavek na obnovu.
public func libraryCardIds(_ library: Library) -> [String] {
    var seen = Set<String>()
    let all = library.collection + library.wishlist + library.decks.flatMap(deckEntries)
    return all.map(\.card.id).filter { seen.insert($0).inserted }
}

/// Ceny se obnovují nejvýš jednou denně (Scryfall je mění jednou denně).
public func pricesAreStale(_ library: Library, now: String) -> Bool {
    guard let updatedAt = library.pricesUpdatedAt, !updatedAt.isEmpty else { return true }
    guard let nowMs = parseDate(now), let updatedMs = parseDate(updatedAt) else { return false }
    return nowMs - updatedMs > 20 * 3_600_000
}

public struct PriceAlert: Hashable, Sendable {
    public var entry: CardEntry
    public var price: Double
}

/// Karty z wishlistu, které teď stojí cílovou cenu nebo méně.
public func priceAlerts(_ wishlist: [CardEntry]) -> [PriceAlert] {
    wishlist.compactMap { entry in
        guard let target = entry.targetPrice, let price = entryPrice(entry, .eur), price <= target else { return nil }
        return PriceAlert(entry: entry, price: price)
    }
}

public func setTargetPrice(_ list: [CardEntry], _ key: String, _ target: Double?) -> [CardEntry] {
    list.map { entry in
        guard entry.key == key else { return entry }
        var updated = entry
        updated.extra["targetPrice"] = nil
        if let target, target.isFinite, target > 0 {
            updated.targetPrice = roundCents(target)
        } else {
            updated.targetPrice = nil
        }
        return updated
    }
}

// MARK: - Synchronizace

private let tombstoneDays = 120.0

/// Zapíše, co mezi dvěma verzemi knihovny zmizelo (pro synchronizaci).
public func recordDeletions(_ before: Library, _ after: Library, now: String) -> Library {
    var deleted = after.deleted ?? before.deleted ?? [:]
    func gone(_ prefix: String, _ old: [String], _ current: [String]) {
        let kept = Set(current)
        for key in old where !kept.contains(key) { deleted["\(prefix):\(key)"] = now }
    }
    gone("c", before.collection.map(\.key), after.collection.map(\.key))
    gone("w", before.wishlist.map(\.key), after.wishlist.map(\.key))
    gone("d", before.decks.map(\.id), after.decks.map(\.id))
    if let nowMs = parseDate(now) {
        let oldest = nowMs - tombstoneDays * 86_400_000
        deleted = deleted.filter { _, at in
            guard let atMs = parseDate(at) else { return true }
            return atMs >= oldest
        }
    }
    var result = after
    result.deleted = deleted
    return result
}

/// Spojí knihovnu z tohoto zařízení s tou z účtu. Karty a balíčky z obou zůstanou; u stejné karty
/// vyhrává počet z tohoto zařízení, u stejného balíčku ten změněný později. Co se na jedné straně
/// smazalo, zůstane smazané, pokud se to po smazání znovu nepřidalo.
public func mergeLibraries(_ local: Library, _ remote: Library) -> Library {
    var deleted = remote.deleted ?? [:]
    for (key, at) in local.deleted ?? [:] {
        // `!deleted[key] || deleted[key] < at`: prázdný text je v JavaScriptu „není“.
        if let existing = deleted[key], !existing.isEmpty, existing >= at { continue }
        deleted[key] = at
    }
    func alive(_ key: String, _ changedAt: String?) -> Bool {
        guard let at = deleted[key], !at.isEmpty else { return true }
        guard let changedAt else { return false }
        return at < changedAt
    }
    func mergeList(_ prefix: String, _ mine: [CardEntry], _ theirs: [CardEntry]) -> [CardEntry] {
        var order: [String] = []
        var byKey: [String: CardEntry] = [:]
        for entry in theirs + mine {
            if byKey[entry.key] == nil { order.append(entry.key) }
            byKey[entry.key] = entry
        }
        return order.compactMap { byKey[$0] }.filter { alive("\(prefix):\($0.key)", $0.addedAt) }
    }
    var deckOrder: [String] = []
    var decks: [String: Deck] = [:]
    for deck in remote.decks + local.decks {
        if let other = decks[deck.id] {
            if other.updatedAt <= deck.updatedAt { decks[deck.id] = deck }
        } else {
            deckOrder.append(deck.id)
            decks[deck.id] = deck
        }
    }
    return Library(
        collection: mergeList("c", local.collection, remote.collection),
        wishlist: mergeList("w", local.wishlist, remote.wishlist),
        decks: deckOrder.compactMap { decks[$0] }.filter { alive("d:\($0.id)", $0.updatedAt) },
        deleted: deleted,
        // Neznámá pole z obou stran zůstanou, z tohoto zařízení mají přednost.
        extra: remote.extra.merging(local.extra) { _, mine in mine }
    )
}

/// Stejný obsah (bez ohledu na pořadí klíčů): není co nahrávat.
public func sameLibrary(_ lhs: Library, _ rhs: Library) -> Bool {
    normalizeLibrary(lhs.json) == normalizeLibrary(rhs.json)
}

/// `Date.parse` z JavaScriptu pro texty ISO 8601: milisekundy od roku 1970, `nil` místo NaN.
func parseDate(_ text: String) -> Double? {
    let withFraction = Date.ISO8601FormatStyle(includingFractionalSeconds: true)
    if let date = try? withFraction.parse(text) { return date.timeIntervalSince1970 * 1000 }
    if let date = try? Date.ISO8601FormatStyle().parse(text) { return date.timeIntervalSince1970 * 1000 }
    return nil
}
