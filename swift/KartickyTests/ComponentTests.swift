import Foundation
import Testing
@testable import KartickyUI

@Test func manaSymbolsParseScryfallCost() {
    #expect(ManaSymbol.parse("{2}{U}{U}") == [.generic("2"), .color(.blue), .color(.blue)])
    #expect(ManaSymbol.parse("{W/U}{G/P}{X}{C}") == [.hybrid(.white, .blue), .color(.green), .generic("X"), .generic("◇")])
    #expect(ManaSymbol.parse("{2/W}{S}") == [.generic("2/W"), .generic("S")])
    #expect(ManaSymbol.parse("").isEmpty)
    #expect(ManaSymbol.parse("{R} // {1}{U}") == [.color(.red), .generic("1"), .color(.blue)])
}

@Test func cardImageCacheFileNameIsStable() throws {
    let url = try #require(URL(string: "https://cards.scryfall.io/normal/front/a/b/ab.jpg?1700000000"))
    let other = try #require(URL(string: "https://cards.scryfall.io/normal/front/a/b/ab.jpg?2"))
    let name = CardImageCache.fileName(for: url)
    #expect(name == CardImageCache.fileName(for: url))
    #expect(name.hasSuffix(".jpg"))
    #expect(name.count == 64 + 4)
    #expect(name != CardImageCache.fileName(for: other))
}

@Test func cardShapeKeepsCardRatio() {
    #expect(abs(CardShape.aspectRatio - 63.0 / 88.0) < 0.0001)
}
