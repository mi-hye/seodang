import AVFoundation
import Foundation

let root=URL(fileURLWithPath:CommandLine.arguments[1])
for (lang,clip) in [("ko","shop-count"),("ja","korean.3-2.1")] {
 let source=AVURLAsset(url:root.appendingPathComponent("seodang-konbini-\(lang).mp4"))
 let audio=AVURLAsset(url:root.appendingPathComponent("published-audio/\(clip).m4a"))
 let duration=try await source.load(.duration),audioDuration=try await audio.load(.duration)
 let videoTrack=try await source.loadTracks(withMediaType:.video)[0]
 let audioTrack=try await audio.loadTracks(withMediaType:.audio)[0]
 let composition=AVMutableComposition()
 try composition.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid)!.insertTimeRange(CMTimeRange(start:.zero,duration:duration),of:videoTrack,at:.zero)
 let track=composition.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!
 try track.insertTimeRange(CMTimeRange(start:.zero,duration:audioDuration),of:audioTrack,at:.zero)
 // The lesson uses 0.8x playback with pitch preservation.
 track.scaleTimeRange(CMTimeRange(start:.zero,duration:audioDuration),toDuration:CMTimeMultiplyByFloat64(audioDuration,multiplier:1.25))
 let params=AVMutableAudioMixInputParameters(track:track);params.audioTimePitchAlgorithm = .spectral
 let mix=AVMutableAudioMix();mix.inputParameters=[params]
 let output=root.appendingPathComponent("seodang-konbini-\(lang)-v2.mp4")
 try? FileManager.default.removeItem(at:output)
 let export=AVAssetExportSession(asset:composition,presetName:AVAssetExportPresetHighestQuality)!
 export.audioMix=mix;export.shouldOptimizeForNetworkUse=true
 try await export.export(to:output,as:.mp4)
 let result=AVURLAsset(url:output),tracks=try await result.loadTracks(withMediaType:.audio)
 print("\(lang): \(output.lastPathComponent), \(CMTimeGetSeconds(try await result.load(.duration)))s; audio tracks=\(tracks.count); source=\(clip).m4a, pitch-preserving 0.8x")
}
