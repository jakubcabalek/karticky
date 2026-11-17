import KartickyUI
import SwiftUI

@main
struct KartickyApp: App {
    var body: some Scene {
        WindowGroup {
            // Fáze 0: jen kostra. Obrazovky přibudou podle docs/swiftui-plan.md.
            ZStack {
                Ink.table.ignoresSafeArea()
                VStack(spacing: 12) {
                    Text("Kartičky")
                        .font(.system(.largeTitle, design: .serif).weight(.bold))
                        .foregroundStyle(Ink.brassLight)
                    Text("Swift verze se právě staví.")
                        .font(.system(.body, design: .serif).italic())
                        .foregroundStyle(Ink.parchmentEdge)
                }
            }
        }
    }
}
