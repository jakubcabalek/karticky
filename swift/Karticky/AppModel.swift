import Foundation
import KartickyCore
import KartickyUI
import Observation

/// Seznam v knihovně, do kterého karta patří.
enum LibraryList: String, Sendable {
    case collection, wishlist
}

/// Stav aplikace: knihovna a její ukládání. Každá změna jde přes `change`, které zapíše smazané
/// položky (pro synchronizaci, `recordDeletions`) a uloží knihovnu s krátkým zpožděním.
@MainActor @Observable
final class AppModel {
    private(set) var library: Library
    private(set) var isLoaded = false

    @ObservationIgnored private let store: LibraryStore
    @ObservationIgnored private let clock: @Sendable () -> Date
    @ObservationIgnored private var pendingSave: Task<Void, Never>?
    /// Zápis po posledním ťuknutí (docs/swiftui-plan.md, „Lokální data“).
    @ObservationIgnored var saveDelay: Duration = .milliseconds(400)

    init(store: LibraryStore, library: Library? = nil, clock: @escaping @Sendable () -> Date = Date.init) {
        self.store = store
        self.clock = clock
        self.library = library ?? emptyLibrary()
        isLoaded = library != nil
    }

    /// Načte uloženou knihovnu (jednou, při startu).
    func load() async {
        guard !isLoaded else { return }
        library = await store.load()
        isLoaded = true
    }

    /// „Teď“ jako v JavaScriptu (`toISOString`): „2026-11-17T14:00:00.123Z“.
    var now: String { Date.ISO8601FormatStyle(includingFractionalSeconds: true).format(clock()) }

    func change(_ update: (inout Library) -> Void) {
        let before = library
        var after = library
        update(&after)
        guard after != before else { return }
        library = recordDeletions(before, after, now: now)
        scheduleSave()
    }

    private func scheduleSave() {
        pendingSave?.cancel()
        let delay = saveDelay
        pendingSave = Task { [weak self] in
            try? await Task.sleep(for: delay)
            guard !Task.isCancelled else { return }
            await self?.saveNow()
        }
    }

    /// Okamžitý zápis (aplikace jde do pozadí).
    func saveNow() async {
        pendingSave?.cancel()
        pendingSave = nil
        try? await store.save(library)
    }

    // MARK: - Akce

    func entries(_ list: LibraryList) -> [CardEntry] {
        list == .collection ? library.collection : library.wishlist
    }

    func add(_ card: CardPrinting, to list: LibraryList, finish: Finish = .nonfoil, quantity: Int = 1) {
        let now = now
        change { library in
            switch list {
            case .collection: library.collection = addCard(library.collection, card, quantity: quantity, finish: finish, now: now)
            case .wishlist: library.wishlist = addCard(library.wishlist, card, quantity: quantity, finish: finish, now: now)
            }
        }
    }

    func setQuantity(_ key: String, in list: LibraryList, to quantity: Int) {
        change { library in
            switch list {
            case .collection: library.collection = KartickyCore.setQuantity(library.collection, key, quantity)
            case .wishlist: library.wishlist = KartickyCore.setQuantity(library.wishlist, key, quantity)
            }
        }
    }

    func remove(_ key: String, from list: LibraryList) {
        setQuantity(key, in: list, to: 0)
    }

    func setTargetPrice(_ key: String, to target: Double?) {
        change { $0.wishlist = KartickyCore.setTargetPrice($0.wishlist, key, target) }
    }

    /// Karta z wishlistu je koupená: přesune se do sbírky.
    func markAcquired(_ key: String) {
        let now = now
        change { $0 = markWishAcquired($0, key, now: now) }
    }
}

#if DEBUG
extension AppModel {
    /// Model pro náhledy a snapshoty: knihovna v paměti, pevné „teď“.
    static func preview(_ library: Library = .sample) -> AppModel {
        AppModel(
            store: MemoryLibraryStore(library), library: library,
            clock: { Date(timeIntervalSince1970: 1_794_916_800) }
        )
    }
}
#endif
