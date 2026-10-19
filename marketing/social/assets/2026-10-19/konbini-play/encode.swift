import AVFoundation
import AppKit
import Foundation
import ImageIO

struct Shot:Decodable {let file:String;let time:Double;let phase:String}
struct Capture:Decodable {let lang:String;let shots:[Shot];let audio:String}
let dir=URL(fileURLWithPath:CommandLine.arguments[1]),lang=CommandLine.arguments[2]
let capture=try JSONDecoder().decode(Capture.self,from:Data(contentsOf:dir.appendingPathComponent("\(lang)-capture.json")))
let raw=dir.appendingPathComponent("\(lang)-silent.mp4"),output=dir.appendingPathComponent("seodang-konbini-\(lang).mp4")
for u in [raw,output]{try? FileManager.default.removeItem(at:u)}
let W=1080,H=1920,fps:Int32=30
let end=capture.shots.last!.time+0.3,duration=end+4
let writer=try AVAssetWriter(outputURL:raw,fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:6_000_000,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel]])
let attrs:[String:Any]=[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA,kCVPixelBufferWidthKey as String:W,kCVPixelBufferHeightKey as String:H]
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:attrs)
writer.add(input);writer.startWriting();writer.startSession(atSourceTime:.zero)
func load(_ file:String)->CGImage{let u=dir.appendingPathComponent(file);return CGImageSourceCreateImageAtIndex(CGImageSourceCreateWithURL(u as CFURL,nil)!,0,nil)!}
let images=capture.shots.map{load($0.file)}
let cream=NSColor(calibratedRed:0.969,green:0.933,blue:0.882,alpha:1),amber=NSColor(calibratedRed:0.941,green:0.741,blue:0.459,alpha:1)
func text(_ s:String,_ top:CGFloat,_ size:CGFloat,_ color:NSColor,_ height:CGFloat=90){
 let p=NSMutableParagraphStyle();p.alignment = .center;p.lineSpacing=8
 let a:[NSAttributedString.Key:Any]=[.font:NSFont.systemFont(ofSize:size,weight:.semibold),.foregroundColor:color,.paragraphStyle:p]
 (s as NSString).draw(in:NSRect(x:70,y:CGFloat(H)-top-height,width:940,height:height),withAttributes:a)
}
var shotIndex=0
for f in 0..<Int(duration*Double(fps)){
 let time=Double(f)/Double(fps)
 while shotIndex+1<capture.shots.count&&capture.shots[shotIndex+1].time<=time{shotIndex+=1}
 var buffer:CVPixelBuffer?;CVPixelBufferCreate(kCFAllocatorDefault,W,H,kCVPixelFormatType_32BGRA,attrs as CFDictionary,&buffer)
 let b=buffer!;CVPixelBufferLockBaseAddress(b,[])
 let ctx=CGContext(data:CVPixelBufferGetBaseAddress(b),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(b),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGBitmapInfo.byteOrder32Little.rawValue|CGImageAlphaInfo.premultipliedFirst.rawValue)!
 ctx.setFillColor(CGColor(red:0.09,green:0.08,blue:0.11,alpha:1));ctx.fill(CGRect(x:0,y:0,width:W,height:H))
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:false)
 if time<end{
  text(lang=="ko" ? "일본 편의점에서 물 두 병 사기" : "韓国のコンビニで、水を二本。",58,46,cream)
  let phase=capture.shots[shotIndex].phase
  let sub=lang=="ko" ? (phase=="listen" ? "먼저 듣고" : phase=="correct" ? "직접 문장을 완성해요" : "말을 순서대로 골라보세요") : (phase=="listen" ? "まずは音声を聞いて" : phase=="next" ? "次は、袋をお願いしてみよう" : "場面に合うひとことを選ぼう")
  text(sub,123,32,amber,60)
  ctx.saveGState();let rect=CGRect(x:100,y:134,width:880,height:1566);ctx.addPath(CGPath(roundedRect:rect,cornerWidth:26,cornerHeight:26,transform:nil));ctx.clip();ctx.draw(images[shotIndex],in:rect);ctx.restoreGState()
  text(lang=="ko" ? "서당 · 한국어로 배우는 일본어" : "ソダン · 日本語で学ぶ韓国語",1815,30,cream,60)
 }else{
  text(lang=="ko" ? "물 두 병 주세요." : "水を二本ください。",470,65,cream,110)
  text(lang=="ko" ? "水を二本ください。" : "물 두 병 주세요.",610,56,amber,110)
  text(lang=="ko" ? "이번엔 직접 해볼까요?" : "今度は、自分でやってみよう。",870,46,cream,100)
  text(lang=="ko" ? "프로필 링크 → 편의점 학습 체험" : "プロフィールのリンク → コンビニ体験",1010,34,amber,100)
  text(lang=="ko" ? "글자부터 상황별 회화까지, 서당" : "ハングルから場面別会話まで、ソダン",1390,34,cream,90)
 }
 NSGraphicsContext.restoreGraphicsState();CVPixelBufferUnlockBaseAddress(b,[])
 while !input.isReadyForMoreMediaData{Thread.sleep(forTimeInterval:0.002)}
 guard adaptor.append(b,withPresentationTime:CMTime(value:Int64(f),timescale:fps)) else{fatalError("append failed")}
}
input.markAsFinished();await writer.finishWriting();guard writer.status == .completed else{throw writer.error!}
let composition=AVMutableComposition(),video=AVURLAsset(url:raw)
let vt=try await video.loadTracks(withMediaType:.video)[0],vd=try await video.load(.duration)
try composition.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid)!.insertTimeRange(CMTimeRange(start:.zero,duration:vd),of:vt,at:.zero)
let audioURL=URL(fileURLWithPath:CommandLine.arguments[3]).appendingPathComponent(capture.audio)
let audio=AVURLAsset(url:audioURL),at=try await audio.loadTracks(withMediaType:.audio)[0],ad=try await audio.load(.duration)
let ct=composition.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!
try ct.insertTimeRange(CMTimeRange(start:.zero,duration:ad),of:at,at:.zero)
ct.scaleTimeRange(CMTimeRange(start:.zero,duration:ad),toDuration:CMTimeMultiplyByFloat64(ad,multiplier:1.25))
let exporter=AVAssetExportSession(asset:composition,presetName:AVAssetExportPresetHighestQuality)!
exporter.outputURL=output;exporter.outputFileType = .mp4;exporter.shouldOptimizeForNetworkUse=true
await exporter.export();guard exporter.status == .completed else{throw exporter.error!}
print("\(output.path) | \(duration)s | 1080x1920 | 30fps | audio 0.8x")
