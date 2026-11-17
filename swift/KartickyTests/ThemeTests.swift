import Testing
@testable import KartickyUI

@Test func frameColorFollowsCardColors() {
    #expect(FrameColor.forColors([]) == .colorless)
    #expect(FrameColor.forColors(["G"]) == .green)
    #expect(FrameColor.forColors(["W", "U"]) == .multicolor)
}
