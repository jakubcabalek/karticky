import SnapshotTesting
import SwiftUI
import UIKit
import XCTest

/// Snímky ve všech kombinacích z docs/swiftui-design.md: iPhone 18 Pro a nejmenší iPhone,
/// světlý a tmavý režim, běžné písmo a accessibility3. Přenahrání:
/// `scripts/swift-check.sh --record` (KARTICKY_RECORD_SNAPSHOTS=1).
struct SnapshotDevice {
    let name: String
    let size: CGSize
    let safeArea: UIEdgeInsets
    let scale: CGFloat

    static let pro = SnapshotDevice(
        name: "18-pro", size: CGSize(width: 402, height: 874),
        safeArea: UIEdgeInsets(top: 62, left: 0, bottom: 34, right: 0), scale: 3
    )
    static let se = SnapshotDevice(
        name: "se", size: CGSize(width: 375, height: 667),
        safeArea: UIEdgeInsets(top: 20, left: 0, bottom: 0, right: 0), scale: 2
    )
}

enum SnapshotVariant: CaseIterable {
    case lightStandard, darkStandard, lightLarge, darkLarge

    var isDark: Bool { self == .darkStandard || self == .darkLarge }
    var largeText: Bool { self == .lightLarge || self == .darkLarge }
    var name: String { [isDark ? "dark" : "light", largeText ? "accessibility3" : "standard"].joined(separator: "-") }

    func traits(scale: CGFloat) -> UITraitCollection {
        UITraitCollection {
            $0.userInterfaceIdiom = .phone
            $0.horizontalSizeClass = .compact
            $0.verticalSizeClass = .regular
            $0.displayScale = scale
            $0.userInterfaceStyle = isDark ? .dark : .light
            $0.preferredContentSizeCategory = largeText ? .accessibilityExtraLarge : .large
        }
    }
}

extension XCTestCase {
    var snapshotRecord: SnapshotTestingConfiguration.Record {
        ProcessInfo.processInfo.environment["KARTICKY_RECORD_SNAPSHOTS"] == "1" ? .all : .never
    }

    @MainActor
    func styled<Content: View>(_ content: Content, _ variant: SnapshotVariant) -> some View {
        content
            .environment(\.locale, Locale(identifier: "cs_CZ"))
            .environment(\.timeZone, TimeZone(secondsFromGMT: 0) ?? .gmt)
            .environment(\.dynamicTypeSize, variant.largeText ? .accessibility3 : .large)
            .environment(\.colorScheme, variant.isDark ? .dark : .light)
            .tint(.kartickyAccent)
    }
}
