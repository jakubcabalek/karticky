import SwiftUI

/// Přechod barevné identity (hlavička balíčku, pozadí řádku): barvy many shora,
/// dole se rozplynou do pozadí. Bez barev bezbarvá.
public struct ColorIdentityGradient: View {
    private let colors: [ManaColor]
    private let fadesOut: Bool

    public init(_ colors: [ManaColor], fadesOut: Bool = true) {
        self.colors = colors.isEmpty ? [.colorless] : colors
        self.fadesOut = fadesOut
    }

    public var body: some View {
        ZStack {
            LinearGradient(
                colors: (colors.count == 1 ? [colors[0], colors[0]] : colors).map { $0.color.opacity(0.85) },
                startPoint: .topLeading, endPoint: .topTrailing
            )
            if fadesOut {
                LinearGradient(
                    colors: [.clear, Color(.systemBackground)], startPoint: .top, endPoint: .bottom
                )
            }
        }
        .accessibilityHidden(true)
    }
}

#Preview("ColorIdentityGradient") {
    VStack(spacing: 0) {
        ColorIdentityGradient([.blue, .black, .green]).frame(height: 160)
        ColorIdentityGradient([.red], fadesOut: false).frame(height: 60)
        ColorIdentityGradient([]).frame(height: 120)
    }
}
