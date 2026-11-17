import Foundation
import Testing
@testable import KartickyCore

// Kompatibilita dat (docs/swiftui-plan.md, bod 4), kterou fixture z TypeScriptu nepokrývají:
// TypeScript neznámá pole knihovny a balíčků zahazuje, Swift je musí zachovat.

private let stored = """
{
  "version": 1,
  "binderNames": ["Šanon 1"],
  "pricesUpdatedAt": "2026-11-13T10:00:00.000Z",
  "collection": [
    {"key": "a:foil", "quantity": 2, "finish": "foil", "addedAt": "2026-11-01T00:00:00.000Z", "binder": "Šanon 1",
     "card": {"id": "a", "name": "Bolt", "futureField": {"x": [1, null, true]}, "prices": {"eurFoil": 4.5}}},
    {"key": "broken", "quantity": "many"},
    42
  ],
  "wishlist": [],
  "decks": [{"id": "d", "name": "Elfové", "format": "oathbreaker", "main": [], "colorTag": "G"}],
  "deleted": {"c:x:nonfoil": "2026-11-02T00:00:00.000Z", "bad": 5}
}
"""

@Test func unknownFieldsSurviveLoadAndSave() throws {
    let library = try JSONDecoder().decode(Library.self, from: Data(stored.utf8))
    #expect(library.collection.count == 1)
    #expect(library.collection[0].card.prices.eurFoil == 4.5)
    #expect(library.decks[0].deckFormat == .casual)

    let saved = try JSONDecoder().decode(JSONValue.self, from: JSONEncoder().encode(library))
    #expect(saved["binderNames"] == .array([.string("Šanon 1")]))
    #expect(saved["collection"]?.arrayValue?.first?["binder"] == .string("Šanon 1"))
    #expect(saved["collection"]?.arrayValue?.first?["card"]?["futureField"] == .object(["x": .array([.number(1), .null, .bool(true)])]))
    #expect(saved["decks"]?.arrayValue?.first?["colorTag"] == .string("G"))
    #expect(saved["deleted"] == .object(["c:x:nonfoil": .string("2026-11-02T00:00:00.000Z")]))
    #expect(saved["pricesUpdatedAt"] == .string("2026-11-13T10:00:00.000Z"))
    // Druhé načtení a uložení nic nezmění.
    let again = try JSONDecoder().decode(Library.self, from: JSONEncoder().encode(library))
    #expect(again == library)
}

@Test func missingFieldsStayMissing() throws {
    let raw = #"{"key": "a:nonfoil", "quantity": 1, "finish": "nonfoil", "card": {"id": "a", "name": "A"}}"#
    let entry = try #require(CardEntry(json: try JSONDecoder().decode(JSONValue.self, from: Data(raw.utf8))))
    #expect(entry.addedAt == nil)
    #expect(entry.json["addedAt"] == nil)
    #expect(entry.json["targetPrice"] == nil)
    #expect(entry.card.json["prices"] == nil)
    #expect(entry.card.setName.isEmpty)
}

@Test func brokenDataNeverThrows() throws {
    for text in ["null", "[]", "\"x\"", "{\"collection\": {}}", "{\"decks\": [null, 1, {\"id\": 3}]}"] {
        let library = try JSONDecoder().decode(Library.self, from: Data(text.utf8))
        #expect(library.collection.isEmpty)
        #expect(library.decks.isEmpty)
    }
}

@Test func jsonNumbersAndBooleansStayApart() throws {
    let value = try JSONDecoder().decode(JSONValue.self, from: Data("[1, 0, true, false, 1.5]".utf8))
    #expect(value == .array([.number(1), .number(0), .bool(true), .bool(false), .number(1.5)]))
}

@Test func datesParseLikeJavaScript() {
    #expect(parseDate("2026-11-14T12:00:00.000Z") == 1_794_657_600_000)
    #expect(parseDate("2026-11-14T12:00:00Z") == 1_794_657_600_000)
    #expect(parseDate("") == nil)
    #expect(parseDate("včera") == nil)
}

@Test func collectorLineHandlesWindowsLineEnds() {
    #expect(parseCollectorLine("0123 R\r\nMH3 • JP") == CollectorLine(set: "mh3", number: "123", lang: "ja"))
    #expect(parseCollectorLine("0007 C\nDMU • XX") == CollectorLine(set: "dmu", number: "7", lang: nil))
}
