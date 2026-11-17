import KartickyUI
import SwiftUI

/// Životy: celé počítadlo přijde ve fázi 6. Teď jen náhled dvou hráčů v barvách many.
struct LifeScreen: View {
    var body: some View {
        VStack(spacing: 2) {
            panel(.blue, life: 40).rotationEffect(.degrees(180))
            panel(.red, life: 40)
        }
        .ignoresSafeArea(edges: .top)
        .overlay {
            Text("Počítadlo přijde ve fázi 6")
                .font(.footnote.weight(.medium))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial, in: Capsule())
        }
    }

    private func panel(_ color: ManaColor, life: Int) -> some View {
        LinearGradient(colors: color.lifeGradient, startPoint: .top, endPoint: .bottom)
            .overlay {
                Text("\(life)")
                    .font(.system(size: 96, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.3), radius: 6, y: 3)
            }
            .accessibilityElement()
            .accessibilityLabel("\(life) životů")
    }
}

#Preview { LifeScreen() }
