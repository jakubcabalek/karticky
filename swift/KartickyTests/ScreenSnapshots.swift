import KartickyCore
import KartickyUI
import SnapshotTesting
import SwiftUI
import XCTest
@testable import Karticky

/// Obrazovky s mock daty (bez sítě): každá záložka a skenování.
@MainActor
final class ScreenSnapshots: XCTestCase {
    func testCollection() { verify { tabbed(.collection) { CollectionScreen() } } }
    func testCollectionEmpty() { verify(model: .preview(Library())) { tabbed(.collection) { CollectionScreen() } } }
    func testDecks() { verify { tabbed(.decks) { DecksScreen() } } }
    func testWishlist() { verify { tabbed(.wishlist) { WishlistScreen() } } }
    func testWishlistEmpty() { verify(model: .preview(Library())) { tabbed(.wishlist) { WishlistScreen() } } }
    func testLife() { verify { tabbed(.life) { LifeScreen() } } }
    func testScan() { verify { ScanScreen() } }

    /// Obrazovka s naší lištou jako v `RootView`. Samotný `TabView` se bez okna vyfotí prázdný.
    private func tabbed<Screen: View>(_ tab: AppTab, @ViewBuilder screen: () -> Screen) -> some View {
        screen().safeAreaInset(edge: .bottom, spacing: 0) {
            AppTabBar(selection: .constant(tab), usesGlass: false) {}
        }
    }

    /// První obrazovka vykreslená v okně má jinak složený navigační panel s hledáním;
    /// jedno vykreslení naprázdno před prvním snímkem to srovná.
    private static var warmedUp = false

    private func warmUp<Content: View>(_ content: Content) {
        guard !Self.warmedUp else { return }
        Self.warmedUp = true
        let window = UIWindow(frame: CGRect(origin: .zero, size: SnapshotDevice.pro.size))
        window.rootViewController = UIHostingController(rootView: content)
        window.makeKeyAndVisible()
        window.layoutIfNeeded()
        RunLoop.main.run(until: Date().addingTimeInterval(0.5))
        window.isHidden = true
    }

    private func verify<Content: View>(
        model: AppModel = .preview(),
        file: StaticString = #filePath, testName: String = #function, line: UInt = #line,
        @ViewBuilder content: () -> Content
    ) {
        warmUp(styled(content().environment(model), .lightStandard))
        for device in [SnapshotDevice.pro, SnapshotDevice.se] {
            for variant in SnapshotVariant.allCases {
                let traits = variant.traits(scale: device.scale)
                let config = ViewImageConfig(safeArea: device.safeArea, size: device.size, traits: traits)
                assertSnapshot(
                    of: styled(content().environment(model), variant),
                    // Bez vykreslení v okně je obrazovka na iOS 27 prázdná. Sklo a materiály se ale
                    // v okně skládají pokaždé trochu jinak (barva o pár %), proto tolerance barvy;
                    // podíl pixelů je přísný, takže změna textu nebo rozložení neprojde.
                    as: .image(
                        drawHierarchyInKeyWindow: true, precision: 0.998, perceptualPrecision: 0.93,
                        layout: .device(config: config), traits: traits
                    ),
                    named: "\(device.name)-\(variant.name)", record: snapshotRecord,
                    file: file, testName: testName, line: line
                )
            }
        }
    }
}
