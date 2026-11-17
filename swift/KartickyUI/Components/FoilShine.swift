import CoreMotion
import SwiftUI

/// Náklon telefonu pro lesk fólií. Jeden `CMMotionManager` pro celou aplikaci,
/// běží jen když je na obrazovce aspoň jedna fólie.
@MainActor @Observable
public final class DeviceTilt {
    public static let shared = DeviceTilt()

    /// -1…1 v obou osách.
    public private(set) var x: Double = 0
    public private(set) var y: Double = 0

    @ObservationIgnored private let manager = CMMotionManager()
    @ObservationIgnored private var users = 0

    func start() {
        users += 1
        guard users == 1, manager.isDeviceMotionAvailable else { return }
        manager.deviceMotionUpdateInterval = 1.0 / 30
        manager.startDeviceMotionUpdates(to: .main) { motion, _ in
            guard let attitude = motion?.attitude else { return }
            MainActor.assumeIsolated {
                DeviceTilt.shared.update(roll: attitude.roll, pitch: attitude.pitch)
            }
        }
    }

    func stop() {
        users = max(0, users - 1)
        if users == 0 { manager.stopDeviceMotionUpdates() }
    }

    private func update(roll: Double, pitch: Double) {
        x = max(-1, min(1, roll / 0.8))
        // Telefon se drží asi v 45°, to je střed.
        y = max(-1, min(1, (pitch - 0.8) / 0.8))
    }
}

/// Duhový lesk fólie, který se přelévá podle náklonu telefonu.
/// Při „Omezit pohyb“ (nebo v náhledech a snapshotech, kde náklon není) stojí.
struct FoilShine: ViewModifier {
    let isActive: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var tilt = DeviceTilt.shared

    func body(content: Content) -> some View {
        content.overlay {
            if isActive {
                let moving = !reduceMotion
                let dx = moving ? tilt.x : 0
                let dy = moving ? tilt.y : 0
                GeometryReader { proxy in
                    let size = proxy.size
                    ZStack {
                        LinearGradient(
                            colors: [
                                Color(hex: 0xFF6B9A), Color(hex: 0xFFD36B), Color(hex: 0x7CF2B0),
                                Color(hex: 0x6BC8FF), Color(hex: 0xB89CFF), Color(hex: 0xFF6B9A)
                            ],
                            startPoint: UnitPoint(x: -0.2 + dx * 0.5, y: 0 + dy * 0.3),
                            endPoint: UnitPoint(x: 1.2 + dx * 0.5, y: 1 + dy * 0.3)
                        )
                        .opacity(0.35)
                        .blendMode(.overlay)
                        LinearGradient(
                            stops: [
                                .init(color: .clear, location: 0.35),
                                .init(color: .white.opacity(0.45), location: 0.5),
                                .init(color: .clear, location: 0.65)
                            ],
                            startPoint: UnitPoint(x: 0 - dx, y: 0 - dy * 0.5),
                            endPoint: UnitPoint(x: 1 - dx, y: 1 - dy * 0.5)
                        )
                        .blendMode(.softLight)
                    }
                    .frame(width: size.width, height: size.height)
                }
                .clipShape(CardShape())
                .allowsHitTesting(false)
                .accessibilityHidden(true)
                .task(id: moving) {
                    // Náklon běží, dokud je fólie vidět; zrušení úlohy ho vypne.
                    guard moving else { return }
                    tilt.start()
                    while !Task.isCancelled { try? await Task.sleep(for: .seconds(3600)) }
                    tilt.stop()
                }
            }
        }
    }
}

public extension View {
    /// Lesk fólie přes obrázek karty (`CardImage`).
    func foilShine(_ isActive: Bool = true) -> some View {
        modifier(FoilShine(isActive: isActive))
    }
}

#if DEBUG
#Preview("FoilShine") {
    HStack(spacing: 16) {
        CardImage(CardSummary.samples[0]).foilShine(false)
        CardImage(CardSummary.samples[0]).foilShine()
    }
    .padding()
}
#endif
