import KartickyCore
import KartickyUI
import SwiftUI

/// Sbírka: počet a hodnota, filtry jako kapsle a mřížka karet z knihovny.
/// Hledání na Scryfallu přijde s A3, detail karty s A4.
struct CollectionScreen: View {
    @Environment(AppModel.self) private var model
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
                    if !model.library.collection.isEmpty {
                        summary
                        filters
                    }
                    if model.library.collection.isEmpty {
                        ContentUnavailableView(
                            "Zatím žádné karty", systemImage: "square.grid.3x3",
                            description: Text("Naskenuj nebo vyhledej první kartu.")
                        )
                        .padding(.top, 40)
                    } else if shown.isEmpty {
                        ContentUnavailableView(
                            "Nic neodpovídá", systemImage: "line.3.horizontal.decrease.circle",
                            description: Text("Zkus jiný filtr nebo hledaný text.")
                        )
                        .padding(.top, 40)
                    } else {
                        LazyVGrid(columns: columns, spacing: 16) {
                            ForEach(shown) { entry in
                                CardTile(card: CardSummary(entry: entry))
                                    .contextMenu { menu(for: entry) }
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
                text: $query, placement: .navigationBarDrawer(displayMode: .automatic), prompt: "Hledat ve sbírce i na Scryfallu"
            )
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Profil", systemImage: "person.crop.circle") {}
                }
            }
        }
    }

    @ViewBuilder private func menu(for entry: CardEntry) -> some View {
        Button("Přidat kus", systemImage: "plus") {
            model.setQuantity(entry.key, in: .collection, to: entry.quantity + 1)
        }
        Button("Odebrat kus", systemImage: "minus") {
            model.setQuantity(entry.key, in: .collection, to: entry.quantity - 1)
        }
        .disabled(entry.quantity <= 1)
        Button("Smazat ze sbírky", systemImage: "trash", role: .destructive) {
            model.remove(entry.key, from: .collection)
        }
    }

    private var summary: some View {
        let collection = model.library.collection
        let count = totalCards(collection)
        let value = listValue(collection, .eur)
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4)) : AnyLayout(HStackLayout(alignment: .firstTextBaseline))
        return layout {
            VStack(alignment: .leading, spacing: 2) {
                Text(cardCount(count))
                    .foregroundStyle(.secondary)
                if value.unpriced > 0 {
                    Text("\(value.unpriced) bez ceny")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
            if !typeSize.isAccessibilitySize { Spacer() }
            PriceText(value.total)
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

    private var shown: [CardEntry] {
        model.library.collection.filter { entry in
            let card = entry.card
            let matchesQuery = query.isEmpty || card.name.localizedStandardContains(query)
                || (card.printedName?.localizedStandardContains(query) ?? false)
            switch filter {
            case .all: return matchesQuery
            case .foil: return matchesQuery && entry.finish == .foil
            case .color(let color): return matchesQuery && card.colors.contains(color.rawValue)
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

/// „1 karta“, „3 karty“, „5 karet“.
func cardCount(_ count: Int) -> String {
    switch count {
    case 1: "1 karta"
    case 2...4: "\(count) karty"
    default: "\(count) karet"
    }
}

#if DEBUG
#Preview("Sbírka") { CollectionScreen().environment(AppModel.preview()) }
#Preview("Prázdná") { CollectionScreen().environment(AppModel.preview(.init())) }
#endif
