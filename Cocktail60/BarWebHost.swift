import Foundation
import WebKit

/// The same local bundle powers iOS, macOS, and the browser. No remote content is loaded.
final class BarWebHost: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    static let storageKey = "sharedBarStateV1"
    private let onSave: ([String: Any]) -> Void
    private var resourceRoot: URL?

    init(onSave: @escaping ([String: Any]) -> Void = { _ in }) {
        self.onSave = onSave
    }

    func makeWebView(bootstrap: [String: Any] = [:]) -> WKWebView {
        var initial = bootstrap
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
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
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
        onSave(state)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        decisionHandler(isLocalResource(url) || url.absoluteString == "about:blank" ? .allow : .cancel)
    }

    private func isLocalResource(_ url: URL) -> Bool {
        guard url.isFileURL, let root = resourceRoot else { return false }
        return url.standardizedFileURL.path.hasPrefix(root.path + "/")
    }
}
