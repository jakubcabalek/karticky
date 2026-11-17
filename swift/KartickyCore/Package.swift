// swift-tools-version: 6.0
import PackageDescription

// Čistá logika Kartiček (port cardData.ts, deckText.ts, deckStats.ts, lifeCounter.ts, …).
// Jen Foundation: žádné SwiftUI, UIKit ani Supabase, ať jde testovat `swift test`.
let package = Package(
    name: "KartickyCore",
    platforms: [.iOS(.v18), .macOS(.v14)],
    products: [.library(name: "KartickyCore", targets: ["KartickyCore"])],
    targets: [
        .target(name: "KartickyCore"),
        .testTarget(
            name: "KartickyCoreTests",
            dependencies: ["KartickyCore"],
            resources: [.copy("Fixtures")]
        ),
    ]
)
