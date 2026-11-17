import Foundation
@testable import KartickyCore

/// Porty linky „knihovna“ (cardData.ts, scryfall.ts) pro test z fixture. `Fixtures.ports` je spojí
/// s porty druhé linky (PlayPorts.swift). Argumenty a výsledky jsou JSON jako v TypeScriptu.
enum LibraryPorts {
    /// „Teď“ z hlavičky cases.json: výchozí `now = new Date()` v TypeScriptu dá právě tohle.
    static let now = "2026-11-14T12:00:00.000Z"

    typealias Port = @Sendable ([JSONValue]) throws -> JSONValue

    static let all: [String: Port] = [
        "cardData.formatPrice": { args in
            .string(formatPrice(try number(args, 0), try currency(args, 1)))
        },
        "cardData.emptyLibrary": { _ in emptyLibrary().json },
        "cardData.addCard": { args in
            let options = arg(args, 2).objectValue ?? [:]
            let result = addCard(
                try entries(args, 0), try card(args, 1),
                quantity: Int((options["quantity"]?.numberValue ?? 1).rounded(.down)),
                finish: options["finish"]?.stringValue.flatMap(Finish.init(rawValue:)) ?? .nonfoil,
                now: options["now"]?.stringValue ?? now
            )
            return .array(result.map(\.json))
        },
        "cardData.setQuantity": { args in
            .array(setQuantity(try entries(args, 0), try string(args, 1), Int(try number(args, 2).rounded(.down))).map(\.json))
        },
        "cardData.totalCards": { args in .number(Double(totalCards(try entries(args, 0)))) },
        "cardData.listValue": { args in
            let value = listValue(try entries(args, 0), try currency(args, 1))
            return .object(["total": .number(value.total), "unpriced": .number(Double(value.unpriced))])
        },
        "cardData.createDeck": { args in
            let options = arg(args, 2).objectValue ?? [:]
            return createDeck(
                Library(json: arg(args, 0)), try string(args, 1),
                id: options["id"]?.stringValue ?? "", now: options["now"]?.stringValue ?? now,
                format: options["format"]?.stringValue.flatMap(DeckFormat.init(rawValue:)) ?? .commander
            ).json
        },
        "cardData.deckEntries": { args in .array(deckEntries(try deck(args, 0)).map(\.json)) },
        "cardData.deleteDeck": { args in deleteDeck(Library(json: arg(args, 0)), try string(args, 1)).json },
        "cardData.missingForDeck": { args in
            .array(missingForDeck(try deck(args, 0), try entries(args, 1)).map {
                .object(["card": .object($0.card.json), "missing": .number(Double($0.missing))])
            })
        },
        "cardData.wishMissingCards": { args in
            wishMissingCards(Library(json: arg(args, 0)), try string(args, 1), now: try string(args, 2)).json
        },
        "cardData.markWishAcquired": { args in
            markWishAcquired(Library(json: arg(args, 0)), try string(args, 1), now: try string(args, 2)).json
        },
        "cardData.normalizeLibrary": { args in normalizeLibrary(arg(args, 0)).json },
        "cardData.refreshCards": { args in
            let fresh = (arg(args, 1).arrayValue ?? []).compactMap { $0.objectValue.map(CardPrinting.init(json:)) }
            return refreshCards(Library(json: arg(args, 0)), fresh, now: try string(args, 2)).json
        },
        "cardData.libraryCardIds": { args in .array(libraryCardIds(Library(json: arg(args, 0))).map(JSONValue.string)) },
        "cardData.pricesAreStale": { args in .bool(pricesAreStale(Library(json: arg(args, 0)), now: try string(args, 1))) },
        "cardData.priceAlerts": { args in
            .array(priceAlerts(try entries(args, 0)).map { .object(["entry": $0.entry.json, "price": .number($0.price)]) })
        },
        "cardData.setTargetPrice": { args in
            .array(setTargetPrice(try entries(args, 0), try string(args, 1), arg(args, 2).numberValue).map(\.json))
        },
        "cardData.recordDeletions": { args in
            recordDeletions(Library(json: arg(args, 0)), Library(json: arg(args, 1)), now: try string(args, 2)).json
        },
        "cardData.mergeLibraries": { args in mergeLibraries(Library(json: arg(args, 0)), Library(json: arg(args, 1))).json },
        "cardData.sameLibrary": { args in .bool(sameLibrary(Library(json: arg(args, 0)), Library(json: arg(args, 1)))) },
        "scryfall.parseCard": { args in .object(parseCard(arg(args, 0)).json) },
        "scryfall.parseCollectorLine": { args in
            guard let line = parseCollectorLine(try string(args, 0)) else { return .null }
            var object: [String: JSONValue] = ["set": .string(line.set), "number": .string(line.number)]
            if let lang = line.lang { object["lang"] = .string(lang) }
            return .object(object)
        },
    ]

    // MARK: - Argumenty

    static func arg(_ args: [JSONValue], _ index: Int) -> JSONValue {
        index < args.count ? args[index] : .object(["$undefined": .bool(true)])
    }

    static func string(_ args: [JSONValue], _ index: Int) throws -> String {
        guard let value = arg(args, index).stringValue else { throw FixtureError.badArguments(args) }
        return value
    }

    static func number(_ args: [JSONValue], _ index: Int) throws -> Double {
        guard let value = arg(args, index).numberValue else { throw FixtureError.badArguments(args) }
        return value
    }

    static func currency(_ args: [JSONValue], _ index: Int) throws -> PriceCurrency {
        guard let value = PriceCurrency(rawValue: try string(args, index)) else { throw FixtureError.badArguments(args) }
        return value
    }

    static func card(_ args: [JSONValue], _ index: Int) throws -> CardPrinting {
        guard let object = arg(args, index).objectValue else { throw FixtureError.badArguments(args) }
        return CardPrinting(json: object)
    }

    static func entries(_ args: [JSONValue], _ index: Int) throws -> [CardEntry] {
        guard let array = arg(args, index).arrayValue else { throw FixtureError.badArguments(args) }
        let result = array.compactMap(CardEntry.init(json:))
        guard result.count == array.count else { throw FixtureError.badArguments(args) }
        return result
    }

    static func deck(_ args: [JSONValue], _ index: Int) throws -> Deck {
        guard let deck = Deck(json: arg(args, index)) else { throw FixtureError.badArguments(args) }
        return deck
    }
}
