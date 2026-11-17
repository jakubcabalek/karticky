import KartickyUI
import SwiftUI

@main
struct KartickyApp: App {
    var body: some Scene {
        WindowGroup {
            // Fáze 0: jen kostra. Obrazovky přibudou podle docs/swiftui-plan.md.
            ZStack {
                Color(.systemBackground).ignoresSafeArea()
                VStack(spacing: 12) {
                    Text("Kartičky")
                        .font(.system(.largeTitle, design: .default).weight(.bold))
                        .foregroundStyle(Color.kartickyAccent)
                    Text("Swift verze se právě staví.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}
