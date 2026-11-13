import AVFoundation
import CoreImage
import ExpoModulesCore
import UIKit
import Vision

// Live scanning: the camera preview fills the view, a few times a second the frame is
// searched for a card-shaped rectangle; when one is found it is straightened, shrunk
// to 244 × 340 px and its text read (Latin + any language). JS gets "onCard" with the
// pixels and text and decides when the card is recognised. No photo needs to be taken.
final class CardLiveScannerView: ExpoView, AVCaptureVideoDataOutputSampleBufferDelegate {
  let onCard = EventDispatcher()

  private let session = AVCaptureSession()
  private let previewLayer = AVCaptureVideoPreviewLayer()
  private let queue = DispatchQueue(label: "karticky.live-scanner")
  private let ciContext = CIContext()
  private var configured = false
  private var busy = false
  private var lastFrame = Date.distantPast
  private var lastFound: Bool?
  private var isActive = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black
    previewLayer.session = session
    previewLayer.videoGravity = .resizeAspectFill
    layer.addSublayer(previewLayer)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer.frame = bounds
  }

  override func removeFromSuperview() {
    setActive(false)
    super.removeFromSuperview()
  }

  func setActive(_ active: Bool) {
    isActive = active
    if !active {
      queue.async { if self.session.isRunning { self.session.stopRunning() } }
      return
    }
    AVCaptureDevice.requestAccess(for: .video) { granted in
      guard granted else {
        self.send(["found": false, "denied": true])
        return
      }
      self.queue.async {
        guard self.isActive else { return }
        self.configureIfNeeded()
        if !self.session.isRunning { self.session.startRunning() }
      }
    }
  }

  private func configureIfNeeded() {
    guard !configured else { return }
    configured = true
    session.beginConfiguration()
    session.sessionPreset = .hd1920x1080
    guard
      let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
      let input = try? AVCaptureDeviceInput(device: device),
      session.canAddInput(input)
    else {
      session.commitConfiguration()
      return
    }
    session.addInput(input)
    if (try? device.lockForConfiguration()) != nil {
      if device.isFocusModeSupported(.continuousAutoFocus) { device.focusMode = .continuousAutoFocus }
      device.unlockForConfiguration()
    }
    let output = AVCaptureVideoDataOutput()
    output.alwaysDiscardsLateVideoFrames = true
    output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
    output.setSampleBufferDelegate(self, queue: queue)
    if session.canAddOutput(output) { session.addOutput(output) }
    if let connection = output.connection(with: .video) {
      // Portrait frames, so the card is upright like on screen.
      if #available(iOS 17.0, *) {
        if connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
      } else if connection.isVideoOrientationSupported {
        connection.videoOrientation = .portrait
      }
    }
    session.commitConfiguration()
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    guard !busy, Date().timeIntervalSince(lastFrame) >= 0.3, let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    busy = true
    lastFrame = Date()
    defer { busy = false }

    let frame = CIImage(cvPixelBuffer: pixelBuffer)
    let rectangles = VNDetectRectanglesRequest()
    rectangles.minimumAspectRatio = 0.6 // a card is 63 × 88 mm ≈ 0.72
    rectangles.maximumAspectRatio = 0.85
    rectangles.minimumSize = 0.3
    rectangles.minimumConfidence = 0.6
    rectangles.quadratureTolerance = 25
    rectangles.maximumObservations = 1
    try? VNImageRequestHandler(ciImage: frame, options: [:]).perform([rectangles])

    guard let card = rectangles.results?.first else {
      if lastFound != false { send(["found": false]) }
      lastFound = false
      return
    }
    lastFound = true
    let size = frame.extent.size
    let corner = { (point: CGPoint) in CIVector(x: point.x * size.width, y: point.y * size.height) }
    var straightened = frame.applyingFilter("CIPerspectiveCorrection", parameters: [
      "inputTopLeft": corner(card.topLeft),
      "inputTopRight": corner(card.topRight),
      "inputBottomLeft": corner(card.bottomLeft),
      "inputBottomRight": corner(card.bottomRight),
    ])
    if straightened.extent.width > straightened.extent.height { straightened = straightened.oriented(.right) }
    guard let cgImage = ciContext.createCGImage(straightened, from: straightened.extent) else { return }
    let image = UIImage(cgImage: cgImage)
    send([
      "found": true,
      "width": 244,
      "height": 340,
      "rgba": CardScannerModule.rgbaPixels(image, width: 244, height: 340)?.base64EncodedString() ?? "",
      "text": CardScannerModule.recognizeText(image),
    ])
  }

  private func send(_ payload: [String: Any]) {
    DispatchQueue.main.async { self.onCard(payload) }
  }
}
