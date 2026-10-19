import AVFoundation
import Foundation
let root=URL(fileURLWithPath:CommandLine.arguments[1])
for (i,lang) in ["ko","ja"].enumerated(){
 let a=AVURLAsset(url:root.appendingPathComponent("seodang-konbini-\(lang)-v2.mp4"))
 let d=try await a.load(.duration)
 let e=AVAssetExportSession(asset:a,presetName:AVAssetExportPresetPassthrough)!
 e.timeRange=CMTimeRange(start:.zero,duration:CMTimeSubtract(d,CMTime(seconds:4,preferredTimescale:600)))
 let url=root.appendingPathComponent("publish/0\(i+1)-\(lang).mp4")
 try await e.export(to:url,as:.mp4)
 let b=AVURLAsset(url:url);print("\(url.lastPathComponent): \(CMTimeGetSeconds(try await b.load(.duration)))s, audio=\(try await b.loadTracks(withMediaType:.audio).count)")
}
