import KartickyUI

/// Balíčky do doby, než je napojí linka Codexu (B5). Sbírka a Wishlist už berou data z knihovny.
enum Sample {
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
}
