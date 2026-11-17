import KartickyUI

/// Data obrazovek do doby, než je napojí knihovna (fáze 2 a 4).
/// Ladicí build ukazuje mock data, vydaný build prázdné obrazovky.
enum Sample {
    #if DEBUG
    static let collection = CardSummary.samples
    static let wishlist = CardSummary.wishlistSamples
    static let decks: [DeckSummary] = [
        DeckSummary(
            id: "atraxa", name: "Atraxa superfriends", format: "Commander", commander: CardSummary.samples[3],
            colors: [.white, .blue, .black, .green], cardCount: 98, targetCount: 100, missing: 4
        ),
        DeckSummary(
            id: "krenko", name: "Krenko gobliní", format: "Commander", commander: CardSummary.samples[7],
            colors: [.red], cardCount: 100, targetCount: 100, missing: 0
        ),
        DeckSummary(
            id: "izzet", name: "Izzet tempo", format: "Modern", commander: nil,
            colors: [.blue, .red], cardCount: 60, targetCount: 60, missing: 2
        )
    ]
    #else
    static let collection: [CardSummary] = []
    static let wishlist: [CardSummary] = []
    static let decks: [DeckSummary] = []
    #endif
}
