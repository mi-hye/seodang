import AVFoundation
import AppKit
import ImageIO
import UniformTypeIdentifiers
let dir=URL(fileURLWithPath:CommandLine.arguments[1])
for lang in ["ko","ja"]{
 let asset=AVURLAsset(url:dir.appendingPathComponent("seodang-konbini-\(lang).mp4"))
 let duration=try await asset.load(.duration),videos=try await asset.loadTracks(withMediaType:.video),audios=try await asset.loadTracks(withMediaType:.audio)
 let size=try await videos[0].load(.naturalSize),fps=try await videos[0].load(.nominalFrameRate)
 print("\(lang): \(CMTimeGetSeconds(duration))s \(size) \(fps)fps audio tracks \(audios.count)")
 let gen=AVAssetImageGenerator(asset:asset);gen.appliesPreferredTrackTransform=true
 let sheet=NSImage(size:NSSize(width:1080,height:640));sheet.lockFocus()
 for (index,t) in [1.0,9.0,CMTimeGetSeconds(duration)-1].enumerated(){
  let cg=try gen.copyCGImage(at:CMTime(seconds:t,preferredTimescale:600),actualTime:nil)
  NSImage(cgImage:cg,size:NSSize(width:1080,height:1920)).draw(in:NSRect(x:index*360,y:0,width:360,height:640))
 }
 sheet.unlockFocus();let rep=NSBitmapImageRep(data:sheet.tiffRepresentation!)!
 try rep.representation(using:.png,properties:[:])!.write(to:dir.appendingPathComponent("\(lang)-video-preview.png"))
}
