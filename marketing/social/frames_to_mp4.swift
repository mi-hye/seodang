import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

guard CommandLine.arguments.count >= 4,
      let fps = Int32(CommandLine.arguments[3]) else {
    fputs("Usage: frames_to_mp4.swift <frames-dir> <output.mp4> <fps> [step] [repeat]\n", stderr)
    exit(2)
}

let framesDirectory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let files = try FileManager.default.contentsOfDirectory(
    at: framesDirectory,
    includingPropertiesForKeys: nil
).filter { $0.lastPathComponent.hasPrefix("frame-") && $0.pathExtension == "png" }
 .sorted { $0.lastPathComponent < $1.lastPathComponent }
let step = CommandLine.arguments.count > 4 ? max(1, Int(CommandLine.arguments[4]) ?? 1) : 1
let repeats = CommandLine.arguments.count > 5 ? max(1, Int(CommandLine.arguments[5]) ?? 1) : 1
let selectedFiles = files.enumerated().compactMap { index, file in index % step == 0 ? file : nil }

guard let firstURL = files.first,
      let firstSource = CGImageSourceCreateWithURL(firstURL as CFURL, nil),
      let firstImage = CGImageSourceCreateImageAtIndex(firstSource, 0, nil) else {
    fputs("No readable PNG frames found.\n", stderr)
    exit(3)
}

try? FileManager.default.removeItem(at: outputURL)
let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: firstImage.width,
    AVVideoHeightKey: firstImage.height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 4_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    ],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let attributes: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: firstImage.width,
    kCVPixelBufferHeightKey as String: firstImage.height,
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: input,
    sourcePixelBufferAttributes: attributes
)
guard writer.canAdd(input) else { fatalError("Cannot add video input") }
writer.add(input)
guard writer.startWriting() else { throw writer.error! }
writer.startSession(atSourceTime: .zero)

let colorSpace = CGColorSpaceCreateDeviceRGB()
let outputFiles = Array(repeating: selectedFiles, count: repeats).flatMap { $0 }
for (index, file) in outputFiles.enumerated() {
    while !input.isReadyForMoreMediaData { usleep(1_000) }
    guard let source = CGImageSourceCreateWithURL(file as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
          let pool = adaptor.pixelBufferPool else { continue }
    var optionalBuffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pool, &optionalBuffer)
    guard let buffer = optionalBuffer else { continue }
    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    guard let context = CGContext(
        data: CVPixelBufferGetBaseAddress(buffer),
        width: image.width,
        height: image.height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    ) else { continue }
    context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
    let time = CMTime(value: Int64(index), timescale: fps)
    guard adaptor.append(buffer, withPresentationTime: time) else {
        throw writer.error ?? NSError(domain: "FramesToMP4", code: 1)
    }
}

input.markAsFinished()
let semaphore = DispatchSemaphore(value: 0)
writer.finishWriting { semaphore.signal() }
semaphore.wait()
if writer.status != .completed {
    throw writer.error ?? NSError(domain: "FramesToMP4", code: 2)
}
print("Wrote \(outputFiles.count) frames to \(outputURL.path)")
