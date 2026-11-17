import SwiftUI

// Barvy karetních rámů a pergamenu. Hodnoty jsou z theme.ts (Expo verze);
// popis vzhledu a komponent je v docs/swiftui-design.md.

public enum FrameColor: String, CaseIterable, Sendable {
    case white = "W", blue = "U", black = "B", red = "R", green = "G", multicolor = "M", colorless = "C"
}

public struct FramePalette: Sendable {
    public let base: Color
    public let light: Color
    public let dark: Color
    public let bar: Color
    public let barEdge: Color
    public let ink: Color
    public let text: Color
    public let glow: Color
}

public extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

public extension FrameColor {
    // swiftlint:disable:next function_body_length
    var palette: FramePalette {
        switch self {
        case .white:
            FramePalette(base: Color(hex: 0xC2AE84), light: Color(hex: 0xE4D8BC), dark: Color(hex: 0x8A7552), bar: Color(hex: 0xF3EBD6),
                         barEdge: Color(hex: 0x7C6744), ink: Color(hex: 0x2B2014), text: Color(hex: 0x2B2014), glow: Color(hex: 0xFFF4D6))
        case .blue:
            FramePalette(base: Color(hex: 0x3E6681), light: Color(hex: 0x6E97B3), dark: Color(hex: 0x24394A), bar: Color(hex: 0xD6E5EE),
                         barEdge: Color(hex: 0x1E3240), ink: Color(hex: 0x14222C), text: Color(hex: 0xEEF3F5), glow: Color(hex: 0xBFD9EA))
        case .black:
            FramePalette(base: Color(hex: 0x352C25), light: Color(hex: 0x5B4E44), dark: Color(hex: 0x1A1512), bar: Color(hex: 0xD8CCBA),
                         barEdge: Color(hex: 0x0E0B09), ink: Color(hex: 0x1A1410), text: Color(hex: 0xECE5DA), glow: Color(hex: 0x9C8C78))
        case .red:
            FramePalette(base: Color(hex: 0xA2482A), light: Color(hex: 0xD07A4C), dark: Color(hex: 0x5E2412), bar: Color(hex: 0xF3D8C4),
                         barEdge: Color(hex: 0x4A1A0A), ink: Color(hex: 0x2A1208), text: Color(hex: 0xF8EDE4), glow: Color(hex: 0xF2B48A))
        case .green:
            FramePalette(base: Color(hex: 0x5A7136), light: Color(hex: 0x87A05A), dark: Color(hex: 0x2E3A1A), bar: Color(hex: 0xE2E9C9),
                         barEdge: Color(hex: 0x1E2610), ink: Color(hex: 0x1A2010), text: Color(hex: 0xF1F4E6), glow: Color(hex: 0xC9DB9C))
        case .multicolor:
            FramePalette(base: Color(hex: 0xB98D40), light: Color(hex: 0xE2BE72), dark: Color(hex: 0x7A5823), bar: Color(hex: 0xF5E6BF),
                         barEdge: Color(hex: 0x5A3F14), ink: Color(hex: 0x2B1D0C), text: Color(hex: 0x2B1D0C), glow: Color(hex: 0xFFE6A8))
        case .colorless:
            FramePalette(base: Color(hex: 0x857A6A), light: Color(hex: 0xB6AC9C), dark: Color(hex: 0x4F473C), bar: Color(hex: 0xE8E2D6),
                         barEdge: Color(hex: 0x2E2922), ink: Color(hex: 0x211C16), text: Color(hex: 0xF3EFE8), glow: Color(hex: 0xE3DACA))
        }
    }

    /// Barva rámu podle barev karty nebo commandera: žádná = bezbarvá, víc = zlatá.
    static func forColors(_ colors: [String]) -> FrameColor {
        let unique = Set(colors.compactMap(FrameColor.init(rawValue:)).filter { $0 != .multicolor && $0 != .colorless })
        if unique.isEmpty { return .colorless }
        if unique.count > 1 { return .multicolor }
        return unique.first ?? .colorless
    }
}

public enum Ink {
    public static let table = Color(hex: 0x0B0806)
    public static let parchment = Color(hex: 0xEFE3C6)
    public static let parchmentEdge = Color(hex: 0xE0CFA8)
    public static let text = Color(hex: 0x24190E)
    public static let muted = Color(hex: 0x5A4430)
    public static let brass = Color(hex: 0xC99A45)
    public static let brassLight = Color(hex: 0xF3D9A4)
    public static let leather = Color(hex: 0x2B1D0C)
}
