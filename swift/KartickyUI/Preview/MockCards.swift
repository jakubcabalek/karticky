#if DEBUG
import Foundation
import KartickyCore

/// Mock data pro náhledy a snapshoty (bez sítě: obrázky jsou placeholdery).
public extension CardSummary {
    static let samples: [CardSummary] = [
        CardSummary(
            id: "sol-ring", name: "Sol Ring", manaCost: "{1}", colors: [], typeLine: "Artifact",
            setCode: "C21", collectorNumber: "263", quantity: 3, foil: true, price: 1.85, previousPrice: 2.1
        ),
        CardSummary(
            id: "lightning-bolt", name: "Lightning Bolt", manaCost: "{R}", colors: [.red], typeLine: "Instant",
            setCode: "M11", collectorNumber: "149", quantity: 4, price: 1.2
        ),
        CardSummary(
            id: "counterspell", name: "Counterspell", manaCost: "{U}{U}", colors: [.blue], typeLine: "Instant",
            setCode: "MH2", collectorNumber: "267", quantity: 2, price: 0.95
        ),
        CardSummary(
            id: "atraxa", name: "Atraxa, Praetors' Voice", manaCost: "{G}{W}{U}{B}",
            colors: [.white, .blue, .black, .green], typeLine: "Legendary Creature — Phyrexian Angel Horror",
            setCode: "C16", collectorNumber: "28", quantity: 1, foil: true, price: 24.9, previousPrice: 22
        ),
        CardSummary(
            id: "swords", name: "Swords to Plowshares", manaCost: "{W}", colors: [.white], typeLine: "Instant",
            setCode: "STA", collectorNumber: "10", quantity: 2, price: 2.4
        ),
        CardSummary(
            id: "cultivate", name: "Cultivate", manaCost: "{2}{G}", colors: [.green], typeLine: "Sorcery",
            setCode: "M21", collectorNumber: "177", quantity: 5, price: 0.3
        ),
        CardSummary(
            id: "demonic-tutor", name: "Demonic Tutor", manaCost: "{1}{B}", colors: [.black], typeLine: "Sorcery",
            setCode: "UMA", collectorNumber: "93", quantity: 1, price: 38.5, previousPrice: 41.2
        ),
        CardSummary(
            id: "dockside", name: "Dockside Extortionist", manaCost: "{1}{R}", colors: [.red],
            typeLine: "Creature — Goblin Pirate", setCode: "C19", collectorNumber: "24", quantity: 1, foil: true,
            price: 64
        ),
        CardSummary(
            id: "fact-or-fiction", name: "Fact or Fiction", manaCost: "{3}{U}", colors: [.blue], typeLine: "Instant",
            setCode: "INV", collectorNumber: "56", quantity: 1, price: 0.75
        )
    ]

    /// Wishlist: cílová cena je `previousPrice` (zlevnilo, když je cena pod ní).
    static let wishlistSamples: [CardSummary] = [
        CardSummary(
            id: "rhystic", name: "Rhystic Study", manaCost: "{2}{U}", colors: [.blue], typeLine: "Enchantment",
            setCode: "JMP", collectorNumber: "169", price: 34.2, previousPrice: 36
        ),
        CardSummary(
            id: "smothering", name: "Smothering Tithe", manaCost: "{3}{W}", colors: [.white], typeLine: "Enchantment",
            setCode: "RNA", collectorNumber: "22", price: 18.9, previousPrice: 15
        ),
        CardSummary(
            id: "cyclonic", name: "Cyclonic Rift", manaCost: "{1}{U}", colors: [.blue], typeLine: "Instant",
            setCode: "RTR", collectorNumber: "35", price: 27.5, previousPrice: 30
        ),
        CardSummary(
            id: "fierce", name: "Fierce Guardianship", manaCost: "{2}{U}", colors: [.blue], typeLine: "Instant",
            setCode: "C20", collectorNumber: "35", price: 41
        )
    ]
}
#endif
