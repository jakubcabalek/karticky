import ExpoModulesCore
import UIKit
import Vision
import VisionKit

// "Skenovat" on iPhone. The system document camera finds the card's edges, straightens
// it and can take many cards in a row. For every card we return:
//  - small straightened RGBA pixels (JS matches the artwork, which is the same in every language),
//  - the text Vision read: once in Latin letters for the small print ("0123 R / MH3 • JP"),
//    once with automatic language detection (Japanese, Chinese, Korean, Russian …) for the name.
public final class CardScannerModule: Module {
  private var cameraDelegate: CardCameraDelegate?

  public func definition() -> ModuleDefinition {
    Name("CardScanner")

    Function("isAvailable") { () -> Bool in
      VNDocumentCameraViewController.isSupported
    }

    AsyncFunction("scanCards") { (width: Int, height: Int, promise: Promise) in
      guard VNDocumentCameraViewController.isSupported else {
        promise.reject("ERR_NO_CAMERA", "Skenování na tomto zařízení nejde.")
        return
      }
      guard let currentViewController = self.appContext?.utilities?.currentViewController() else {
        promise.reject("ERR_NO_VIEW_CONTROLLER", "Fotoaparát teď nejde otevřít.")
        return
      }
      let camera = VNDocumentCameraViewController()
      let delegate = CardCameraDelegate { [weak self = self] images in
        self?.cameraDelegate = nil
        DispatchQueue.global(qos: .userInitiated).async {
          let cards = images.map { CardScannerModule.describe($0, width: max(32, width), height: max(32, height)) }
          promise.resolve(cards)
        }
      }
      self.cameraDelegate = delegate
      camera.delegate = delegate
      currentViewController.present(camera, animated: true)
    }
    .runOnQueue(.main)
  }

  static func describe(_ original: UIImage, width: Int, height: Int) -> [String: Any] {
    let image = portrait(original)
    return [
      "width": width,
      "height": height,
      "rgba": rgbaPixels(image, width: width, height: height)?.base64EncodedString() ?? "",
      "text": recognizeText(image),
    ]
  }

  // A card lying sideways comes back landscape; cards are portrait.
  static func portrait(_ image: UIImage) -> UIImage {
    guard image.size.width > image.size.height else { return image }
    let size = CGSize(width: image.size.height, height: image.size.width)
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    return UIGraphicsImageRenderer(size: size, format: format).image { context in
      context.cgContext.translateBy(x: size.width / 2, y: size.height / 2)
      context.cgContext.rotate(by: .pi / 2)
      image.draw(in: CGRect(x: -image.size.width / 2, y: -image.size.height / 2, width: image.size.width, height: image.size.height))
    }
  }

  static func rgbaPixels(_ image: UIImage, width: Int, height: Int) -> Data? {
    guard let cgImage = image.cgImage else { return nil }
    var data = Data(count: width * height * 4)
    let drawn: Bool = data.withUnsafeMutableBytes { buffer in
      guard let context = CGContext(
        data: buffer.baseAddress, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
      ) else { return false }
      context.interpolationQuality = .high
      context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
      return true
    }
    return drawn ? data : nil
  }

  static func recognizeText(_ image: UIImage) -> String {
    guard let cgImage = image.cgImage else { return "" }
    // Pass 1: Latin only, no autocorrection, so "0123 R" and "MH3 • JP" stay exact.
    let latin = VNRecognizeTextRequest()
    latin.recognitionLevel = .accurate
    latin.usesLanguageCorrection = false
    latin.recognitionLanguages = ["en-US"]
    // Pass 2: whatever language the card is in.
    let any = VNRecognizeTextRequest()
    any.recognitionLevel = .accurate
    any.automaticallyDetectsLanguage = true
    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up)
    try? handler.perform([latin, any])
    // Vision's y axis points up: sort top to bottom so the small print ends last.
    let lines = { (request: VNRecognizeTextRequest) -> [String] in
      (request.results ?? [])
        .sorted { $0.boundingBox.minY > $1.boundingBox.minY }
        .compactMap { $0.topCandidates(1).first?.string }
    }
    return (lines(any) + lines(latin)).joined(separator: "\n")
  }
}

private final class CardCameraDelegate: NSObject, VNDocumentCameraViewControllerDelegate {
  private let onFinish: ([UIImage]) -> Void
  private var finished = false

  init(onFinish: @escaping ([UIImage]) -> Void) {
    self.onFinish = onFinish
  }

  func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
    let images = (0..<scan.pageCount).map { scan.imageOfPage(at: $0) }
    controller.dismiss(animated: true)
    finish(images)
  }

  func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
    controller.dismiss(animated: true)
    finish([])
  }

  func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
    controller.dismiss(animated: true)
    finish([])
  }

  private func finish(_ images: [UIImage]) {
    guard !finished else { return }
    finished = true
    onFinish(images)
  }
}
