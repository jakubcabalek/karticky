// Ikona Swift aplikace: swift scripts/swift-icon.swift swift/Karticky/Resources/Assets.xcassets/AppIcon.appiconset/icon.png
import AppKit
// Ikona Kartiček: vějíř tří karet, jantarová přední, teplé tmavé pozadí. Bez fialové, bez alfy.
let size = 1024
let cg = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(cgContext: cg, flipped: false)
func c(_ h: UInt32) -> NSColor { NSColor(deviceRed: CGFloat((h>>16)&255)/255, green: CGFloat((h>>8)&255)/255, blue: CGFloat(h&255)/255, alpha: 1) }
let bg = NSGradient(starting: c(0x2A211A), ending: c(0x14100C))!
bg.draw(in: NSRect(x: 0, y: 0, width: size, height: size), angle: -90)
let ctx = NSGraphicsContext.current!.cgContext
func card(_ cx: CGFloat, _ cy: CGFloat, _ angle: CGFloat, _ fill: NSGradient, outline: Bool) {
    ctx.saveGState()
    ctx.translateBy(x: cx, y: cy); ctx.rotate(by: angle * .pi / 180)
    let w: CGFloat = 360, h: CGFloat = 500
    let r = NSRect(x: -w/2, y: -h/2, width: w, height: h)
    if outline {
        let o = NSBezierPath(roundedRect: r.insetBy(dx: -14, dy: -14), xRadius: 40, yRadius: 40)
        c(0x1C1612).setFill(); o.fill()
    }
    let p = NSBezierPath(roundedRect: r, xRadius: 28, yRadius: 28)
    fill.draw(in: p, angle: -60)
    ctx.restoreGState()
}
card(400, 500, 14, NSGradient(starting: c(0x5C9BD1), ending: c(0x2D5778))!, outline: false)
card(500, 515, 4, NSGradient(starting: c(0x9CC870), ending: c(0x3F6328))!, outline: true)
card(605, 500, -8, NSGradient(starting: c(0xF6C27A), ending: c(0xE8973A))!, outline: true)
NSGraphicsContext.restoreGraphicsState()
let rep = NSBitmapImageRep(cgImage: cg.makeImage()!)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
