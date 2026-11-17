import Foundation

// Datový model knihovny: stejný JSON jako typy v cardData.ts. Pravidla (docs/swiftui-plan.md, bod 4):
// neznámá pole přežijí načtení i uložení, chybějící pole zůstanou chybějící, nic nesmí spadnout.

/// Ceny jednoho printingu ze Scryfallu (EUR a USD, obyčejná a foil).
public struct CardPrices: Hashable, Sendable {
    public var eur: Double?
    public var eurFoil: Double?
    public var usd: Double?
    public var usdFoil: Double?

    public init(eur: Double? = nil, eurFoil: Double? = nil, usd: Double? = nil, usdFoil: Double? = nil) {
        self.eur = eur
        self.eurFoil = eurFoil
        self.usd = usd
        self.usdFoil = usdFoil
    }

    init(json: JSONValue?) {
        let object = json?.objectValue ?? [:]
        func number(_ key: String) -> Double? { object[key]?.numberValue.flatMap { $0.isFinite ? $0 : nil } }
        self.init(eur: number("eur"), eurFoil: number("eurFoil"), usd: number("usd"), usdFoil: number("usdFoil"))
    }

    var json: JSONValue {
        var object: [String: JSONValue] = [:]
        if let eur { object["eur"] = .number(eur) }
        if let eurFoil { object["eurFoil"] = .number(eurFoil) }
        if let usd { object["usd"] = .number(usd) }
        if let usdFoil { object["usdFoil"] = .number(usdFoil) }
        return .object(object)
    }
}

/// Jeden printing karty (edice a sběratelské číslo), `CardPrinting` v cardData.ts.
/// Drží celý JSON tak, jak přišel: uložená data od Expo aplikace nebo z účtu
/// nemusí mít všechna pole a nová pole z novějších verzí se nesmí ztratit.
public struct CardPrinting: Hashable, Sendable, Codable {
    public var json: [String: JSONValue]

    public init(json: [String: JSONValue]) {
        self.json = json
    }

    public init(from decoder: Decoder) throws {
        json = try [String: JSONValue](from: decoder)
    }

    public func encode(to encoder: Encoder) throws {
        try json.encode(to: encoder)
    }

    private func text(_ key: String) -> String? { json[key]?.stringValue }
    private func texts(_ key: String) -> [String]? { json[key]?.arrayValue?.compactMap(\.stringValue) }

    public var id: String { text("id") ?? "" }
    public var oracleId: String? { text("oracleId") }
    public var illustrationId: String? { text("illustrationId") }
    public var name: String { text("name") ?? "" }
    public var printedName: String? { text("printedName") }
    public var set: String { text("set") ?? "" }
    public var setName: String { text("setName") ?? "" }
    public var collectorNumber: String { text("collectorNumber") ?? "" }
    public var lang: String { text("lang") ?? "en" }
    public var rarity: String { text("rarity") ?? "" }
    public var typeLine: String { text("typeLine") ?? "" }
    public var manaCost: String { text("manaCost") ?? "" }
    public var oracleText: String? { text("oracleText") }
    public var keywords: [String] { texts("keywords") ?? [] }
    public var power: String? { text("power") }
    public var toughness: String? { text("toughness") }
    public var cmc: Double? { json["cmc"]?.numberValue }
    public var colors: [String] { texts("colors") ?? [] }
    public var colorIdentity: [String] { texts("colorIdentity") ?? [] }
    public var legalities: [String: String] { json["legalities"]?.objectValue?.compactMapValues(\.stringValue) ?? [:] }
    public var imageSmall: URL? { text("imageSmall").flatMap(URL.init(string:)) }
    public var imageNormal: URL? { text("imageNormal").flatMap(URL.init(string:)) }
    public var cardmarketURL: URL? { text("cardmarketUrl").flatMap(URL.init(string:)) }

    public var prices: CardPrices {
        get { CardPrices(json: json["prices"]) }
        set { json["prices"] = newValue.json }
    }

    /// Stejná karta v jakékoli edici: Oracle id, u starších záznamů bez něj anglické jméno.
    var identity: String { oracleId ?? name.lowercased() }
}

public enum Finish: String, Codable, CaseIterable, Sendable {
    case nonfoil, foil
}

