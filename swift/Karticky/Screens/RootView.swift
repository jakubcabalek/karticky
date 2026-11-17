import KartickyUI
import SwiftUI

/// Záložky aplikace. Systémová lišta je skrytá a místo ní je vlastní skleněná:
/// kapsle se čtyřmi záložkami a vedle ní samostatné kulaté tlačítko Skenovat
/// (docs/swiftui-design.md, „Navigace“). Systémová záložka s rolí hledání se na iOS 27
/// od ostatních neoddělí, proto vlastní lišta.
enum AppTab: String, CaseIterable, Hashable {
    case collection, decks, wishlist, life

    var title: String {
        switch self {
        case .collection: "Sbírka"
        case .decks: "Balíčky"
        case .wishlist: "Wishlist"
        case .life: "Životy"
        }
    }

    var systemImage: String {
        switch self {
        case .collection: "square.grid.3x3.fill"
        case .decks: "rectangle.stack.fill"
        case .wishlist: "star.fill"
        case .life: "heart.fill"
        }
    }
}

struct RootView: View {
    @State private var tab: AppTab
    @State private var scanning: Bool

    init(tab: AppTab = .collection, scanning: Bool = false) {
        _tab = State(initialValue: tab)
        _scanning = State(initialValue: scanning)
    }

    var body: some View {
        TabView(selection: $tab) {
            Tab(AppTab.collection.title, systemImage: AppTab.collection.systemImage, value: AppTab.collection) {
                CollectionScreen().toolbar(.hidden, for: .tabBar)
            }
            Tab(AppTab.decks.title, systemImage: AppTab.decks.systemImage, value: AppTab.decks) {
                DecksScreen().toolbar(.hidden, for: .tabBar)
            }
            Tab(AppTab.wishlist.title, systemImage: AppTab.wishlist.systemImage, value: AppTab.wishlist) {
                WishlistScreen().toolbar(.hidden, for: .tabBar)
            }
            Tab(AppTab.life.title, systemImage: AppTab.life.systemImage, value: AppTab.life) {
                LifeScreen().toolbar(.hidden, for: .tabBar)
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            AppTabBar(selection: $tab) { scanning = true }
        }
        .tint(.kartickyAccent)
        .fullScreenCover(isPresented: $scanning) {
            ScanScreen()
        }
        .sensoryFeedback(.selection, trigger: tab)
    }
}

/// Spodní lišta: kapsle záložek + kulaté tlačítko Skenovat (Liquid Glass na iOS 26+, jinak materiál).
struct AppTabBar: View {
    @Binding var selection: AppTab
    /// Snapshoty kreslí lištu materiálem: Liquid Glass se při prvním vykreslení skládá pokaždé jinak.
    var usesGlass = true
    let scan: () -> Void
    @Namespace private var highlight
    /// Pevná velikost jako systémová lišta (ta s písmem také neroste).
    private let scanSize: CGFloat = 60

    var body: some View {
        GlassGroup(enabled: usesGlass) {
            HStack(spacing: 10) {
                HStack(spacing: 0) {
                    ForEach(AppTab.allCases, id: \.self) { item in
                        tabButton(item)
                    }
                }
                .padding(4)
                .glassCapsule(usesGlass)

                Button(action: scan) {
                    Image(systemName: "camera.fill")
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(width: scanSize, height: scanSize)
                }
                .buttonStyle(.plain)
                .glassCircle(tint: .kartickyAccent, usesGlass)
                .accessibilityShowsLargeContentViewer {
                    Label("Skenovat", systemImage: "camera.fill")
                }
                .accessibilityLabel("Skenovat")
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 4)
        // Jako systémová lišta: písmo roste jen do xxLarge, větší ukáže podržení (Large Content Viewer).
        .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    }

    private func tabButton(_ item: AppTab) -> some View {
        let selected = item == selection
        return Button {
            withAnimation(.snappy(duration: 0.25)) { selection = item }
        } label: {
            VStack(spacing: 2) {
                Image(systemName: item.systemImage).font(.title3)
                Text(item.title).font(.caption2.weight(.medium)).lineLimit(1).minimumScaleFactor(0.7)
            }
            .foregroundStyle(selected ? Color.kartickyAccent : .primary)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background {
                if selected {
                    // Hustý materiál pod vybranou záložkou: popisek je čitelný i nad pestrými kartami.
                    Capsule()
                        .fill(.thickMaterial)
                        .overlay(Capsule().fill(Color.kartickyAccent.opacity(0.14)))
                        .matchedGeometryEffect(id: "tab", in: highlight)
                }
            }
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityShowsLargeContentViewer {
            Label(item.title, systemImage: item.systemImage)
        }
        .accessibilityLabel(item.title)
        .accessibilityAddTraits(selected ? [.isSelected, .isButton] : .isButton)
    }
}

/// `GlassEffectContainer` na iOS 26+, jinak nic.
private struct GlassGroup<Content: View>: View {
    let enabled: Bool
    @ViewBuilder let content: Content

    var body: some View {
        if #available(iOS 26, *), enabled {
            GlassEffectContainer(spacing: 10) { content }
        } else {
            content
        }
    }
}

private extension View {
    @ViewBuilder func glassCapsule(_ enabled: Bool) -> some View {
        if #available(iOS 26, *), enabled {
            glassEffect(.regular.interactive(), in: Capsule())
        } else {
            background(.regularMaterial, in: Capsule())
                .shadow(color: .black.opacity(0.15), radius: 10, y: 4)
        }
    }

    @ViewBuilder func glassCircle(tint: Color, _ enabled: Bool) -> some View {
        if #available(iOS 26, *), enabled {
            glassEffect(.regular.tint(tint).interactive(), in: Circle())
        } else {
            background(tint, in: Circle())
                .shadow(color: .black.opacity(0.2), radius: 10, y: 4)
        }
    }
}

#if DEBUG
#Preview("Sbírka") { RootView().environment(AppModel.preview()) }
#Preview("Balíčky") { RootView(tab: .decks).environment(AppModel.preview()) }
#Preview("Wishlist") { RootView(tab: .wishlist).environment(AppModel.preview()) }
#Preview("Životy") { RootView(tab: .life).environment(AppModel.preview()) }
#endif
