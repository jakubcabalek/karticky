import Foundation

// Port čisté části scryfall.ts: převod karty ze Scryfallu a čtení řádku se sběratelským číslem.
// Síť (hledání, /cards/collection …) je v aplikaci, `Services/Scryfall`.

/// Karta ze Scryfallu → náš printing. Oboustranné karty berou obrázek z přední strany.
public func parseCard(_ raw: JSONValue) -> CardPrinting {
    let card = raw.objectValue ?? [:]
    let faces = (card["card_faces"]?.arrayValue ?? []).map { $0.objectValue ?? [:] }
    let front = faces.first ?? [:]
    func text(_ value: JSONValue?) -> String { value?.stringValue ?? "" }
    func nonEmpty(_ values: String...) -> String? { values.first { !$0.isEmpty } }
    /// `value ?? fallback` z JavaScriptu: jen chybějící nebo null.
    func present(_ value: JSONValue?, else fallback: JSONValue?) -> JSONValue? {
        if let value, value != .null { return value }
        return fallback
    }
    func strings(_ value: JSONValue?) -> JSONValue? {
        guard let array = value?.arrayValue else { return nil }
        return .array(array.filter { $0.stringValue != nil })
    }
    /// `Number(text)` z JavaScriptu pro ceny („0.25“); co není konečné číslo, chybí.
    func price(_ value: JSONValue?) -> Double? {
        guard let raw = value?.stringValue else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return 0 }
        guard let number = Double(trimmed), number.isFinite else { return nil }
        return number
    }

    let images = present(card["image_uris"], else: front["image_uris"])?.objectValue ?? [:]
    let prices = card["prices"]?.objectValue ?? [:]
    let oracleText = nonEmpty(
        text(card["oracle_text"]),
        faces.map { text($0["oracle_text"]) }.filter { !$0.isEmpty }.joined(separator: "\n//\n")
    )
    let legalities = card["legalities"]?.objectValue ?? [:]

    var json: [String: JSONValue] = [
        "id": .string(text(card["id"])),
        "name": .string(text(card["name"])),
        "set": .string(text(card["set"])),
        "setName": .string(text(card["set_name"])),
        "collectorNumber": .string(text(card["collector_number"])),
        "lang": .string(nonEmpty(text(card["lang"])) ?? "en"),
        "rarity": .string(text(card["rarity"])),
        "typeLine": .string(nonEmpty(text(card["type_line"]), text(front["type_line"])) ?? ""),
        "manaCost": .string(nonEmpty(text(card["mana_cost"]), text(front["mana_cost"])) ?? ""),
        "prices": CardPrices(
            eur: price(prices["eur"]), eurFoil: price(prices["eur_foil"]),
            usd: price(prices["usd"]), usdFoil: price(prices["usd_foil"])
        ).json,
    ]
    let optional: [String: String?] = [
        "oracleId": nonEmpty(text(card["oracle_id"]), text(front["oracle_id"])),
        "illustrationId": nonEmpty(text(card["illustration_id"]), text(front["illustration_id"])),
        "printedName": nonEmpty(text(card["printed_name"])),
        "oracleText": oracleText,
        "power": nonEmpty(text(card["power"]), text(front["power"])),
        "toughness": nonEmpty(text(card["toughness"]), text(front["toughness"])),
        "imageSmall": nonEmpty(text(images["small"])),
        "imageNormal": nonEmpty(text(images["normal"])),
        "cardmarketUrl": nonEmpty(text(card["purchase_uris"]?.objectValue?["cardmarket"])),
    ]
    for case let (key, value?) in optional { json[key] = .string(value) }
    if let keywords = strings(card["keywords"]) { json["keywords"] = keywords }
    if case .number(let cmc)? = card["cmc"] { json["cmc"] = .number(cmc) }
    if let colors = strings(present(card["colors"], else: front["colors"])) { json["colors"] = colors }
    if let identity = strings(card["color_identity"]) { json["colorIdentity"] = identity }
    if !legalities.isEmpty { json["legalities"] = .object(legalities.filter { $0.value.stringValue != nil }) }
    return CardPrinting(json: json)
}

/// Co se dá přečíst z řádku vlevo dole na kartě od roku 2020 („0123 R“ nad „MH3 • JP“).
public struct CollectorLine: Hashable, Sendable {
    public var set: String
    public var number: String
    /// Kód jazyka Scryfallu; `nil`, když značka jazyka není známá.
    public var lang: String?

    public init(set: String, number: String, lang: String? = nil) {
        self.set = set
        self.number = number
        self.lang = lang
    }
}

/// Značky jazyka vedle kódu edice → kódy jazyků Scryfallu.
private let printedLanguages: [String: String] = [
    "EN": "en", "DE": "de", "FR": "fr", "IT": "it", "ES": "es", "SP": "es", "PT": "pt", "JP": "ja", "JA": "ja",
    "KO": "ko", "KR": "ko", "RU": "ru", "CS": "zhs", "ZHS": "zhs", "CT": "zht", "ZHT": "zht", "PH": "ph",
]

// Regulární výrazy stejné jako v scryfall.ts (\d jen ASCII číslice jako v JavaScriptu).
nonisolated(unsafe) private let numberPattern = /^([0-9]{1,4}[A-Z]?)(?:\/[0-9]{1,4})?\s+[CURMSLTP]\b/
nonisolated(unsafe) private let setPattern = /^([A-Z0-9]{3,5})\s*[•·*.\-]\s*([A-Z]{2,3})\b/

/// Edice, sběratelské číslo a jazyk z textu OCR, nebo `nil`.
public func parseCollectorLine(_ ocrText: String) -> CollectorLine? {
    let lines = ocrText.uppercased()
        .split(omittingEmptySubsequences: false, whereSeparator: { $0 == "\n" || $0 == "\r\n" })
        .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
    for index in lines.indices {
        guard let number = lines[index].firstMatch(of: numberPattern),
              index + 1 < lines.count,
              let set = lines[index + 1].firstMatch(of: setPattern)
        else { continue }
        var digits = String(number.1)
        while digits.count > 1, digits.first == "0", digits.dropFirst().first?.isNumber == true { digits.removeFirst() }
        return CollectorLine(set: set.1.lowercased(), number: digits.lowercased(), lang: printedLanguages[String(set.2)])
    }
    return nil
}
