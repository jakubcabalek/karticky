import KartickyCore
import KartickyUI
import SwiftUI

/// Wishlist s hlídáním ceny: nahoře karty, které stojí cílovou cenu nebo méně (`priceAlerts`).
/// Swipe doleva smaže, doprava „Mám ji“ (přesun do sbírky), ťuknutí nastaví cílovou cenu.
struct WishlistScreen: View {
    @Environment(AppModel.self) private var model
    @State private var editing: CardEntry?
    @State private var targetText = ""

    var body: some View {
        let wishlist = model.library.wishlist
        let alerts = Set(priceAlerts(wishlist).map(\.entry.key))
        NavigationStack {
            List {
                if !alerts.isEmpty {
                    Section("Zlevnilo") {
                        ForEach(wishlist.filter { alerts.contains($0.key) }) { row($0, dropped: true) }
                    }
                }
                Section(alerts.isEmpty ? "" : "Ostatní") {
                    ForEach(wishlist.filter { !alerts.contains($0.key) }) { row($0, dropped: false) }
                }
            }
            .overlay {
                if wishlist.isEmpty {
                    ContentUnavailableView(
                        "Wishlist je prázdný", systemImage: "star",
                        description: Text("Karty, které chceš, tady hlídají cenu.")
                    )
                }
            }
            .navigationTitle("Wishlist")
            .alert("Cílová cena", isPresented: isEditing, presenting: editing) { entry in
                TextField("např. 12,50", text: $targetText)
                    .keyboardType(.decimalPad)
                Button("Uložit") { model.setTargetPrice(entry.key, to: parsePrice(targetText)) }
                if entry.targetPrice != nil {
                    Button("Nehlídat", role: .destructive) { model.setTargetPrice(entry.key, to: nil) }
                }
                Button("Zrušit", role: .cancel) {}
            } message: { entry in
                Text("Dáme vědět, až \(entry.card.name) bude stát tolik nebo méně (EUR).")
            }
        }
    }

    private func row(_ entry: CardEntry, dropped: Bool) -> some View {
        Button {
            targetText = entry.targetPrice.map { formatNumber($0) } ?? ""
            editing = entry
        } label: {
            WishlistRow(entry: entry, dropped: dropped)
        }
        .buttonStyle(.plain)
        .swipeActions(edge: .trailing) {
            Button("Smazat", systemImage: "trash", role: .destructive) { model.remove(entry.key, from: .wishlist) }
        }
        .swipeActions(edge: .leading) {
            Button("Mám ji", systemImage: "checkmark") { model.markAcquired(entry.key) }
                .tint(Color.kartickyPositive)
        }
    }

    private var isEditing: Binding<Bool> {
        Binding { editing != nil } set: { if !$0 { editing = nil } }
    }
}

/// „12,5“ i „12.50 €“ → 12.5; prázdné nebo nesmyslné → nil (cena se nehlídá).
func parsePrice(_ text: String) -> Double? {
    let cleaned = text.replacingOccurrences(of: ",", with: ".")
        .filter { $0.isNumber || $0 == "." }
    guard let value = Double(cleaned), value > 0 else { return nil }
    return value
}

/// 12.5 → „12,50“ do pole pro úpravu.
func formatNumber(_ value: Double) -> String {
    String(format: "%.2f", value).replacingOccurrences(of: ".", with: ",")
}

struct WishlistRow: View {
    let entry: CardEntry
    var dropped = false
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        let card = CardSummary(entry: entry)
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
                        if entry.quantity > 1 {
                            Text("\(entry.quantity)×").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            if !typeSize.isAccessibilitySize { Spacer(minLength: 8) }
            VStack(alignment: typeSize.isAccessibilitySize ? .leading : .trailing, spacing: 2) {
                PriceText(card.price, currency: card.currency, showsChange: false)
                if let target = entry.targetPrice {
                    HStack(spacing: 3) {
                        Image(systemName: dropped ? "arrow.down" : "bell")
                        Text("cíl \(formatPrice(target, .eur))")
                    }
                        .font(.caption2)
                        .foregroundStyle(dropped ? Color.kartickyPositive : .secondary)
                        .monospacedDigit()
                }
            }
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

#if DEBUG
#Preview("Wishlist") { WishlistScreen().environment(AppModel.preview()) }
#Preview("Prázdný") { WishlistScreen().environment(AppModel.preview(.init())) }
#endif
