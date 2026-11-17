import KartickyCore
import KartickyUI
import SwiftUI

/// Wishlist s cílovou cenou. Fáze 2 doplní hlídání cen z knihovny.
struct WishlistScreen: View {
    var cards: [CardSummary] = Sample.wishlist

    var body: some View {
        NavigationStack {
            List {
                if !dropped.isEmpty {
                    Section("Zlevnilo") {
                        ForEach(dropped) { WishlistRow(card: $0) }
                    }
                }
                Section(dropped.isEmpty ? "" : "Ostatní") {
                    ForEach(rest) { WishlistRow(card: $0) }
                }
            }
            .overlay {
                if cards.isEmpty {
                    ContentUnavailableView(
                        "Wishlist je prázdný", systemImage: "star",
                        description: Text("Karty, které chceš, tady hlídají cenu.")
                    )
                }
            }
            .navigationTitle("Wishlist")
        }
    }

    /// Cílová cena je zatím `previousPrice` z mock dat.
    private var dropped: [CardSummary] {
        cards.filter { card in
            guard let price = card.price, let target = card.previousPrice else { return false }
            return price <= target
        }
    }

    private var rest: [CardSummary] {
        cards.filter { !dropped.contains($0) }
    }
}

struct WishlistRow: View {
    let card: CardSummary
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        // Při velkém písmu pod sebou, ať se název ani cena nelámou po písmenech.
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8)) : AnyLayout(HStackLayout(spacing: 12))
        layout {
            HStack(spacing: 12) {
                CardImage(card).frame(width: 44)
                VStack(alignment: .leading, spacing: 3) {
                    Text(card.name).font(.body.weight(.medium)).lineLimit(typeSize.isAccessibilitySize ? 3 : 1)
                    HStack(spacing: 6) {
                        ManaDots(cost: card.manaCost, size: 13)
                        Text(card.setCode).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
            if !typeSize.isAccessibilitySize { Spacer(minLength: 8) }
            VStack(alignment: typeSize.isAccessibilitySize ? .leading : .trailing, spacing: 2) {
                PriceText(card.price, currency: card.currency, showsChange: false)
                if let target = card.previousPrice {
                    Text("cíl \(formatPriceText(target))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    private func formatPriceText(_ value: Double) -> String {
        formatPrice(value, card.currency)
    }
}

#Preview { WishlistScreen() }
