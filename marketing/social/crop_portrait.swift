import AVFoundation
import CoreGraphics
import Foundation

guard CommandLine.arguments.count == 5 else {
  fputs("usage: crop_portrait.swift INPUT OUTPUT CROP_TOP CROP_HEIGHT\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let cropTop = CGFloat(Double(CommandLine.arguments[3]) ?? 0)
let cropHeight = CGFloat(Double(CommandLine.arguments[4]) ?? 0)
let outputSize = CGSize(width: 1080, height: 1920)

let asset = AVURLAsset(url: inputURL)
let duration = try await asset.load(.duration)
guard let sourceVideoTrack = try await asset.loadTracks(withMediaType: .video).first else {
  throw NSError(domain: "CropPortrait", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing video track"])
}

let naturalSize = try await sourceVideoTrack.load(.naturalSize)
let composition = AVMutableComposition()
guard let compositionTrack = composition.addMutableTrack(
  withMediaType: .video,
  preferredTrackID: kCMPersistentTrackID_Invalid
) else {
  throw NSError(domain: "CropPortrait", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not create composition track"])
}

try compositionTrack.insertTimeRange(
  CMTimeRange(start: .zero, duration: duration),
  of: sourceVideoTrack,
  at: .zero
)

let scale = outputSize.width / naturalSize.width
let sourceAspect = naturalSize.width / cropHeight
let outputAspect = outputSize.width / outputSize.height
guard abs(sourceAspect - outputAspect) < 0.002 else {
  throw NSError(domain: "CropPortrait", code: 3, userInfo: [NSLocalizedDescriptionKey: "Crop does not match 9:16 output"])
}

let instruction = AVMutableVideoCompositionInstruction()
instruction.timeRange = CMTimeRange(start: .zero, duration: duration)

let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionTrack)
layerInstruction.setTransform(
  CGAffineTransform(a: scale, b: 0, c: 0, d: scale, tx: 0, ty: -cropTop * scale),
  at: .zero
)
instruction.layerInstructions = [layerInstruction]

let videoComposition = AVMutableVideoComposition()
videoComposition.renderSize = outputSize
videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
videoComposition.instructions = [instruction]

try? FileManager.default.removeItem(at: outputURL)
guard let exporter = AVAssetExportSession(
  asset: composition,
  presetName: AVAssetExportPresetHighestQuality
) else {
  throw NSError(domain: "CropPortrait", code: 4, userInfo: [NSLocalizedDescriptionKey: "Could not create exporter"])
}

exporter.videoComposition = videoComposition
exporter.outputURL = outputURL
exporter.outputFileType = .mp4
exporter.shouldOptimizeForNetworkUse = true
await exporter.export()

guard exporter.status == .completed else {
  throw exporter.error ?? NSError(domain: "CropPortrait", code: 5)
}

print("Wrote \(outputURL.path)")
