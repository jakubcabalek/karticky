import CryptoKit
import SwiftUI
import UIKit

/// Tvar karty: poměr 63 × 88 mm a zaoblení jako skutečná karta (podle šířky).
public struct CardShape: InsettableShape {
    public static let aspectRatio: CGFloat = 63.0 / 88.0
    private var insetAmount: CGFloat = 0

    public init() {}

    public func path(in rect: CGRect) -> Path {
        let radius = rect.width * 0.048
        let inner = rect.insetBy(dx: insetAmount, dy: insetAmount)
        return Path(roundedRect: inner, cornerRadius: max(0, radius - insetAmount), style: .continuous)
    }

    public func inset(by amount: CGFloat) -> CardShape {
        var shape = self
        shape.insetAmount += amount
        return shape
    }
}

/// Obrázek karty ze Scryfallu s cache na disku. Obrázek se nikdy neořezává
/// (řádek s autorem a copyrightem zůstává), jen se zaoblí rohy jako u karty.
/// Bez adresy nebo bez sítě se ukáže placeholder v barvách karty s názvem.
public struct CardImage: View {
    private let url: URL?
    private let name: String
    private let colors: [ManaColor]
    @State private var image: UIImage?
    @State private var failed = false

    public init(url: URL?, name: String, colors: [ManaColor] = []) {
        self.url = url
        self.name = name
        self.colors = colors
    }

    public init(_ card: CardSummary) {
        self.init(url: card.imageURL, name: card.name, colors: card.colors)
    }

    public var body: some View {
        ZStack {
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                CardPlaceholder(name: name, colors: colors, isLoading: url != nil && !failed)
            }
        }
        .aspectRatio(CardShape.aspectRatio, contentMode: .fit)
        .clipShape(CardShape())
        .overlay(CardShape().strokeBorder(.black.opacity(0.2), lineWidth: 0.5))
        .accessibilityElement()
        .accessibilityLabel(name)
        .accessibilityAddTraits(.isImage)
        .task(id: url) {
            guard let url else { return }
            failed = false
            image = await CardImageCache.shared.image(for: url)
            failed = image == nil
        }
    }
}

/// Náhradní obrázek: přechod barev karty, název a jemný rámeček (žádná kopie rámu Magicu).
struct CardPlaceholder: View {
    let name: String
    let colors: [ManaColor]
    let isLoading: Bool

    var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            ZStack {
                LinearGradient(
                    colors: ManaColor.placeholderStops(colors), startPoint: .topLeading, endPoint: .bottomTrailing
                )
                CardShape()
                    .inset(by: width * 0.045)
                    .strokeBorder(.white.opacity(0.35), lineWidth: max(1, width * 0.008))
                VStack(spacing: width * 0.04) {
                    Text(name)
                        .font(.system(size: max(9, width * 0.085), weight: .semibold))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.white)
                        .shadow(color: .black.opacity(0.4), radius: 2, y: 1)
                        .lineLimit(3)
                        .minimumScaleFactor(0.6)
                    if isLoading {
                        ProgressView().tint(.white).controlSize(width > 160 ? .regular : .mini)
                    }
                }
                .padding(width * 0.1)
            }
        }
    }
}

extension ManaColor {
    static func placeholderStops(_ colors: [ManaColor]) -> [Color] {
        let gradient = (colors.first ?? .colorless).lifeGradient
        guard colors.count > 1 else { return [gradient[0], gradient[1], gradient[2]] }
        return colors.map { $0.lifeGradient[1] } + [Color(hex: 0x1A1714)]
    }
}

/// Paměť a disk (`Caches/cards/`) pro obrázky karet. Stejná adresa se stahuje jednou.
public actor CardImageCache {
    public static let shared = CardImageCache()

    private let memory = NSCache<NSURL, UIImage>()
    private var running: [URL: Task<UIImage?, Never>] = [:]
    private let directory: URL
    private let session: URLSession

    public init(directory: URL? = nil, session: URLSession = .shared) {
        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        self.directory = directory ?? caches.appending(path: "cards", directoryHint: .isDirectory)
        self.session = session
        memory.countLimit = 300
    }

    public func image(for url: URL) async -> UIImage? {
        if let cached = memory.object(forKey: url as NSURL) { return cached }
        if let task = running[url] { return await task.value }
        let file = directory.appending(path: Self.fileName(for: url))
        let session = session
        let directory = directory
        let task = Task<UIImage?, Never>.detached(priority: .userInitiated) {
            if let data = try? Data(contentsOf: file), let image = UIImage(data: data) { return image }
            var request = URLRequest(url: url)
            request.setValue(Self.userAgent, forHTTPHeaderField: "User-Agent")
            guard let (data, response) = try? await session.data(for: request),
                  (response as? HTTPURLResponse)?.statusCode == 200,
                  let image = UIImage(data: data) else { return nil }
            try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try? data.write(to: file, options: .atomic)
            return image
        }
        running[url] = task
        let image = await task.value
        running[url] = nil
        if let image { memory.setObject(image, forKey: url as NSURL) }
        return image
    }

    static func fileName(for url: URL) -> String {
        let digest = SHA256.hash(data: Data(url.absoluteString.utf8))
        let ext = url.pathExtension.isEmpty ? "jpg" : url.pathExtension
        return digest.map { String(format: "%02x", $0) }.joined() + "." + ext
    }

    /// Scryfall chce rozpoznatelný User-Agent (docs/swiftui-plan.md, bod 3).
    static var userAgent: String {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
        return "Karticky/\(version)"
    }
}

#if DEBUG
#Preview("CardImage") {
    ScrollView(.horizontal) {
        HStack(spacing: 12) {
            ForEach(CardSummary.samples.prefix(4)) { card in
                CardImage(card).frame(width: 140)
            }
        }
        .padding()
    }
}
#endif
