import AVFoundation
import CoreMedia
import Foundation

let arguments = CommandLine.arguments
guard arguments.count == 3 else {
    fputs("usage: crop_video.swift input.mov output.mp4\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: arguments[1])
let outputURL = URL(fileURLWithPath: arguments[2])
try? FileManager.default.removeItem(at: outputURL)

let asset = AVURLAsset(url: inputURL)
let semaphore = DispatchSemaphore(value: 0)
var resultCode: Int32 = 1

Task {
    do {
        guard let sourceTrack = try await asset.loadTracks(withMediaType: .video).first else {
            throw NSError(domain: "CropVideo", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track"])
        }
        let sourceSize = try await sourceTrack.load(.naturalSize)
        fputs("source: \(Int(sourceSize.width))x\(Int(sourceSize.height))\n", stderr)

        let composition = AVMutableComposition()
        guard let compositionTrack = composition.addMutableTrack(
            withMediaType: .video,
            preferredTrackID: kCMPersistentTrackID_Invalid
        ) else {
            throw NSError(domain: "CropVideo", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot create track"])
        }

        let duration = try await asset.load(.duration)
        try compositionTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceTrack, at: .zero)

        // Crop the visible Seodang web-app window from the desktop recording,
        // then scale it to an Instagram-ready 9:16 canvas.
        let cropX: CGFloat = 620
        let cropY: CGFloat = 840
        let cropWidth: CGFloat = 818
        let cropHeight: CGFloat = cropWidth * 16.0 / 9.0
        let scale: CGFloat = 1080.0 / cropWidth

        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = CMTimeRange(start: .zero, duration: duration)
        let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionTrack)
        let transform = CGAffineTransform(
            a: scale,
            b: 0,
            c: 0,
            d: scale,
            tx: -cropX * scale,
            ty: -cropY * scale
        )
        layerInstruction.setTransform(transform, at: .zero)
        instruction.layerInstructions = [layerInstruction]

        let videoComposition = AVMutableVideoComposition()
        videoComposition.renderSize = CGSize(width: 1080, height: 1920)
        videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
        videoComposition.instructions = [instruction]

        guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
            throw NSError(domain: "CropVideo", code: 3, userInfo: [NSLocalizedDescriptionKey: "Cannot create exporter"])
        }
        exporter.outputURL = outputURL
        exporter.outputFileType = .mp4
        exporter.videoComposition = videoComposition
        await exporter.export()

        if exporter.status == .completed {
            resultCode = 0
        } else {
            throw exporter.error ?? NSError(domain: "CropVideo", code: 4)
        }
    } catch {
        fputs("\(error)\n", stderr)
    }
    semaphore.signal()
}

semaphore.wait()
exit(resultCode)
