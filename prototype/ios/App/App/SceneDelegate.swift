import UIKit
import Capacitor
import AVFoundation
import CryptoKit
import Speech
import WebKit

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
        // Keep fixed navigation still at the scroll edges and hide native indicators.
        if let scrollView = bridge?.webView?.scrollView {
            scrollView.bounces = false
            scrollView.alwaysBounceVertical = false
            scrollView.alwaysBounceHorizontal = false
            scrollView.showsVerticalScrollIndicator = false
            scrollView.showsHorizontalScrollIndicator = false
        }
        bridge?.registerPluginInstance(SeodangSpeechPlugin())
        bridge?.registerPluginInstance(SeodangUIPlugin())
        bridge?.registerPluginInstance(SeodangAudioPlugin())
        bridge?.registerPluginInstance(SeodangRecognitionPlugin())
        bridge?.registerPluginInstance(SeodangVideoPlugin())
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
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "confirmDelete", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "correctAnswer", returnType: CAPPluginReturnPromise)
    ]
    @objc func correctAnswer(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard UIApplication.shared.applicationState == .active else { call.resolve(); return }
            let feedback = UIImpactFeedbackGenerator(style: .medium)
            feedback.prepare()
            feedback.impactOccurred(intensity: 0.65)
            call.resolve()
        }
    }
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

