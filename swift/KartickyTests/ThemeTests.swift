import Testing
@testable import KartickyUI

@Test func manaColorsKeepWubrgOrder() {
    #expect(ManaColor.from(["G", "W", "X", "G"]) == [.white, .green])
    #expect(ManaColor.from([]).isEmpty)
}
