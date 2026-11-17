import KartickyCore
import KartickyUI
import SwiftUI

/// Sbírka: hodnota, filtry jako kapsle a mřížka karet. Fáze 1 jen s mock daty,
/// knihovna a hledání na Scryfallu přijdou ve fázi 2.
struct CollectionScreen: View {
    var cards: [CardSummary] = Sample.collection
    @State private var query = ""
    @State private var filter: CollectionFilter = .all
    @Environment(\.dynamicTypeSize) private var typeSize

    /// Tři sloupce, při velkém písmu dva (ať jde přečíst název a cena).
    private var columns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 12, alignment: .top), count: typeSize.isAccessibilitySize ? 2 : 3)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    summary
                    filters
                    if shown.isEmpty {
                        ContentUnavailableView(
                            "Zatím žádné karty", systemImage: "square.grid.3x3",
                            description: Text("Naskenuj kartu nebo ji vyhledej.")
                        )
                        .padding(.top, 40)
                    } else {
                        LazyVGrid(columns: columns, spacing: 16) {
                            ForEach(shown) { card in
                                CardTile(card: card)
                            }
                        }
                    }
                    Text("Data o kartách: Scryfall")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 8)
                }
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
            .navigationTitle("Sbírka")
            .searchable(
                text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Hledat ve sbírce i na Scryfallu"
            )
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Profil", systemImage: "person.crop.circle") {}
                }
            }
        }
    }

    private var summary: some View {
        let count = cards.reduce(0) { $0 + $1.quantity }
        let value = cards.reduce(0.0) { $0 + ($1.price ?? 0) * Double($1.quantity) }
        let previous = cards.reduce(0.0) { $0 + ($1.previousPrice ?? $1.price ?? 0) * Double($1.quantity) }
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4)) : AnyLayout(HStackLayout(alignment: .firstTextBaseline))
        return layout {
            Text("\(count) karet")
                .foregroundStyle(.secondary)
            if !typeSize.isAccessibilitySize { Spacer() }
            PriceText(value, previous: previous)
                .font(.title3)
        }
    }

    private var filters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(CollectionFilter.allCases, id: \.self) { item in
                    Button {
                        filter = item
                    } label: {
                        HStack(spacing: 6) {
                            if case .color(let color) = item {
                                ManaDots(colors: [color], size: 12)
                            }
                            Text(item.title)
                        }
                        .font(.subheadline.weight(.medium))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(
                            Capsule().fill(filter == item ? AnyShapeStyle(Color.kartickyAccent.opacity(0.25))
                                : AnyShapeStyle(.fill.tertiary))
                        )
                        .foregroundStyle(filter == item ? Color.kartickyAccent : .primary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(filter == item ? .isSelected : [])
                }
            }
        }
        .scrollClipDisabled()
    }

    private var shown: [CardSummary] {
        cards.filter { card in
            let matchesQuery = query.isEmpty || card.name.localizedStandardContains(query)
            switch filter {
            case .all: return matchesQuery
            case .foil: return matchesQuery && card.foil
            case .color(let color): return matchesQuery && card.colors.contains(color)
            }
        }
    }
}

enum CollectionFilter: Hashable, CaseIterable {
    case all, foil, color(ManaColor)

    static let allCases: [CollectionFilter] = [.all, .foil] + [ManaColor.white, .blue, .black, .red, .green].map { .color($0) }

    var title: String {
        switch self {
        case .all: "Vše"
        case .foil: "Foil"
        case .color(let color): color.czechName.capitalized
        }
    }
}

/// Karta v mřížce: obrázek (fólie se leskne), název, počet × edice, cena.
struct CardTile: View {
    let card: CardSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            CardImage(card)
                .foilShine(card.foil)
                .shadow(color: .black.opacity(0.25), radius: 4, y: 2)
            Text(card.name)
                .font(.caption.weight(.semibold))
                .lineLimit(1)
            Text("\(card.quantity)× · \(card.setCode)\(card.foil ? " · foil" : "")")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            PriceText(card.price, currency: card.currency, showsChange: false)
                .font(.caption)
        }
        .accessibilityElement(children: .combine)
    }
}

#Preview { CollectionScreen() }