// Speech practice stays on device. No audio file, server fallback, or transcript logging.
@objc(SeodangRecognitionPlugin)
class SeodangRecognitionPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "SeodangRecognitionPlugin"
    let jsName = "SeodangRecognition"
    let pluginMethods: [CAPPluginMethod] = ["status", "recognize", "finish", "cancel"].map {
        CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise)
    }
    private let engine = AVAudioEngine()
    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var pending: CAPPluginCall?
    private var timeout: DispatchWorkItem?
    private var session = UUID()
    private var tapped = false
    private var text = ""
    private var alternatives: [String] = []
    private var ending = false
    private var waitingToBegin: UUID?
    @objc func status(_ call: CAPPluginCall) { call.resolve(["readyEvents": true]) }
    override func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(interrupted(_:)), name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(interrupted(_:)), name: AVAudioSession.interruptionNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(becameActive), name: UIApplication.didBecomeActiveNotification, object: nil)
    }
    @objc private func interrupted(_ notification: Notification) {
        if notification.name == AVAudioSession.interruptionNotification,
           (notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt) != AVAudioSession.InterruptionType.began.rawValue { return }
        DispatchQueue.main.async { self.complete(code: "INTERRUPTED") }
    }
    @objc private func becameActive() {
        DispatchQueue.main.async {
            guard let id = self.waitingToBegin, self.session == id, self.pending != nil else { return }
            self.waitingToBegin = nil; self.timeout?.cancel(); self.timeout = nil
            self.beginWhenActive(id: id)
        }
    }
    private func beginWhenActive(id: UUID) {
        guard session == id, pending != nil else { return }
        if UIApplication.shared.applicationState == .active { begin(id: id); return }
        guard UIApplication.shared.applicationState != .background else { complete(code: "INTERRUPTED"); return }
        // Permission alerts can close before the app has become active again.
        waitingToBegin = id
        let work = DispatchWorkItem { [weak self] in guard let self, self.session == id else { return }; self.complete(code: "INTERRUPTED") }
        timeout = work; DispatchQueue.main.asyncAfter(deadline: .now() + 8, execute: work)
    }
    private func complete(code: String? = nil) {
        guard pending != nil else { return }
        let call = pending, result = text, candidates = alternatives
        pending = nil; session = UUID(); timeout?.cancel(); timeout = nil
        engine.stop()
        if tapped { engine.inputNode.removeTap(onBus: 0); tapped = false }
        request?.endAudio(); task?.cancel(); task = nil; request = nil; recognizer = nil; text = ""
        alternatives = []; ending = false; waitingToBegin = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        if let code { call?.reject(code, code) } else { call?.resolve(["text": result, "alternatives": candidates]) }
    }
    @objc func recognize(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.complete(code: "CANCELLED")
            self.pending = call; let id = self.session
            let locale = call.getString("locale") ?? "ko-KR"
            guard ["ko-KR", "ja-JP"].contains(locale), let recognizer = SFSpeechRecognizer(locale: Locale(identifier: locale)), recognizer.supportsOnDeviceRecognition else {
                self.complete(code: "ON_DEVICE_UNAVAILABLE"); return
            }
            self.recognizer = recognizer
            SFSpeechRecognizer.requestAuthorization { status in
                DispatchQueue.main.async {
                    guard self.session == id, self.pending != nil else { return }
                    guard status == .authorized else { self.complete(code: "PERMISSION_DENIED"); return }
                    AVAudioSession.sharedInstance().requestRecordPermission { allowed in
                        DispatchQueue.main.async {
                            guard self.session == id, self.pending != nil else { return }
                            guard allowed else { self.complete(code: "PERMISSION_DENIED"); return }
                            self.beginWhenActive(id: id)
                        }
                    }
                }
            }
        }
    }
    private func begin(id: UUID) {
        guard let recognizer, recognizer.isAvailable, recognizer.supportsOnDeviceRecognition else { complete(code: "ON_DEVICE_UNAVAILABLE"); return }
        do {
            let audio = AVAudioSession.sharedInstance()
            try audio.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audio.setActive(true)
            let request = SFSpeechAudioBufferRecognitionRequest()
            request.requiresOnDeviceRecognition = true
            request.shouldReportPartialResults = true
            self.request = request
            let input = engine.inputNode, format = input.outputFormat(forBus: 0)
            guard format.sampleRate > 0, format.channelCount > 0 else { complete(code: "AUDIO_UNAVAILABLE"); return }
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in request.append(buffer) }
            tapped = true
            task = recognizer.recognitionTask(with: request) { result, error in
                DispatchQueue.main.async {
                    guard self.session == id, self.pending != nil else { return }
                    if let result {
                        self.text = result.bestTranscription.formattedString
                        self.alternatives = Array(result.transcriptions.prefix(3)).map { $0.formattedString }
                    }
                    if result?.isFinal == true { self.complete() }
                    else if error != nil { self.complete(code: self.text.isEmpty ? "RECOGNITION_FAILED" : nil) }
                }
            }
            engine.prepare(); try engine.start()
            notifyListeners("ready", data: ["requestId": pending?.getString("requestId") ?? ""])
            let work = DispatchWorkItem { [weak self] in guard let self, self.session == id else { return }; self.endInput(id: id) }
            timeout = work; DispatchQueue.main.asyncAfter(deadline: .now() + 20, execute: work)
        } catch { complete(code: "AUDIO_UNAVAILABLE") }
    }
    private func endInput(id: UUID) {
        guard session == id, pending != nil, !ending else { return }
        ending = true
        engine.stop()
        if tapped { engine.inputNode.removeTap(onBus: 0); tapped = false }
        request?.endAudio(); timeout?.cancel()
        let work = DispatchWorkItem { [weak self] in guard let self, self.session == id else { return }; self.complete() }
        timeout = work; DispatchQueue.main.asyncAfter(deadline: .now() + 4, execute: work)
    }
    @objc func finish(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.endInput(id: self.session); call.resolve() }
    }
    @objc func cancel(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.complete(code: "CANCELLED"); call.resolve() }
    }
}


