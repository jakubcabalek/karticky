import Foundation
import KartickyCore
import KartickyUI
import Testing
@testable import Karticky

@MainActor
struct AppModelTests {
    private let card = CardPrinting(json: [
        "id": .string("bolt"), "name": .string("Lightning Bolt"), "prices": .object(["eur": .number(1.2)])
    ])

    @Test func addRemoveAndSave() async throws {
        let store = MemoryLibraryStore()
        let model = AppModel(store: store, library: Library(), clock: { Date(timeIntervalSince1970: 1_794_916_800) })
        model.saveDelay = .zero

        model.add(card, to: .collection)
        model.add(card, to: .collection, quantity: 2)
        #expect(model.library.collection.map(\.quantity) == [3])
        #expect(model.library.collection[0].addedAt == "2026-11-17T12:00:00.000Z")

        model.remove("bolt:nonfoil", from: .collection)
        #expect(model.library.collection.isEmpty)
        // Smazání se zapíše, ať ho synchronizace nevrátí.
        #expect(model.library.deleted?["c:bolt:nonfoil"] == "2026-11-17T12:00:00.000Z")

        await model.saveNow()
        #expect(await store.library == model.library)
    }

    @Test func wishlistTargetAndAcquire() {
        let model = AppModel(store: MemoryLibraryStore(), library: Library())
        model.add(card, to: .wishlist)
        model.setTargetPrice("bolt:nonfoil", to: 1.5)
        #expect(priceAlerts(model.library.wishlist).count == 1)
        model.markAcquired("bolt:nonfoil")
        #expect(model.library.wishlist.isEmpty)
        #expect(model.library.collection.map(\.key) == ["bolt:nonfoil"])
    }

    @Test func unchangedLibraryIsNotSaved() async {
        let store = MemoryLibraryStore()
        let model = AppModel(store: store, library: Library())
        model.saveDelay = .zero
        model.remove("nothing", from: .collection)
        try? await Task.sleep(for: .milliseconds(50))
        #expect(await store.saves == 0)
    }

    @Test func fileStoreRoundTripAndBrokenFile() async throws {
        let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = FileLibraryStore(directory: directory)
        #expect(await store.load() == Library())

        try await store.save(.sample)
        #expect(await store.load() == .sample)

        try Data("{ nedopsané".utf8).write(to: store.url)
        #expect(await store.load() == Library())
        let files = try FileManager.default.contentsOfDirectory(atPath: directory.path())
        #expect(files.contains { $0.contains("broken") })
    }

    @Test func pricesFromTyping() {
        #expect(parsePrice("12,5") == 12.5)
        #expect(parsePrice("12.50 €") == 12.5)
        #expect(parsePrice("") == nil)
        #expect(parsePrice("0") == nil)
        #expect(formatNumber(12.5) == "12,50")
        #expect(cardCount(1) == "1 karta")
        #expect(cardCount(3) == "3 karty")
        #expect(cardCount(12) == "12 karet")
    }
}
