import KartickyUI
import SwiftUI

/// Skenování přes celou obrazovku. Kamera a rozpoznání přijdou ve fázi 5.
struct ScanScreen: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            ContentUnavailableView(
                "Skenování se připravuje", systemImage: "camera.viewfinder",
                description: Text("Kamera s rozpoznáním karet přijde ve fázi 5.")
            )
            .foregroundStyle(.white)
        }
        .overlay(alignment: .topLeading) {
            Button("Zavřít", systemImage: "xmark") { dismiss() }
                .labelStyle(.iconOnly)
                .font(.title3.weight(.semibold))
                .foregroundStyle(.white)
                .padding(12)
                .background(.ultraThinMaterial, in: Circle())
                .padding()
        }
        .preferredColorScheme(.dark)
    }
}

#Preview { ScanScreen() }
