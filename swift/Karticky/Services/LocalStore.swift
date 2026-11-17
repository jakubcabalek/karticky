import Foundation
import KartickyCore

/// Kam se knihovna ukládá. V aplikaci soubor, v náhledech a testech paměť.
protocol LibraryStore: Sendable {
    func load() async -> Library
    func save(_ library: Library) async throws
}

/// Knihovna v `Application Support/karticky-library-v1.json` (stejný název jako klíč v AsyncStorage
/// Expo aplikace). Zápis je atomický: rozepsaný soubor nikdy nenahradí dobrý.
actor FileLibraryStore: LibraryStore {
    static let fileName = "karticky-library-v1.json"
    nonisolated let url: URL

    init(directory: URL? = nil) {
        let support = directory ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        url = support.appending(path: Self.fileName)
    }

    /// Chybějící nebo poškozený soubor = prázdná knihovna (poškozený se odloží vedle, ať se neztratí).
    func load() -> Library {
        guard let data = try? Data(contentsOf: url) else { return emptyLibrary() }
        guard let value = try? JSONDecoder().decode(JSONValue.self, from: data) else {
            let backup = url.deletingPathExtension().appendingPathExtension("broken-\(Int(Date().timeIntervalSince1970)).json")
            try? FileManager.default.moveItem(at: url, to: backup)
            return emptyLibrary()
        }
        return normalizeLibrary(value)
    }

    func save(_ library: Library) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        try encoder.encode(library).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
}

/// Knihovna jen v paměti: náhledy, snapshoty, testy.
actor MemoryLibraryStore: LibraryStore {
    private(set) var library: Library
    private(set) var saves = 0

    init(_ library: Library = emptyLibrary()) {
        self.library = library
    }

    func load() -> Library { library }

    func save(_ library: Library) {
        self.library = library
        saves += 1
    }
}
