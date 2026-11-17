import KartickyCore
import SwiftUI

/// Cena karty: jantarová, s pevnými číslicemi; když karta zlevnila nebo zdražila,
/// malá šipka s rozdílem. Formát stejný jako `formatPrice` v TypeScriptu.
public struct PriceText: View {
    private let value: Double?
    private let previous: Double?
    private let currency: PriceCurrency
    private let showsChange: Bool

    public init(_ value: Double?, currency: PriceCurrency = .eur, previous: Double? = nil, showsChange: Bool = true) {
        self.value = value
        self.previous = previous
        self.currency = currency
        self.showsChange = showsChange
    }

    public var body: some View {
        HStack(spacing: 4) {
            Text(value.map { formatPrice($0, currency) } ?? "–")
                .foregroundStyle(value == nil ? AnyShapeStyle(.secondary) : AnyShapeStyle(Color.kartickyAccent))
                .fontWeight(.semibold)
                .lineLimit(1)
                .fixedSize()
            if showsChange, let change {
                Label(formatPrice(abs(change), currency), systemImage: change < 0 ? "arrow.down" : "arrow.up")
                    .labelStyle(.titleAndIcon)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(change < 0 ? Color.kartickyPositive : .secondary)
                    .lineLimit(1)
                    .fixedSize()
            }
        }
        .monospacedDigit()
        .accessibilityElement(children: .combine)
    }

    private var change: Double? {
        guard let value, let previous else { return nil }
        let difference = value - previous
        return abs(difference) >= 0.005 ? difference : nil
    }
}

#Preview("PriceText") {
    VStack(alignment: .leading, spacing: 8) {
        PriceText(1234.5)
        PriceText(8.4, previous: 10)
        PriceText(12, currency: .usd, previous: 9.99)
        PriceText(nil)
    }
    .padding()
}
