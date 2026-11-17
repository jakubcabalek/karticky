import SwiftUI

/// Jeden symbol many z textu ceny ve formátu Scryfallu („{2}{U}{U}“, „{W/U}“, „{X}“).
public enum ManaSymbol: Hashable, Sendable {
    case color(ManaColor)
    case hybrid(ManaColor, ManaColor)
    /// Obecná mana a vše ostatní (X, phyrexian, sníh …): bezbarvé kolečko s textem.
    case generic(String)

    /// Rozdělí cenu na symboly. Text mimo složené závorky se ignoruje.
    public static func parse(_ cost: String) -> [ManaSymbol] {
        var symbols: [ManaSymbol] = []
        var rest = Substring(cost)
        while let open = rest.firstIndex(of: "{"), let close = rest[open...].firstIndex(of: "}") {
            let inner = String(rest[rest.index(after: open)..<close]).uppercased()
            rest = rest[rest.index(after: close)...]
            let parts = inner.split(separator: "/").map(String.init)
            if parts.count == 2, let first = ManaColor(rawValue: parts[0]), let second = ManaColor(rawValue: parts[1]),
               first != .colorless, second != .colorless {
                symbols.append(.hybrid(first, second))
            } else if parts.count == 1, let color = ManaColor(rawValue: inner), color != .colorless {
                symbols.append(.color(color))
            } else if parts.count == 2, parts[1] == "P", let color = ManaColor(rawValue: parts[0]) {
                symbols.append(.color(color))
            } else {
                symbols.append(.generic(inner == "C" ? "◇" : inner))
            }
        }
        return symbols
    }
}

/// Mana jako naše jednoduchá kolečka (žádné kopie symbolů Magicu, docs/swiftui-design.md).
public struct ManaDots: View {
    private let symbols: [ManaSymbol]
    private let baseSize: CGFloat
    @ScaledMetric(relativeTo: .body) private var scale: CGFloat = 1
    private var size: CGFloat { baseSize * scale }
    private var spacing: CGFloat { size / 6 }

    /// Cena ve formátu Scryfallu, např. „{2}{U}{U}“.
    public init(cost: String, size: CGFloat = 18) {
        symbols = ManaSymbol.parse(cost)
        baseSize = size
    }

    /// Barevná identita (balíček, filtr).
    public init(colors: [ManaColor], size: CGFloat = 18) {
        symbols = colors.isEmpty ? [.color(.colorless)] : colors.map { .color($0) }
        baseSize = size
    }

    public var body: some View {
        HStack(spacing: spacing) {
            ForEach(Array(symbols.enumerated()), id: \.offset) { _, symbol in
                dot(symbol)
            }
        }
        .accessibilityElement()
        .accessibilityLabel(accessibilityText)
    }

    @ViewBuilder private func dot(_ symbol: ManaSymbol) -> some View {
        switch symbol {
        case .color(let color):
            Circle().fill(color.color).overlay(rim).frame(width: size, height: size)
        case .hybrid(let first, let second):
            Circle()
                .fill(LinearGradient(stops: [
                    .init(color: first.color, location: 0.5), .init(color: second.color, location: 0.5)
                ], startPoint: .topLeading, endPoint: .bottomTrailing))
                .overlay(rim)
                .frame(width: size, height: size)
        case .generic(let text):
            Circle().fill(ManaColor.colorless.color).overlay(rim)
                .overlay {
                    Text(text)
                        .font(.system(size: size * 0.62, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(Color(hex: 0x2A251E))
                        .minimumScaleFactor(0.5)
                        .padding(size * 0.08)
                }
                .frame(width: size, height: size)
        }
    }

    private var rim: some View {
        Circle().strokeBorder(.black.opacity(0.25), lineWidth: 0.5)
    }

    private var accessibilityText: String {
        symbols.map { symbol in
            switch symbol {
            case .color(let color): color.czechName
            case .hybrid(let first, let second): "\(first.czechName) nebo \(second.czechName)"
            case .generic(let text): text
            }
        }
        .joined(separator: ", ")
    }
}

public extension ManaColor {
    var czechName: String {
        switch self {
        case .white: "bílá"
        case .blue: "modrá"
        case .black: "černá"
        case .red: "červená"
        case .green: "zelená"
        case .colorless: "bezbarvá"
        }
    }
}

#Preview("ManaDots") {
    VStack(alignment: .leading, spacing: 12) {
        ManaDots(cost: "{2}{U}{U}")
        ManaDots(cost: "{X}{R}{G}{W/U}{B/P}{C}")
        ManaDots(colors: [.white, .blue, .black, .red, .green])
        ManaDots(colors: [])
    }
    .padding()
}
