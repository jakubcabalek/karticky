import Foundation

/// Měna cen ze Scryfallu (`PriceCurrency` v cardData.ts).
public enum PriceCurrency: String, Codable, CaseIterable, Sendable {
    case eur, usd

    var symbol: String {
        switch self {
        case .eur: "€"
        case .usd: "US$"
        }
    }
}

/// Port `formatPrice` z cardData.ts: stejný výstup jako
/// `Intl.NumberFormat('cs-CZ', { style: 'currency' })`, tedy „1 234,57 €“ s pevnými mezerami.
/// Vlastní implementace, `FormatStyle` dává jiné mezery (docs/swiftui-plan.md, bod 5).
public func formatPrice(_ value: Double, _ currency: PriceCurrency) -> String {
    let space = "\u{00A0}"
    guard value.isFinite else { return (value.isNaN ? "NaN" : value < 0 ? "-∞" : "∞") + space + currency.symbol }
    // Intl zaokrouhluje přesnou hodnotu doublu na 2 místa, polovinu od nuly.
    // printf vypíše přesné desetinné cifry, takže stačí rozhodnout podle třetí cifry.
    let exact = String(format: "%.30f", abs(value))
    let parts = exact.split(separator: ".")
    let fraction = Array(parts.count > 1 ? parts[1] : "")
    var cents = (Int(parts[0]) ?? 0) * 100 + (Int(String(fraction.prefix(2))) ?? 0)
    if fraction.count > 2, let third = fraction[2].wholeNumberValue, third >= 5 { cents += 1 }

    let whole = String(cents / 100)
    var grouped = ""
    for (index, digit) in whole.enumerated() {
        if index > 0, (whole.count - index) % 3 == 0 { grouped += space }
        grouped.append(digit)
    }
    let decimals = String(format: "%02d", cents % 100)
    return (value < 0 ? "-" : "") + grouped + "," + decimals + space + currency.symbol
}
