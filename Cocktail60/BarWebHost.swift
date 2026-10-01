import Foundation
import WebKit
#if os(macOS)
import AppKit
import UniformTypeIdentifiers
#else
import UIKit
#endif

/// The same local bundle powers iOS, macOS, and the browser. No remote content is loaded.
final class BarWebHost: NSObject, WKScriptMessageHandler, WKScriptMessageHandlerWithReply, WKNavigationDelegate, WKUIDelegate {
    static let storageKey = "sharedBarStateV1"
    static var usesEnglish: Bool {
        guard let raw = UserDefaults.standard.string(forKey: storageKey),
              let data = raw.data(using: .utf8),
              let state = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return false }
        return state["locale"] as? String == "en"
    }
    private let onSave: ([String: Any]) -> Void
    private var resourceRoot: URL?
    private var exportingImage = false

    init(onSave: @escaping ([String: Any]) -> Void = { _ in }) {
        self.onSave = onSave
    }

    func makeWebView(bootstrap: [String: Any] = [:]) -> WKWebView {
        var initial = bootstrap
        #if os(macOS)
        initial["platform"] = "macos"
        #else
        initial["platform"] = "ios"
        #endif
        if let saved = UserDefaults.standard.string(forKey: Self.storageKey) {
            initial["state"] = saved
        }
        let controller = WKUserContentController()
        if let data = try? JSONSerialization.data(withJSONObject: initial),
           let json = String(data: data, encoding: .utf8) {
            controller.addUserScript(WKUserScript(
                source: "window.barHost = \(json);",
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            ))
        }
        controller.add(self, name: "barState")
        controller.addScriptMessageHandler(self, contentWorld: .page, name: "barShare")
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        if let folder = Bundle.main.resourceURL?.appendingPathComponent("BarWeb", isDirectory: true),
           FileManager.default.fileExists(atPath: folder.appendingPathComponent("index.html").path) {
            resourceRoot = folder.standardizedFileURL
            webView.loadFileURL(folder.appendingPathComponent("index.html"), allowingReadAccessTo: folder)
        } else {
            webView.loadHTMLString("<meta name='viewport' content='width=device-width'><p>吧台资源缺失。请重新构建应用，并确认 BarWeb 文件夹已加入资源。</p>", baseURL: nil)
        }
        return webView
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              let url = message.webView?.url, isLocalResource(url),
              let raw = message.body as? String,
              raw.utf8.count <= 8_000_000,
              let data = raw.data(using: .utf8),
              let state = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              state["version"] as? Int == 1,
              state["inventory"] is [[String: Any]],
              state["favorites"] is [String] else { return }
        UserDefaults.standard.set(raw, forKey: Self.storageKey)
        #if os(macOS)
        let english = state["locale"] as? String == "en"
        message.webView?.window?.title = english ? "drinkdrinkdrunk · My home bar" : "大喝特喝 · 我的居家吧台"
        if let appMenu = NSApp.mainMenu?.items.first?.submenu {
            appMenu.items.first?.title = english ? "About drinkdrinkdrunk" : "关于大喝特喝"
            appMenu.items.last?.title = english ? "Quit DDDrunk" : "退出大喝特喝"
        }
        if let editItem = NSApp.mainMenu?.items.dropFirst().first, let editMenu = editItem.submenu {
            editItem.title = english ? "Edit" : "编辑"
            editMenu.title = editItem.title
            let titles = english ? ["Undo", "Cut", "Copy", "Paste", "Select All"] : ["撤销", "剪切", "复制", "粘贴", "全选"]
            for (item, title) in zip(editMenu.items, titles) { item.title = title }
        }
        #endif
        onSave(state)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if navigationAction.navigationType == .linkActivated, url.scheme == "https" {
            #if os(macOS)
            NSWorkspace.shared.open(url)
            #else
            UIApplication.shared.open(url)
            #endif
            decisionHandler(.cancel)
            return
        }
        decisionHandler(isLocalResource(url) || url.absoluteString == "about:blank" ? .allow : .cancel)
    }

    // Images are created by the local card renderer. Keep export independent of saved bar state.
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.name == "barShare", message.frameInfo.isMainFrame,
              let webView = message.webView, let url = webView.url, isLocalResource(url),
              let body = message.body as? [String: Any],
              let base64 = body["base64"] as? String, base64.utf8.count <= 16_000_000,
              let data = Data(base64Encoded: base64), data.count <= 12_000_000,
              data.starts(with: [137, 80, 78, 71, 13, 10, 26, 10]),
              let proposedName = body["filename"] as? String, proposedName.count <= 180,
              proposedName.hasSuffix(".png"), !proposedName.contains("/"), !proposedName.contains("\\"),
              !exportingImage else {
            replyHandler(nil, "无法导出这张图片。")
            return
        }
        #if os(macOS)
        guard let image = NSBitmapImageRep(data: data), image.pixelsWide == 1080,
              image.pixelsHigh >= 1080, image.pixelsHigh <= 8192,
              let window = webView.window else {
            replyHandler(nil, "图片无效或窗口不可用。")
            return
        }
        exportingImage = true
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.png]
        panel.nameFieldStringValue = proposedName
        panel.beginSheetModal(for: window) { [weak self] response in
            defer { self?.exportingImage = false }
            guard response == .OK, let destination = panel.url else {
                replyHandler("cancelled", nil)
                return
            }
            do {
                try data.write(to: destination, options: .atomic)
                replyHandler("saved", nil)
            } catch { replyHandler(nil, "图片保存失败，请重试。") }
        }
        #else
        guard let image = UIImage(data: data), let cgImage = image.cgImage,
              cgImage.width == 1080, cgImage.height >= 1080, cgImage.height <= 8192,
              var presenter = webView.window?.rootViewController else {
            replyHandler(nil, "图片无效或窗口不可用。")
            return
        }
        while let presented = presenter.presentedViewController { presenter = presented }
        guard !presenter.isBeingDismissed else {
            replyHandler(nil, "请稍后重试。")
            return
        }
        exportingImage = true
        let activity = UIActivityViewController(activityItems: [image], applicationActivities: nil)
        activity.popoverPresentationController?.sourceView = webView
        activity.popoverPresentationController?.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.maxY - 40, width: 1, height: 1)
        activity.completionWithItemsHandler = { [weak self] _, completed, _, error in
            self?.exportingImage = false
            if error != nil { replyHandler(nil, "图片分享失败，请重试。") }
            else { replyHandler(completed ? "completed" : "cancelled", nil) }
        }
        presenter.present(activity, animated: true)
        #endif
    }

    #if os(macOS)
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        guard let url = webView.url, isLocalResource(url), frame.isMainFrame else {
            completionHandler(nil)
            return
        }
        let panel = NSOpenPanel()
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.allowedContentTypes = [.jpeg, .png, .webP, .json]
        panel.begin { response in completionHandler(response == .OK ? panel.urls : nil) }
    }
    #endif

    private func isLocalResource(_ url: URL) -> Bool {
        guard url.isFileURL, let root = resourceRoot else { return false }
        return url.standardizedFileURL.path.hasPrefix(root.path + "/")
    }
}
