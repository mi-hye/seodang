import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let frameDir = root.appendingPathComponent("marketing/shorts/frames")
let output = root.appendingPathComponent("marketing/shorts/output/seodang-launch-short.mp4")
try? FileManager.default.removeItem(at: output)

let frameNames = ["01-hook.png", "02-levels.png", "03-study.png", "04-write.png", "05-cta.png"]
let images: [CGImage] = try frameNames.map { name in
    let url = frameDir.appendingPathComponent(name)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw NSError(domain: "SeodangPromo", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not load \(name)"])
    }
    return image
}

let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: 1080,
    AVVideoHeightKey: 1920,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 6_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    ],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let attributes: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: 1080,
    kCVPixelBufferHeightKey as String: 1920,
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attributes)
guard writer.canAdd(input) else { fatalError("Cannot add video input") }
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let fps: Int32 = 30
let secondsPerCard = 2.4
let framesPerCard = Int(Double(fps) * secondsPerCard)
var frameIndex: Int64 = 0

func pixelBuffer(for image: CGImage) -> CVPixelBuffer {
    var buffer: CVPixelBuffer?
    CVPixelBufferCreate(kCFAllocatorDefault, 1080, 1920, kCVPixelFormatType_32BGRA, attributes as CFDictionary, &buffer)
    let pixelBuffer = buffer!
    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }
    let context = CGContext(
        data: CVPixelBufferGetBaseAddress(pixelBuffer), width: 1080, height: 1920,
        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
    )!
    context.draw(image, in: CGRect(x: 0, y: 0, width: 1080, height: 1920))
    return pixelBuffer
}

for image in images {
    let buffer = pixelBuffer(for: image)
    for _ in 0..<framesPerCard {
        while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
        let time = CMTime(value: frameIndex, timescale: fps)
        guard adaptor.append(buffer, withPresentationTime: time) else { fatalError("Failed to append frame") }
        frameIndex += 1
    }
}

input.markAsFinished()
await writer.finishWriting()
guard writer.status == .completed else { throw writer.error ?? NSError(domain: "SeodangPromo", code: 2) }
print(output.path)
