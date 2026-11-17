import KartickyUI
import SwiftUI

/// Balíček v seznamu. Fáze 4 ho naplní z knihovny.
struct DeckSummary: Identifiable, Hashable {
    let id: String
    let name: String
    let format: String
    let commander: CardSummary?
    let colors: [ManaColor]
    let cardCount: Int
    let targetCount: Int
    let missing: Int
}

struct DecksScreen: View {
    var decks: [DeckSummary] = Sample.decks

    var body: some View {
        NavigationStack {
            List {
                ForEach(decks) { deck in
                    DeckRow(deck: deck)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color(.secondarySystemGroupedBackground))
                }
            }
            .listStyle(.insetGrouped)
            .listRowSpacing(12)
            .overlay {
                if decks.isEmpty {
                    ContentUnavailableView(
                        "Žádné balíčky", systemImage: "rectangle.stack",
                        description: Text("Založ balíček nebo vlož seznam karet.")
                    )
                }
            }
            .navigationTitle("Balíčky")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Nový balíček", systemImage: "plus") {}
                }
            }
        }
    }
}

struct DeckRow: View {
    let deck: DeckSummary

    var body: some View {
        HStack(spacing: 14) {
            if let commander = deck.commander {
                CardImage(commander).frame(width: 56)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(deck.name).font(.headline)
                HStack(spacing: 6) {
                    ManaDots(colors: deck.colors, size: 14)
                    Text(deck.format).font(.subheadline).foregroundStyle(.secondary)
                }
                HStack(spacing: 8) {
                    Text("\(deck.cardCount)/\(deck.targetCount) karet")
                    if deck.missing > 0 {
                        HStack(spacing: 3) {
                            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Color.kartickyWarning)
                            Text("chybí \(deck.missing)")
                        }
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                .monospacedDigit()
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(alignment: .top) {
            ColorIdentityGradient(deck.colors)
                .opacity(0.45)
        }
        .accessibilityElement(children: .combine)
    }
}

#Preview { DecksScreen() }
