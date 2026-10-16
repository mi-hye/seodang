import UIKit
import Capacitor
import AVFoundation
import CryptoKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = SeodangBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

// Local system speech bridge; no external service or generated audio files.
class SeodangBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SeodangSpeechPlugin())
        bridge?.registerPluginInstance(SeodangUIPlugin())
        bridge?.registerPluginInstance(SeodangAudioPlugin())
    }
}

@objc(SeodangSpeechPlugin)
class SeodangSpeechPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    let identifier = "SeodangSpeechPlugin"
    let jsName = "SeodangSpeech"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkVoice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]
    private let synthesizer = AVSpeechSynthesizer()
    private var voiceNoticeShown = false
    private var voiceNoticeOpen = false
    private var pendingSpeech: [ObjectIdentifier: CAPPluginCall] = [:]
    private var inactiveObserver: NSObjectProtocol?

    override func load() {
        synthesizer.delegate = self
        synthesizer.usesApplicationAudioSession = false
        inactiveObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.willResignActiveNotification, object: nil, queue: .main
        ) { [weak self] _ in self?.synthesizer.stopSpeaking(at: .immediate) }
    }

    deinit {
        if let observer = inactiveObserver { NotificationCenter.default.removeObserver(observer) }
    }

    // Downloaded voices are discovered on every request, including after returning from Settings.
    // Apple quality values rank default < enhanced < premium. Preserve the system voice on ties.
    private func preferredVoice(language: String) -> AVSpeechSynthesisVoice? {
        let systemVoice = AVSpeechSynthesisVoice(language: language)
        let voices = AVSpeechSynthesisVoice.speechVoices().filter { $0.language == language }
        return voices.sorted { a, b in
            if a.identifier == b.identifier { return false }
            if a.quality != b.quality { return a.quality.rawValue > b.quality.rawValue }
            if a.identifier == systemVoice?.identifier { return true }
            if b.identifier == systemVoice?.identifier { return false }
            return a.identifier < b.identifier
        }.first ?? systemVoice
    }

    @objc func checkVoice(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let voice = self.preferredVoice(language: "ja-JP")
            let highQuality = voice.map { $0.quality.rawValue > AVSpeechSynthesisVoiceQuality.default.rawValue } ?? false
            let force = call.getBool("force") ?? false
            if !force && (highQuality || self.voiceNoticeShown) && !self.voiceNoticeOpen {
                call.resolve(["proceed": true, "highQuality": highQuality])
                return
            }
            guard !self.voiceNoticeOpen,
                  UIApplication.shared.applicationState == .active,
                  let controller = self.bridge?.viewController,
                  controller.presentedViewController == nil else {
                call.resolve(["proceed": false, "highQuality": highQuality])
                return
            }
            self.voiceNoticeOpen = true
            self.voiceNoticeShown = true
            let path = "설정 → 손쉬운 사용 → 읽기 및 말하기 → 음성 → 일본어"
            let message = highQuality
                ? "\(voice?.name ?? "일본어") 음성을 사용하고 있어요."
                : "\(path)\n\n고급 또는 프리미엄 음성을 다운로드해 주세요. 설치는 iPhone 설정에서 직접 진행해야 해요."
            let alert = UIAlertController(title: highQuality ? "고급 음성 사용 중" : "고급 일본어 음성을 설치해 주세요", message: message, preferredStyle: .alert)
            if !highQuality {
                alert.addAction(UIAlertAction(title: "설치 경로 복사", style: .default) { _ in
                    UIPasteboard.general.string = path
                    self.voiceNoticeOpen = false
                    call.resolve(["proceed": false, "highQuality": false])
                })
            }
            alert.addAction(UIAlertAction(title: highQuality ? "확인" : "기본 음성 사용", style: .cancel) { _ in
                self.voiceNoticeOpen = false
                call.resolve(["proceed": true, "highQuality": highQuality])
            })
            controller.present(alert, animated: true)
        }
    }

    @objc func speak(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty,
              let language = call.getString("locale"), ["ja-JP", "ko-KR"].contains(language) else {
            call.reject("읽을 문장이나 언어가 올바르지 않아요.")
            return
        }
        DispatchQueue.main.async {
            guard UIApplication.shared.applicationState == .active else {
                call.reject("앱이 활성 상태가 아니에요.")
                return
            }
            guard let voice = self.preferredVoice(language: language) else {
                call.reject("이 언어의 기기 음성을 사용할 수 없어요.")
                return
            }
            self.synthesizer.stopSpeaking(at: .immediate)
            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = voice
            utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.9
            self.pendingSpeech[ObjectIdentifier(utterance)] = call
            self.synthesizer.speak(utterance)
        }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        pendingSpeech.removeValue(forKey: ObjectIdentifier(utterance))?.resolve()
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        pendingSpeech.removeValue(forKey: ObjectIdentifier(utterance))?.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.synthesizer.stopSpeaking(at: .immediate)
            call.resolve()
        }
    }
}

