import KartickyCore
import SwiftUI

@main
struct KartickyApp: App {
    @State private var model = AppModel.live()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .task { await model.load() }
        }
        .onChange(of: scenePhase) { _, phase in
            // Odcházející aplikace uloží hned, ne až po zpoždění.
            if phase != .active { Task { await model.saveNow() } }
        }
    }
}

extension AppModel {
    static func live() -> AppModel {
        #if DEBUG
        // Ladicí spuštění s ukázkovou knihovnou (screenshoty): -KartickySampleLibrary
        if ProcessInfo.processInfo.arguments.contains("-KartickySampleLibrary") {
            return AppModel(store: MemoryLibraryStore(.sample), library: .sample)
        }
        #endif
        return AppModel(store: FileLibraryStore())
    }
}