/// Řádek ve sbírce, wishlistu nebo balíčku (`CardEntry` v cardData.ts).
public struct CardEntry: Hashable, Sendable, Identifiable {
    public var key: String
    public var card: CardPrinting
    public var quantity: Int
    public var finish: Finish
    /// V datech může chybět (starší záznamy); pak se nezapisuje.
    public var addedAt: String?
    /// Wishlist: upozornit, když karta stojí tolik nebo méně (EUR).
    public var targetPrice: Double?
    /// Pole, která tahle verze nezná.
    public var extra: [String: JSONValue]

    public var id: String { key }

    public init(
        key: String, card: CardPrinting, quantity: Int, finish: Finish, addedAt: String?,
        targetPrice: Double? = nil, extra: [String: JSONValue] = [:]
    ) {
        self.key = key
        self.card = card
        self.quantity = quantity
        self.finish = finish
        self.addedAt = addedAt
        self.targetPrice = targetPrice
        self.extra = extra
    }

    /// Jen platný záznam (`isEntry` v cardData.ts): klíč, kladný počet, foil/nonfoil, karta s id a jménem.
    public init?(json: JSONValue) {
        guard var object = json.objectValue,
              let key = object["key"]?.stringValue,
              let quantity = object["quantity"]?.numberValue, quantity > 0, quantity.isFinite,
              let finish = object["finish"]?.stringValue.flatMap(Finish.init(rawValue:)),
              let card = object["card"]?.objectValue,
              card["id"]?.stringValue != nil, card["name"]?.stringValue != nil
        else { return nil }
        for known in ["key", "quantity", "finish", "card"] { object[known] = nil }
        let addedAt = object["addedAt"]?.stringValue
        if addedAt != nil { object["addedAt"] = nil }
        let target = object["targetPrice"]?.numberValue
        if target != nil { object["targetPrice"] = nil }
        self.init(
            key: key, card: CardPrinting(json: card), quantity: Int(quantity), finish: finish,
            addedAt: addedAt, targetPrice: target, extra: object
        )
    }

    public var json: JSONValue {
        var object = extra
        object["key"] = .string(key)
        object["card"] = .object(card.json)
        object["quantity"] = .number(Double(quantity))
        object["finish"] = .string(finish.rawValue)
        if let addedAt { object["addedAt"] = .string(addedAt) }
        if let targetPrice { object["targetPrice"] = .number(targetPrice) }
        return .object(object)
    }
}

public enum DeckFormat: String, CaseIterable, Sendable {
    case commander, standard, pioneer, modern, legacy, vintage, pauper, casual

    public var label: String {
        switch self {
        case .commander: "Commander"
        case .standard: "Standard"
        case .pioneer: "Pioneer"
        case .modern: "Modern"
        case .legacy: "Legacy"
        case .vintage: "Vintage"
        case .pauper: "Pauper"
        case .casual: "Bez pravidel"
        }
    }
}

public enum DeckBoard: String, CaseIterable, Sendable {
    case commander, main, sideboard
}

/// Balíček (`Deck` v cardData.ts).
public struct Deck: Hashable, Sendable, Identifiable {
    public var id: String
    public var name: String
    /// Text formátu, jak je v datech (neznámý formát se nemaže); `deckFormat` je typovaný.
    public var format: String
    public var commander: [CardEntry]
    public var main: [CardEntry]
    public var sideboard: [CardEntry]
    public var createdAt: String
    public var updatedAt: String
    public var extra: [String: JSONValue]

    public init(
        id: String, name: String, format: String, commander: [CardEntry] = [], main: [CardEntry] = [],
        sideboard: [CardEntry] = [], createdAt: String, updatedAt: String, extra: [String: JSONValue] = [:]
    ) {
        self.id = id
        self.name = name
        self.format = format
        self.commander = commander
        self.main = main
        self.sideboard = sideboard
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.extra = extra
    }

    public var deckFormat: DeckFormat { DeckFormat(rawValue: format) ?? .casual }

    public subscript(board: DeckBoard) -> [CardEntry] {
        get {
            switch board {
            case .commander: commander
            case .main: main
            case .sideboard: sideboard
            }
        }
        set {
            switch board {
            case .commander: commander = newValue
            case .main: main = newValue
            case .sideboard: sideboard = newValue
            }
        }
    }