// Keep destructive confirmation in the learning interface language, not the device language.
@objc(SeodangUIPlugin)
class SeodangUIPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "SeodangUIPlugin"
    let jsName = "SeodangUI"
    let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "confirmDelete", returnType: CAPPluginReturnPromise)]
    @objc func confirmDelete(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let controller = self.bridge?.viewController else { call.resolve(["confirmed": false]); return }
            let japanese = call.getString("locale") == "ja"
            let alert = UIAlertController(title: nil, message: japanese ? "本当に削除しますか？" : "정말 삭제하시겠습니까?", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: japanese ? "キャンセル" : "취소", style: .cancel) { _ in call.resolve(["confirmed": false]) })
            alert.addAction(UIAlertAction(title: japanese ? "削除" : "삭제", style: .destructive) { _ in call.resolve(["confirmed": true]) })
            controller.present(alert, animated: true)
        }
    }
}

// Downloaded lessons survive app restarts and upgrades, but are not backed up to iCloud.
@objc(SeodangAudioPlugin)
class SeodangAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "SeodangAudioPlugin"
    let jsName = "SeodangAudio"
    let pluginMethods: [CAPPluginMethod] = ["get", "put", "list", "clear"].map {
        CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise)
    }
    private let queue = DispatchQueue(label: "seodang.audio.storage")
    private func directory() throws -> URL {
        let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        var dir = base.appendingPathComponent("SeodangAudio-v1", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        var values = URLResourceValues(); values.isExcludedFromBackup = true
        try dir.setResourceValues(values)
        return dir
    }
    private func file(_ call: CAPPluginCall) throws -> URL {
        guard let key = call.getString("key"), key.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else {
            throw NSError(domain: "SeodangAudio", code: 1)
        }
        return try directory().appendingPathComponent(key + ".m4a")
    }
    private func valid(_ data: Data, _ call: CAPPluginCall) -> Bool {
        data.count == call.getInt("bytes") && SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() == call.getString("key")
    }
    @objc func get(_ call: CAPPluginCall) { queue.async {
        do {
            let url = try self.file(call)
            guard let data = try? Data(contentsOf: url) else { call.resolve([:]); return }
            guard self.valid(data, call) else { try? FileManager.default.removeItem(at: url); call.resolve([:]); return }
            call.resolve(["uri": url.absoluteString])
        } catch { call.reject("Audio storage unavailable", nil, error) }
    }}
    @objc func put(_ call: CAPPluginCall) { queue.async {
        do {
            let url = try self.file(call)
            guard let encoded = call.getString("data"), let data = Data(base64Encoded: encoded), self.valid(data, call) else {
                call.reject("Invalid audio download"); return
            }
            try data.write(to: url, options: .atomic)
            call.resolve(["uri": url.absoluteString])
        } catch { call.reject("Cannot save audio", nil, error) }
    }}
    @objc func list(_ call: CAPPluginCall) { queue.async {
        do {
            let files = try FileManager.default.contentsOfDirectory(at: self.directory(), includingPropertiesForKeys: [.fileSizeKey]).filter { $0.pathExtension == "m4a" }
            let bytes = try files.reduce(0) { try $0 + ($1.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0) }
            call.resolve(["count": files.count, "bytes": bytes])
        } catch { call.reject("Cannot read downloads", nil, error) }
    }}
    @objc func clear(_ call: CAPPluginCall) { queue.async {
        do { try FileManager.default.removeItem(at: self.directory()); call.resolve() }
        catch { call.reject("Cannot delete downloads", nil, error) }
    }}
}
