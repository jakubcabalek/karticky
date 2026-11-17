#if DEBUG
import Foundation
import KartickyCore

/// Ukázková knihovna pro náhledy, snapshoty a ladicí spuštění s `-KartickySampleLibrary`.
public extension Library {
    static var sample: Library {
        let added = "2026-11-10T12:00:00.000Z"
        func entry(_ card: CardSummary, target: Double? = nil) -> CardEntry {
            var prices: [String: JSONValue] = [:]
            if let price = card.price { prices[card.foil ? "eurFoil" : "eur"] = .number(price) }
            let printing = CardPrinting(json: [
                "id": .string(card.id), "oracleId": .string("oracle-\(card.id)"), "name": .string(card.name),
                "set": .string(card.setCode.lowercased()), "setName": .string(card.setCode),
                "collectorNumber": .string(card.collectorNumber), "lang": .string("en"), "rarity": .string("rare"),
                "typeLine": .string(card.typeLine), "manaCost": .string(card.manaCost),
                "colors": .array(card.colors.map { .string($0.rawValue) }), "prices": .object(prices)
            ])
            let finish: Finish = card.foil ? .foil : .nonfoil
            return CardEntry(
                key: entryKey(card.id, finish), card: printing, quantity: card.quantity, finish: finish,
                addedAt: added, targetPrice: target
            )
        }
        return Library(
            collection: CardSummary.samples.map { entry($0) },
            // Cílová cena je v mock datech `previousPrice`.
            wishlist: CardSummary.wishlistSamples.map { entry($0, target: $0.previousPrice) },
            deleted: [:], pricesUpdatedAt: "2026-11-17T08:00:00.000Z"
        )
    }
}
#endif
