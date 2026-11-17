import KartickyCore
import KartickyUI
import SnapshotTesting
import SwiftUI
import XCTest

/// Komponenty z KartickyUI na mock datech, světlý/tmavý režim a accessibility3.
@MainActor
final class ComponentSnapshots: XCTestCase {
    func testCardImage() {
        verify(width: 360) {
            HStack(alignment: .top, spacing: 12) {
                CardImage(CardSummary.samples[1])
                CardImage(CardSummary.samples[3])
                CardImage(url: nil, name: "Bezbarvá karta")
            }
        }
    }

    func testFoilShine() {
        verify(width: 260) {
            HStack(spacing: 12) {
                CardImage(CardSummary.samples[2]).foilShine(false)
                CardImage(CardSummary.samples[2]).foilShine()
            }
        }
    }

    func testManaDots() {
        verify(width: 320) {
            VStack(alignment: .leading, spacing: 10) {
                ManaDots(cost: "{2}{U}{U}")
                ManaDots(cost: "{X}{R}{G}{W/U}{B/P}{C}")
                ManaDots(colors: [.white, .blue, .black, .red, .green])
                ManaDots(colors: [])
            }
        }
    }

    func testPriceText() {
        verify(width: 320) {
            VStack(alignment: .leading, spacing: 8) {
                PriceText(1234.5)
                PriceText(8.4, previous: 10)
                PriceText(12, currency: .usd, previous: 9.99)
                PriceText(nil)
            }
        }
    }

    func testColorIdentityGradient() {
        verify(width: 320) {
            VStack(spacing: 0) {
                ColorIdentityGradient([.blue, .black, .green]).frame(height: 90)
                ColorIdentityGradient([.red], fadesOut: false).frame(height: 40)
                ColorIdentityGradient([]).frame(height: 70)
            }
        }
    }

    private func verify<Content: View>(
        width: CGFloat, file: StaticString = #filePath, testName: String = #function, line: UInt = #line,
        @ViewBuilder content: () -> Content
    ) {
        for variant in [SnapshotVariant.lightStandard, .darkStandard, .lightLarge] {
            let traits = variant.traits(scale: 2)
            let view = styled(
                content().padding(16).frame(width: width).background(Color(.systemBackground)),
                variant
            )
            assertSnapshot(
                of: view,
                as: .image(precision: 0.9999, layout: .sizeThatFits, traits: traits),
                named: variant.name, record: snapshotRecord, file: file, testName: testName, line: line
            )
        }
    }
}