// Inline child WebView supplies the HTTPS identity missing from capacitor://.
@objc(SeodangVideoPlugin)
class SeodangVideoPlugin: CAPPlugin, CAPBridgedPlugin, WKUIDelegate, WKNavigationDelegate {
    let identifier = "SeodangVideoPlugin"
    let jsName = "SeodangVideo"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "mount", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "layout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise)
    ]
    private var player: WKWebView?
    private var token: String?

    @objc func mount(_ call: CAPPluginCall) {
        guard let videoID = call.getString("videoId"), let token = call.getString("token"),
              ["xRlcrGXwtrA", "PZGxO0qCKRg", "pQ8lfI_W2To", "X3Y9esqDspY", "r5m1bfVUfSQ", "DddirskV5Vo", "sczKFlBP1Y4", "JPZfvT5zTBE", "sst8SX32Yhw", "cE8wVmwY7VY", "F50dzv9H9sU", "VZBU8LvZ91Q", "Eze6-eHmtJg", "0xSiBpUdW4E", "BzYnNdJhZQw", "xRbPAVnqtcs", "EIz09kLzN9k", "UM9XNpgrqVk", "jhOVibLEDhA", "4DxL6IKmXx4", "Y4nEEZwckuU", "J5Z7tIq7bco", "iqEr3P78fz8", "SX_ViT4Ra7k", "TQ8WlA2GXbk", "-VKIqrvVOpo", "vnS_jn2uibs", "D1PvIWdJ8xo", "SK6Sm2Ki9tI", "BS7tz2rAOSA", "d9IxdwEFk1c", "xEeFrLSkMm8", "j1uXcHwLhHM", "m3DZsBw5bnE", "4HG_CJzyX6A"].contains(videoID) else {
            call.reject("Unknown lesson video"); return
        }
        let start = call.getInt("startSeconds") ?? 0
        let end = call.getInt("endSeconds") ?? 0
        guard start >= 0, end == 0 || end > start else {
            call.reject("Invalid clip bounds"); return
        }
        DispatchQueue.main.async {
            guard let host = self.bridge?.webView else { call.reject("WebView unavailable"); return }
            self.removePlayer()
            self.token = token
            let configuration = WKWebViewConfiguration()
            configuration.websiteDataStore = .nonPersistent()
            configuration.allowsInlineMediaPlayback = true
            let player = WKWebView(frame: .zero, configuration: configuration)
            player.uiDelegate = self; player.navigationDelegate = self
            player.isOpaque = false; player.backgroundColor = .black
            player.scrollView.isScrollEnabled = false
            self.player = player
            // Shares the lesson's native scroll container, so it scrolls with the text.
            host.scrollView.addSubview(player)
            self.applyFrame(call)
            let identity = "https://" + (Bundle.main.bundleIdentifier ?? "com.mihye.seodang").lowercased()
            let bounds = "&start=\(start)" + (end > 0 ? "&end=\(end)" : "")
            guard let controlsURL = Bundle.main.url(forResource: "youtube-captions", withExtension: "js", subdirectory: "public/src"),
                  let controls = try? String(contentsOf: controlsURL, encoding: .utf8) else {
                self.removePlayer(); call.reject("Player controls unavailable"); return
            }
            let html = """
            <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body{margin:0;width:100%;height:100%;background:#000}iframe{display:block;width:100%;height:100%;border:0}</style></head><body><iframe src="https://www.youtube.com/embed/\(videoID)?playsinline=1&autoplay=0&enablejsapi=1&cc_load_policy=0&origin=\(identity)\(bounds)" title="YouTube" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe><script type="module">\(controls)
            mountCaptionDefaults(document.querySelector("iframe"));
            </script></body></html>
            """
            player.loadHTMLString(html, baseURL: URL(string: identity))
            call.resolve()
        }
    }
    @objc func layout(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if self.token == call.getString("token") { self.applyFrame(call) }
            call.resolve()
        }
    }
    private func applyFrame(_ call: CAPPluginCall) {
        guard let host = bridge?.webView, let player = player else { return }
        let viewport = call.getDouble("viewportWidth") ?? Double(host.bounds.width)
        let scale = host.bounds.width / max(1, CGFloat(viewport))
        let offset = host.scrollView.contentOffset
        player.frame = CGRect(x: CGFloat(call.getDouble("x") ?? 0) * scale + offset.x,
                              y: CGFloat(call.getDouble("y") ?? 0) * scale + offset.y,
                              width: CGFloat(call.getDouble("width") ?? 200) * scale,
                              height: CGFloat(call.getDouble("height") ?? 200) * scale)
        let hidden = call.getBool("hidden") ?? false
        if hidden && !player.isHidden {
            // Pause before settings or backgrounding; never resume without a user tap.
            player.evaluateJavaScript("document.querySelector('iframe')?.contentWindow.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}), 'https://www.youtube.com')", completionHandler: nil)
        }
        player.isHidden = hidden
    }
    @objc func remove(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if self.token == call.getString("token") { self.removePlayer() }
            call.resolve()
        }
    }
    private func removePlayer() {
        player?.stopLoading()
        player?.loadHTMLString("", baseURL: nil)
        player?.removeFromSuperview()
        player = nil; token = nil
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, url.scheme == "https" { UIApplication.shared.open(url) }
        return nil
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.targetFrame?.isMainFrame == true, navigationAction.navigationType == .linkActivated,
           let url = navigationAction.request.url, url.scheme == "https" {
            UIApplication.shared.open(url); decisionHandler(.cancel); return
        }
        decisionHandler(.allow)
    }
}