    /// Balíček z dat tak, jak je (bez oprav; ty dělá `normalizeLibrary`). Bez id nic.
    init?(json: JSONValue) {
        guard var object = json.objectValue, let id = object["id"]?.stringValue else { return nil }
        func entries(_ key: String) -> [CardEntry] { (object[key]?.arrayValue ?? []).compactMap(CardEntry.init(json:)) }
        func text(_ key: String, _ fallback: String) -> String { object[key]?.stringValue ?? fallback }
        self.init(
            id: id, name: text("name", "Balíček"), format: text("format", DeckFormat.casual.rawValue),
            commander: entries("commander"), main: entries("main"), sideboard: entries("sideboard"),
            createdAt: text("createdAt", ""), updatedAt: text("updatedAt", "")
        )
        for known in Self.knownKeys { object[known] = nil }
        extra = object
    }

    static let knownKeys = ["id", "name", "format", "commander", "main", "sideboard", "createdAt", "updatedAt"]

    public var json: JSONValue {
        var object = extra
        object["id"] = .string(id)
        object["name"] = .string(name)
        object["format"] = .string(format)
        object["commander"] = .array(commander.map(\.json))
        object["main"] = .array(main.map(\.json))
        object["sideboard"] = .array(sideboard.map(\.json))
        object["createdAt"] = .string(createdAt)
        object["updatedAt"] = .string(updatedAt)
        return .object(object)
    }
}

/// Celá knihovna (`Library` v cardData.ts): sbírka, wishlist, balíčky a co bylo smazáno.
public struct Library: Hashable, Sendable, Codable {
    public var collection: [CardEntry]
    public var wishlist: [CardEntry]
    public var decks: [Deck]
    /// Klíče „c:…“, „w:…“, „d:…“ → kdy se smazaly (synchronizace je nevrátí). `nil` = pole v datech není.
    public var deleted: [String: String]?
    /// Kdy se naposledy obnovily ceny ze Scryfallu.
    public var pricesUpdatedAt: String?
    public var extra: [String: JSONValue]

    public init(
        collection: [CardEntry] = [], wishlist: [CardEntry] = [], decks: [Deck] = [],
        deleted: [String: String]? = nil, pricesUpdatedAt: String? = nil, extra: [String: JSONValue] = [:]
    ) {
        self.collection = collection
        self.wishlist = wishlist
        self.decks = decks
        self.deleted = deleted
        self.pricesUpdatedAt = pricesUpdatedAt
        self.extra = extra
    }

    static let knownKeys = ["version", "collection", "wishlist", "decks", "deleted", "pricesUpdatedAt"]

    /// Knihovna z dat tak, jak je, bez oprav. Pro načtení uložených dat slouží `normalizeLibrary`.
    public init(json: JSONValue) {
        var object = json.objectValue ?? [:]
        func entries(_ key: String) -> [CardEntry] { (object[key]?.arrayValue ?? []).compactMap(CardEntry.init(json:)) }
        self.init(
            collection: entries("collection"), wishlist: entries("wishlist"),
            decks: (object["decks"]?.arrayValue ?? []).compactMap(Deck.init(json:)),
            deleted: object["deleted"]?.objectValue?.compactMapValues(\.stringValue),
            pricesUpdatedAt: object["pricesUpdatedAt"]?.stringValue
        )
        for known in Self.knownKeys { object[known] = nil }
        extra = object
    }

    public var json: JSONValue {
        var object = extra
        object["version"] = .number(1)
        object["collection"] = .array(collection.map(\.json))
        object["wishlist"] = .array(wishlist.map(\.json))
        object["decks"] = .array(decks.map(\.json))
        if let deleted { object["deleted"] = .object(deleted.mapValues(JSONValue.string)) }
        if let pricesUpdatedAt { object["pricesUpdatedAt"] = .string(pricesUpdatedAt) }
        return .object(object)
    }

    /// Načtení vždy přes `normalizeLibrary`: poškozená data nesmí shodit aplikaci.
    public init(from decoder: Decoder) throws {
        self = normalizeLibrary(try JSONValue(from: decoder))
    }

    public func encode(to encoder: Encoder) throws {
        try json.encode(to: encoder)
    }
}
