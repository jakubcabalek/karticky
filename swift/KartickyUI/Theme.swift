import SwiftUI

// Barvy Swift aplikace: nativní iOS, akcent jantarový, barvy many pro kolečka,
// grafy a přechody. Popis vzhledu: docs/swiftui-design.md.

public extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }

    /// Tint aplikace, hlavní tlačítka, ceny, tlačítko Skenovat.
    static let kartickyAccent = Color(hex: 0xE8973A)
    static let kartickyPositive = Color(hex: 0x6FCF8E)
    static let kartickyWarning = Color(hex: 0xF2C14E)
}

/// Barva many podle písmena ze Scryfallu (W, U, B, R, G, C).
public enum ManaColor: String, CaseIterable, Sendable {
    case white = "W", blue = "U", black = "B", red = "R", green = "G", colorless = "C"

    public var color: Color {
        switch self {
        case .white: Color(hex: 0xF4EBCF)
        case .blue: Color(hex: 0x5C9BD1)
        case .black: Color(hex: 0x4A3F4F)
        case .red: Color(hex: 0xE0663A)
        case .green: Color(hex: 0x5E9B4C)
        case .colorless: Color(hex: 0xB8AE9C)
        }
    }

    /// Přechod panelu hráče v Životech (světlá → tmavá).
    public var lifeGradient: [Color] {
        switch self {
        case .white: [Color(hex: 0xF6EDD2), Color(hex: 0xB59E6E), Color(hex: 0x5C4B2C)]
        case .blue: [Color(hex: 0x6FAEDD), Color(hex: 0x2D5778), Color(hex: 0x16324A)]
        case .black: [Color(hex: 0x7D6E8A), Color(hex: 0x3A3142), Color(hex: 0x1A151E)]
        case .red: [Color(hex: 0xF49A5C), Color(hex: 0xB2431F), Color(hex: 0x5A1C0C)]
        case .green: [Color(hex: 0x9CC870), Color(hex: 0x3F6328), Color(hex: 0x1F3514)]
        case .colorless: [Color(hex: 0xE2DACB), Color(hex: 0x857A6A), Color(hex: 0x3A342C)]
        }
    }

    /// Barvy many v pořadí WUBRG, neznámé a duplicitní vynechané.
    public static func from(_ letters: [String]) -> [ManaColor] {
        let set = Set(letters)
        return [.white, .blue, .black, .red, .green].filter { set.contains($0.rawValue) }
    }
}
