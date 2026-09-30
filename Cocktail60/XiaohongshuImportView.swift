import PhotosUI
import SwiftUI
import UIKit
import WebKit

struct XiaohongshuImportView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var recipeStore: RecipeStore

    let onComplete: () -> Void

    @State private var searchText = ""
    @State private var postURLText = ""
    @State private var postText = ""
    @State private var chineseName = ""
    @State private var englishName = ""
    @State private var ingredientsText = ""
    @State private var glass = ""
    @State private var method = ""
    @State private var tagsText = ""
    @State private var note = ""
    @State private var thumbnailImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isFetchingPostURL = false
    @State private var linkFetchMessage = ""
    @State private var lastPastedShareText = ""
    @State private var webReaderURL: URL?
    @State private var isShowingWebReader = false

    private var cleanedIngredients: [String] {
        ingredientsText
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    private var cleanedTags: [String] {
        let tags = tagsText
            .split { character in
                character == "," || character == "，" || character == "、" || character == " " || character == "\n"
            }
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        let unique = NSOrderedSet(array: tags).array as? [String] ?? tags
        return unique.isEmpty ? ["小红书"] : unique
    }

    private var canAddRecipe: Bool {
        !chineseName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !cleanedIngredients.isEmpty &&
        !method.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("小红书搜索") {
                    TextField("例如：金汤力 鸡尾酒 配方", text: $searchText)

                    Button {
                        openXiaohongshuSearch()
                    } label: {
                        Label("打开小红书搜索", systemImage: "safari")
                    }
                    .disabled(searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                Section("链接读取") {
                    TextField("粘贴小红书帖子或分享链接", text: $postURLText)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    HStack(spacing: 10) {
                        Button {
                            pastePostURL()
                        } label: {
                            Label("粘贴链接", systemImage: "link.badge.plus")
                        }

                        Button {
                            fetchPostURL()
                        } label: {
                            Label(isFetchingPostURL ? "读取中" : "读取并识别", systemImage: "sparkles")
                        }
                        .disabled(isFetchingPostURL || postURLText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }

                    if isFetchingPostURL {
                        ProgressView("正在读取链接内容")
                    }

                    if !linkFetchMessage.isEmpty {
                        Text(linkFetchMessage)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    Button {
                        openWebReader()
                    } label: {
                        Label("用网页方式读取", systemImage: "safari")
                    }
                    .disabled(XiaohongshuLinkReader.normalizedURL(from: postURLText) == nil)
                }

                Section("帖子内容") {
                    Button {
                        pastePostText()
                    } label: {
                        Label("粘贴剪贴板正文", systemImage: "doc.on.clipboard")
                    }

                    TextField("把小红书帖子正文粘贴到这里", text: $postText, axis: .vertical)
                        .lineLimit(6...12)

                    Button {
                        parsePostText()
                    } label: {
                        Label("自动识别配方", systemImage: "wand.and.stars")
                    }
                    .disabled(postText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                Section("缩略图") {
                    thumbnailPreview

                    HStack(spacing: 10) {
                        Button {
                            pasteThumbnailImage()
                        } label: {
                            Label("粘贴图片", systemImage: "doc.on.clipboard")
                        }

                        PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                            Label("相册", systemImage: "photo.on.rectangle")
                        }
                    }
                }

                Section("识别结果") {
                    TextField("酒名", text: $chineseName)
                    TextField("英文名，可选", text: $englishName)
                    TextField("配料，每行一项", text: $ingredientsText, axis: .vertical)
                        .lineLimit(4...10)
                    TextField("杯型", text: $glass)
                    TextField("做法", text: $method, axis: .vertical)
                        .lineLimit(3...8)
                    TextField("标签，可用逗号分隔", text: $tagsText)
                    TextField("备注，可选", text: $note, axis: .vertical)
                        .lineLimit(2...5)
                }

                Section {
                    Button {
                        addRecipe()
                    } label: {
                        Label("一键添加到我的配方", systemImage: "plus.circle.fill")
                            .font(.headline.weight(.semibold))
                    }
                    .disabled(!canAddRecipe)
                }
            }
            .navigationTitle("小红书导入")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        dismiss()
                    }
                }
            }
            .onChange(of: selectedPhotoItem) { item in
                loadPhoto(item)
            }
            .sheet(isPresented: $isShowingWebReader) {
                if let webReaderURL {
                    XiaohongshuWebReaderView(url: webReaderURL) { fetchedPost in
                        applyFetchedPost(fetchedPost, message: "已从网页读取内容并生成配方草稿，请核对一下比例。")
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var thumbnailPreview: some View {
        if let thumbnailImage {
            Image(uiImage: thumbnailImage)
                .resizable()
                .scaledToFill()
                .frame(maxWidth: .infinity)
                .frame(height: 180)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        } else {
            VStack(spacing: 10) {
                Image(systemName: "photo")
                    .font(.title.weight(.semibold))
                    .foregroundStyle(Color(hex: "#31535A"))

                Text("可从小红书保存图片后在相册选择，或复制图片后粘贴")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 140)
            .background(Color(hex: "#31535A").opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
    }

    private func openXiaohongshuSearch() {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard
            let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
            let url = URL(string: "https://www.xiaohongshu.com/search_result?keyword=\(encodedQuery)")
        else { return }

        UIApplication.shared.open(url)
    }

    private func pastePostURL() {
        guard let string = UIPasteboard.general.string else { return }

        if let urlString = XiaohongshuLinkReader.firstURLString(in: string) {
            postURLText = urlString
            lastPastedShareText = string

            let shareText = XiaohongshuLinkReader.cleanedShareText(from: string)
            if !shareText.isEmpty {
                postText = shareText
                if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    searchText = shareText.components(separatedBy: .newlines).first ?? ""
                }
                parsePostText()
            }

            linkFetchMessage = "已识别到分享链接，可以继续读取。"
        } else {
            let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                postURLText = trimmed
                linkFetchMessage = "剪贴板里没有识别到完整链接，可以检查后再读取。"
            }
        }
    }

    private func fetchPostURL() {
        let rawURLText = postURLText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !rawURLText.isEmpty else { return }
        guard let normalizedURL = XiaohongshuLinkReader.normalizedURL(from: rawURLText) else {
            linkFetchMessage = "这个链接格式还是不对，可以直接粘贴小红书分享出来的整段文字。"
            return
        }

        isFetchingPostURL = true
        linkFetchMessage = "正在读取链接内容..."

        Task {
            let fetchedPost = await XiaohongshuLinkReader.fetch(from: rawURLText)

            await MainActor.run {
                isFetchingPostURL = false

                guard let fetchedPost, fetchedPost.isLikelyUseful else {
                    applyShareTextFallbackIfAvailable()
                    showWebReader(for: normalizedURL)
                    linkFetchMessage = "普通读取没有拿到正文，已改用网页方式继续读取。页面加载后会自动尝试识别。"
                    return
                }

                applyFetchedPost(
                    fetchedPost,
                    message: fetchedPost.thumbnailImage == nil ? "已读取链接内容，但没有抓到缩略图。可以用相册或剪贴板补一张。" : "已读取链接内容并抓取缩略图，请核对一下配方比例。"
                )
            }
        }
    }

    private func openWebReader() {
        guard let url = XiaohongshuLinkReader.normalizedURL(from: postURLText) else {
            linkFetchMessage = "这个链接格式还是不对，可以直接粘贴小红书分享出来的整段文字。"
            return
        }

        applyShareTextFallbackIfAvailable()
        showWebReader(for: url)
        linkFetchMessage = "已打开网页读取器，页面加载后会自动尝试识别。"
    }

    private func showWebReader(for url: URL) {
        webReaderURL = url
        isShowingWebReader = true
    }

    private func applyShareTextFallbackIfAvailable() {
        let shareText = XiaohongshuLinkReader.cleanedShareText(from: lastPastedShareText)
        guard !shareText.isEmpty else { return }

        postText = shareText
        if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            searchText = shareText.components(separatedBy: .newlines).first ?? ""
        }
        parsePostText()
    }

    private func pastePostText() {
        if let string = UIPasteboard.general.string, !string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            postText = string
            parsePostText()
        }
    }

    private func pasteThumbnailImage() {
        if let image = UIPasteboard.general.image {
            thumbnailImage = image
        }
    }

    private func parsePostText() {
        let draft = XiaohongshuRecipeParser.parse(postText, fallbackName: searchText)
        applyDraft(draft)
    }

    private func applyDraft(_ draft: XiaohongshuRecipeDraft) {
        chineseName = draft.chineseName
        englishName = draft.englishName
        ingredientsText = draft.ingredients.joined(separator: "\n")
        glass = draft.glass
        method = draft.method
        tagsText = draft.tags.joined(separator: "，")
        note = draft.note
    }

    private func applyFetchedPost(_ fetchedPost: XiaohongshuFetchedPost, message: String) {
        let fallbackName = searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? fetchedPost.title : searchText
        postText = fetchedPost.combinedText
        if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            searchText = fetchedPost.title
        }
        applyDraft(XiaohongshuRecipeParser.parse(fetchedPost.combinedText, fallbackName: fallbackName))

        if let fetchedThumbnail = fetchedPost.thumbnailImage {
            thumbnailImage = fetchedThumbnail
        }
        linkFetchMessage = message
    }

    private func loadPhoto(_ item: PhotosPickerItem?) {
        guard let item else { return }

        Task {
            if
                let data = try? await item.loadTransferable(type: Data.self),
                let image = UIImage(data: data)
            {
                await MainActor.run {
                    thumbnailImage = image
                    selectedPhotoItem = nil
                }
            }
        }
    }

    private func addRecipe() {
        let recipe = recipeStore.add(
            chineseName: chineseName.trimmingCharacters(in: .whitespacesAndNewlines),
            englishName: englishName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "小红书导入" : englishName.trimmingCharacters(in: .whitespacesAndNewlines),
            ingredients: cleanedIngredients,
            tags: cleanedTags,
            glass: glass.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "未标注" : glass.trimmingCharacters(in: .whitespacesAndNewlines),
            method: method.trimmingCharacters(in: .whitespacesAndNewlines),
            note: note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : note.trimmingCharacters(in: .whitespacesAndNewlines)
        )

        if let thumbnailImage {
            RecipeLocalThumbnailStore.save(thumbnailImage, for: recipe.id)
        }

        dismiss()
        onComplete()
    }
}

private struct XiaohongshuRecipeDraft {
    var chineseName: String
    var englishName: String
    var ingredients: [String]
    var glass: String
    var method: String
    var tags: [String]
    var note: String
}

private struct XiaohongshuFetchedPost {
    var title: String
    var description: String
    var bodyText: String
    var imageURL: URL?
    var thumbnailImage: UIImage?

    var combinedText: String {
        let parts = [title, description, bodyText]
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        return Array(NSOrderedSet(array: parts).array as? [String] ?? parts)
            .joined(separator: "\n")
    }

    var isLikelyUseful: Bool {
        let text = combinedText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard text.count > 8 else { return false }

        let recipeSignals = ["配料", "材料", "原料", "用料", "做法", "步骤", "调酒", "鸡尾酒", "ml", "毫升", "oz"]
        if recipeSignals.contains(where: { text.localizedCaseInsensitiveContains($0) }) {
            return true
        }

        let blockerSignals = ["小红书 - 你的生活指南", "小红书网页版", "安全验证", "验证码", "登录后查看", "打开APP"]
        return !blockerSignals.contains(where: { text.localizedCaseInsensitiveContains($0) })
    }
}

private struct XiaohongshuPageCapture: Decodable {
    var title: String
    var description: String
    var bodyText: String
    var imageURLString: String
}

private struct XiaohongshuWebReaderView: View {
    @Environment(\.dismiss) private var dismiss

    let url: URL
    let onCapture: (XiaohongshuFetchedPost) -> Void

    @State private var webView = WKWebView()
    @State private var isLoading = true
    @State private var isCapturing = false
    @State private var didAutoCapture = false
    @State private var pageTitle = ""
    @State private var readerMessage = "页面加载后会自动识别，也可以手动点右上角。"

    var body: some View {
        NavigationStack {
            ZStack {
                XiaohongshuWebView(
                    url: url,
                    webView: webView,
                    isLoading: $isLoading,
                    pageTitle: $pageTitle
                )
                .ignoresSafeArea(.container, edges: .bottom)

                if isLoading {
                    ProgressView("正在打开小红书页面")
                        .padding()
                        .background(.regularMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
            }
            .safeAreaInset(edge: .bottom) {
                Text(readerMessage)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .padding(.vertical, 10)
                    .background(.bar)
            }
            .navigationTitle(pageTitle.isEmpty ? "网页读取" : pageTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("关闭") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .primaryAction) {
                    Button(isCapturing ? "识别中" : "识别") {
                        capturePage()
                    }
                    .disabled(isCapturing)
                }
            }
            .onChange(of: isLoading) { loading in
                guard !loading, !didAutoCapture else { return }

                didAutoCapture = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                    capturePage()
                }
            }
        }
    }

    private func capturePage() {
        guard !isCapturing else { return }

        isCapturing = true
        readerMessage = "正在从页面里读取标题、正文和图片..."

        let script = """
        (() => {
            const text = (value) => value ? String(value).trim() : "";
            const meta = (selector) => {
                const node = document.querySelector(selector);
                return text(node ? node.getAttribute("content") : "");
            };
            const title = meta('meta[property="og:title"]') || meta('meta[name="twitter:title"]') || text(document.title);
            const description = meta('meta[property="og:description"]') || meta('meta[name="description"]') || meta('meta[name="twitter:description"]');
            const images = Array.from(document.images || [])
                .map((image) => image.currentSrc || image.src || "")
                .filter((src) => src.length > 0);
            const imageURLString = meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]') || images.find((src) => src.includes("xhscdn")) || images[0] || "";
            const bodyText = text(document.body ? document.body.innerText : "");
            return JSON.stringify({ title, description, bodyText, imageURLString });
        })();
        """

        webView.evaluateJavaScript(script) { result, error in
            guard error == nil else {
                isCapturing = false
                readerMessage = "页面暂时不允许读取，可以登录后再点一次识别，或继续手动粘贴正文。"
                return
            }

            guard
                let jsonString = result as? String,
                let data = jsonString.data(using: .utf8),
                let capture = try? JSONDecoder().decode(XiaohongshuPageCapture.self, from: data)
            else {
                isCapturing = false
                readerMessage = "页面内容格式有点怪，没有解析出来。可以手动粘贴正文。"
                return
            }

            let imageURL = XiaohongshuLinkReader.absoluteImageURL(
                from: capture.imageURLString,
                baseURL: webView.url ?? url
            )

            Task {
                let image = await XiaohongshuLinkReader.loadImage(from: imageURL)
                let post = XiaohongshuFetchedPost(
                    title: capture.title,
                    description: capture.description,
                    bodyText: capture.bodyText,
                    imageURL: imageURL,
                    thumbnailImage: image
                )

                await MainActor.run {
                    isCapturing = false

                    guard post.isLikelyUseful else {
                        readerMessage = "页面还是没有露出正文。可以在这个网页里登录小红书后再点“识别”。"
                        return
                    }

                    onCapture(post)
                    dismiss()
                }
            }
        }
    }
}

private struct XiaohongshuWebView: UIViewRepresentable {
    let url: URL
    let webView: WKWebView
    @Binding var isLoading: Bool
    @Binding var pageTitle: String

    func makeUIView(context: Context) -> WKWebView {
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(isLoading: $isLoading, pageTitle: $pageTitle)
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        private var isLoading: Binding<Bool>
        private var pageTitle: Binding<String>

        init(isLoading: Binding<Bool>, pageTitle: Binding<String>) {
            self.isLoading = isLoading
            self.pageTitle = pageTitle
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            isLoading.wrappedValue = true
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isLoading.wrappedValue = false
            pageTitle.wrappedValue = webView.title ?? ""
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            isLoading.wrappedValue = false
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            isLoading.wrappedValue = false
        }
    }
}

private enum XiaohongshuLinkReader {
    static func fetch(from rawURLText: String) async -> XiaohongshuFetchedPost? {
        guard
            let url = normalizedURL(from: rawURLText),
            let fetchedHTML = await fetchHTML(from: url)
        else { return nil }

        return await parseHTML(fetchedHTML.html, finalURL: fetchedHTML.finalURL ?? url)
    }

    static func firstURLString(in text: String) -> String? {
        if let xiaohongshuURLString = xiaohongshuURLString(in: text) {
            return xiaohongshuURLString
        }

        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)

        if
            let match = detector?.firstMatch(in: text, options: [], range: range),
            let url = match.url
        {
            return sanitizedURLString(url.absoluteString)
        }

        return nil
    }

    static func cleanedShareText(from text: String) -> String {
        var cleanedText = replacing(
            pattern: #"(?i)(?:https?://)?(?:www\.)?(?:xhslink\.com|xiaohongshu\.com|xhs\.cn)/[^\s，。；;、）)\]】》"'<>\x{3000}]+"#,
            in: text,
            with: "\n"
        )

        cleanedText = cleanedText
            .replacingOccurrences(of: "Copy and open rednote to view the note", with: "\n")
            .replacingOccurrences(of: "复制本条信息，打开【小红书】App查看精彩内容", with: "\n")
            .replacingOccurrences(of: "复制此条消息，打开【小红书】App查看精彩内容", with: "\n")
            .replacingOccurrences(of: "打开小红书查看", with: "\n")

        let lines = cleanedText
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        return lines.joined(separator: "\n")
    }

    private static func xiaohongshuURLString(in text: String) -> String? {
        let pattern = #"(?i)(?:https?://)?(?:www\.)?(?:xhslink\.com|xiaohongshu\.com|xhs\.cn)/[^\s，。；;、）)\]】》"'<>\x{3000}]+"#
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        let regex = try? NSRegularExpression(pattern: pattern)

        guard
            let match = regex?.firstMatch(in: text, options: [], range: range),
            let matchRange = Range(match.range, in: text)
        else { return nil }

        return sanitizedURLString(String(text[matchRange]))
    }

    static func normalizedURL(from rawURLText: String) -> URL? {
        guard var urlString = firstURLString(in: rawURLText) else { return nil }
        let lowercasedURLString = urlString.lowercased()

        if !lowercasedURLString.hasPrefix("http://") &&
            !lowercasedURLString.hasPrefix("https://")
        {
            urlString = "https://\(urlString)"
        }

        guard var components = URLComponents(string: urlString) else {
            return URL(string: urlString)
        }

        let host = components.host?.lowercased() ?? ""
        if components.scheme?.lowercased() == "http", isXiaohongshuHost(host) {
            components.scheme = "https"
        }

        return components.url ?? URL(string: urlString)
    }

    private static func fetchHTML(from url: URL) async -> (html: String, finalURL: URL?)? {
        var request = URLRequest(url: url)
        request.timeoutInterval = 12
        request.httpShouldHandleCookies = true
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", forHTTPHeaderField: "Accept")
        request.setValue("zh-CN,zh;q=0.9,en;q=0.6", forHTTPHeaderField: "Accept-Language")

        guard
            let (data, response) = try? await URLSession.shared.data(for: request),
            let httpResponse = response as? HTTPURLResponse,
            (200..<400).contains(httpResponse.statusCode)
        else { return nil }

        let html = String(data: data, encoding: .utf8) ??
            String(data: data, encoding: .unicode) ??
            String(decoding: data, as: UTF8.self)

        return (html, response.url)
    }

    private static func parseHTML(_ html: String, finalURL: URL?) async -> XiaohongshuFetchedPost? {
        let decodedHTMLText = decodedHTML(html)
        let title = firstMeaningfulText([
            metaContent("og:title", in: html),
            metaContent("twitter:title", in: html),
            titleTag(in: html),
            scriptStringValue(for: ["title", "displayTitle", "noteTitle"], in: html),
            scriptStringValue(for: ["title", "displayTitle", "noteTitle"], in: decodedHTMLText)
        ])
        let description = firstMeaningfulText([
            metaContent("og:description", in: html),
            metaContent("description", in: html),
            metaContent("twitter:description", in: html),
            scriptStringValue(for: ["desc", "description", "content", "noteContent"], in: html),
            scriptStringValue(for: ["desc", "description", "content", "noteContent"], in: decodedHTMLText)
        ])
        let bodyText = strippedBodyText(from: html)
        let imageURL = absoluteImageURL(
            from: firstMeaningfulText([
                metaContent("og:image", in: html),
                metaContent("twitter:image", in: html),
                scriptImageURL(in: html),
                scriptImageURL(in: decodedHTMLText)
            ]),
            baseURL: finalURL
        )
        let thumbnailImage = await loadImage(from: imageURL)

        guard ![title, description, bodyText].allSatisfy({ $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) else {
            return nil
        }

        return XiaohongshuFetchedPost(
            title: cleanedTitle(title),
            description: description,
            bodyText: bodyText,
            imageURL: imageURL,
            thumbnailImage: thumbnailImage
        )
    }

    private static func metaContent(_ key: String, in html: String) -> String? {
        let escapedKey = NSRegularExpression.escapedPattern(for: key)
        let patterns = [
            "<meta\\s+[^>]*(?:property|name)=[\"']\(escapedKey)[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>",
            "<meta\\s+[^>]*content=[\"']([^\"']*)[\"'][^>]*(?:property|name)=[\"']\(escapedKey)[\"'][^>]*>"
        ]

        for pattern in patterns {
            if let value = firstMatch(in: html, pattern: pattern) {
                return decodedHTML(value)
            }
        }

        return nil
    }

    private static func titleTag(in html: String) -> String? {
        guard let title = firstMatch(in: html, pattern: "<title[^>]*>(.*?)</title>") else { return nil }
        return decodedHTML(title)
    }

    private static func scriptStringValue(for keys: [String], in html: String) -> String? {
        for key in keys {
            let escapedKey = NSRegularExpression.escapedPattern(for: key)
            let pattern = "\"\(escapedKey)\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\""

            if let value = firstMatch(in: html, pattern: pattern) {
                let decoded = decodedHTML(decodedJSONString(value))
                    .trimmingCharacters(in: .whitespacesAndNewlines)

                if !decoded.isEmpty {
                    return decoded
                }
            }
        }

        return nil
    }

    private static func scriptImageURL(in html: String) -> String? {
        let pattern = "(https?:\\\\?/\\\\?/[^\"'<>\\s]+?\\.(?:jpg|jpeg|png|webp)[^\"'<>\\s]*)"
        let matches = allMatches(in: html, pattern: pattern)
            .map { decodedJSONString($0).replacingOccurrences(of: "\\/", with: "/") }
            .filter { !$0.isEmpty }

        return matches.first { $0.localizedCaseInsensitiveContains("xhscdn") } ?? matches.first
    }

    private static func strippedBodyText(from html: String) -> String {
        var text = html
        text = replacing(pattern: "<script[\\s\\S]*?</script>", in: text, with: "\n")
        text = replacing(pattern: "<style[\\s\\S]*?</style>", in: text, with: "\n")
        text = replacing(pattern: "<noscript[\\s\\S]*?</noscript>", in: text, with: "\n")
        text = replacing(pattern: "<[^>]+>", in: text, with: "\n")
        text = decodedHTML(text)

        let lines = text
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .filter { line in
                !containsAny(line, keywords: ["小红书网页版", "登录", "打开APP", "安全验证", "验证码", "隐私政策"])
            }

        return lines.prefix(28).joined(separator: "\n")
    }

    static func loadImage(from imageURL: URL?) async -> UIImage? {
        guard let imageURL else { return nil }

        var request = URLRequest(url: imageURL)
        request.timeoutInterval = 12
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8", forHTTPHeaderField: "Accept")

        guard
            let (data, response) = try? await URLSession.shared.data(for: request),
            let httpResponse = response as? HTTPURLResponse,
            (200..<400).contains(httpResponse.statusCode)
        else { return nil }

        return UIImage(data: data)
    }

    static func absoluteImageURL(from rawURLString: String?, baseURL: URL?) -> URL? {
        guard var rawURLString else { return nil }
        rawURLString = decodedHTML(rawURLString)
            .replacingOccurrences(of: "\\/", with: "/")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        if rawURLString.hasPrefix("//") {
            rawURLString = "https:\(rawURLString)"
        }

        if let url = URL(string: rawURLString), url.scheme != nil {
            return url
        }

        if let baseURL {
            return URL(string: rawURLString, relativeTo: baseURL)?.absoluteURL
        }

        return nil
    }

    private static func isXiaohongshuHost(_ host: String) -> Bool {
        host == "xhslink.com" ||
        host.hasSuffix(".xhslink.com") ||
        host == "xiaohongshu.com" ||
        host.hasSuffix(".xiaohongshu.com") ||
        host == "xhs.cn" ||
        host.hasSuffix(".xhs.cn")
    }

    private static func sanitizedURLString(_ urlString: String) -> String {
        urlString.trimmingCharacters(
            in: CharacterSet.whitespacesAndNewlines.union(CharacterSet(charactersIn: "，。；;、）)]】》\"'"))
        )
    }

    private static func cleanedTitle(_ title: String) -> String {
        title
            .replacingOccurrences(of: " - 小红书", with: "")
            .replacingOccurrences(of: "_小红书", with: "")
            .replacingOccurrences(of: "｜小红书", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func firstMeaningfulText(_ values: [String?]) -> String {
        values
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first { !$0.isEmpty } ?? ""
    }

    private static func decodedHTML(_ text: String) -> String {
        var decoded = text
        let replacements = [
            "&amp;": "&",
            "&quot;": "\"",
            "&#34;": "\"",
            "&#39;": "'",
            "&apos;": "'",
            "&lt;": "<",
            "&gt;": ">",
            "&nbsp;": " ",
            "\\u002F": "/"
        ]

        for (source, target) in replacements {
            decoded = decoded.replacingOccurrences(of: source, with: target)
        }

        return decoded
    }

    private static func decodedJSONString(_ text: String) -> String {
        if
            let data = "\"\(text)\"".data(using: .utf8),
            let decoded = try? JSONDecoder().decode(String.self, from: data)
        {
            return decoded
        }

        return text
            .replacingOccurrences(of: "\\/", with: "/")
            .replacingOccurrences(of: "\\n", with: "\n")
            .replacingOccurrences(of: "\\u002F", with: "/")
    }

    private static func firstMatch(in text: String, pattern: String) -> String? {
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive, .dotMatchesLineSeparators])

        guard
            let match = regex?.firstMatch(in: text, options: [], range: range),
            match.numberOfRanges > 1,
            let matchRange = Range(match.range(at: 1), in: text)
        else { return nil }

        return String(text[matchRange])
    }

    private static func allMatches(in text: String, pattern: String) -> [String] {
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive, .dotMatchesLineSeparators])
        let matches = regex?.matches(in: text, options: [], range: range) ?? []

        return matches.compactMap { match in
            guard
                match.numberOfRanges > 1,
                let matchRange = Range(match.range(at: 1), in: text)
            else { return nil }

            return String(text[matchRange])
        }
    }

    private static func replacing(pattern: String, in text: String, with replacement: String) -> String {
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive, .dotMatchesLineSeparators])
        return regex?.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: replacement) ?? text
    }

    private static func containsAny(_ text: String, keywords: [String]) -> Bool {
        keywords.contains { text.localizedCaseInsensitiveContains($0) }
    }
}

private enum XiaohongshuRecipeParser {
    static func parse(_ text: String, fallbackName: String) -> XiaohongshuRecipeDraft {
        let lines = cleanedLines(from: text)
        let name = parsedName(from: lines, fallbackName: fallbackName)
        let ingredients = parsedIngredients(from: lines)
        let glass = value(after: ["杯型", "杯子", "容器"], in: lines) ?? "未标注"
        let method = parsedMethod(from: lines)
        let tags = parsedTags(from: ingredients, method: method)

        return XiaohongshuRecipeDraft(
            chineseName: name,
            englishName: "",
            ingredients: ingredients.isEmpty ? ["请检查帖子正文后补充配料"] : ingredients,
            glass: glass,
            method: method.isEmpty ? "请检查帖子正文后补充做法" : method,
            tags: tags,
            note: "来自小红书导入，建议核对原帖比例。"
        )
    }

    private static func cleanedLines(from text: String) -> [String] {
        text
            .replacingOccurrences(of: "\r", with: "\n")
            .components(separatedBy: .newlines)
            .map { line in
                textBeforeHashtag(in: line)
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                    .trimmingCharacters(in: CharacterSet(charactersIn: "-•·* "))
            }
            .filter { !$0.isEmpty }
            .filter { !$0.hasPrefix("http://") && !$0.hasPrefix("https://") }
    }

    private static func parsedName(from lines: [String], fallbackName: String) -> String {
        if
            let namedLine = value(after: ["酒名", "名称", "名字", "鸡尾酒"], in: lines),
            let namedCandidate = normalizedNameCandidate(from: namedLine),
            isValidNameCandidate(namedCandidate)
        {
            return namedCandidate
        }

        let fallbackLines = cleanedLines(from: fallbackName)
        let candidateLines = lines + fallbackLines
        let titleLikeLines = candidateLines.filter { isTitleLikeLine($0) }

        if let builtInName = builtInRecipeName(in: titleLikeLines) {
            return builtInName
        }

        if
            let firstTitle = titleLikeLines.first(where: { line in
                guard let candidate = normalizedNameCandidate(from: line) else { return false }
                return isValidNameCandidate(candidate)
            }),
            let titleCandidate = normalizedNameCandidate(from: firstTitle)
        {
            return titleCandidate
        }

        return "未命名配方"
    }

    private static func parsedIngredients(from lines: [String]) -> [String] {
        var ingredients: [String] = []
        var isInsideIngredientBlock = false

        for line in lines {
            if containsAny(line, keywords: ["配料", "材料", "原料", "用料"]) {
                isInsideIngredientBlock = true
                if let value = valueAfterSeparator(in: line), looksLikeIngredient(value) {
                    ingredients.append(value)
                }
                continue
            }

            if containsAny(line, keywords: ["做法", "步骤", "方法", "调制", "制作", "杯型"]) {
                isInsideIngredientBlock = false
            }

            if (isInsideIngredientBlock || looksLikeIngredient(line)), !containsAny(line, keywords: ["做法", "步骤", "方法"]) {
                ingredients.append(line)
            }
        }

        return Array(NSOrderedSet(array: ingredients).array as? [String] ?? ingredients)
    }

    private static func parsedMethod(from lines: [String]) -> String {
        var methodLines: [String] = []
        var isInsideMethodBlock = false

        for line in lines {
            if containsAny(line, keywords: ["做法", "步骤", "方法", "调制", "制作"]) {
                isInsideMethodBlock = true
                if let value = valueAfterSeparator(in: line), !value.isEmpty {
                    methodLines.append(value)
                }
                continue
            }

            if isInsideMethodBlock {
                if containsAny(line, keywords: ["配料", "材料", "原料", "杯型", "标签"]) {
                    isInsideMethodBlock = false
                } else {
                    methodLines.append(line)
                }
            }
        }

        if !methodLines.isEmpty {
            return methodLines.joined(separator: " ")
        }

        let nonIngredientLines = lines.filter { !looksLikeIngredient($0) && !containsAny($0, keywords: ["配料", "材料", "原料"]) }
        return nonIngredientLines.dropFirst().prefix(3).joined(separator: " ")
    }

    private static func parsedTags(from ingredients: [String], method: String) -> [String] {
        var tags = ["小红书"]
        let text = (ingredients + [method]).joined(separator: " ")

        for liquor in LiquorInventoryCatalog.orderedCategories where text.contains(liquor) {
            tags.append(liquor)
        }

        if text.contains("咖啡") { tags.append("咖啡") }
        if text.contains("奶") || text.contains("Cream") || text.contains("cream") { tags.append("奶油") }
        if text.contains("柠檬") || text.contains("青柠") || text.contains("酸") { tags.append("酸爽") }
        if text.contains("苏打") || text.contains("可乐") || text.contains("补满") { tags.append("长饮") }

        return Array(NSOrderedSet(array: tags).array as? [String] ?? tags)
    }

    private static func value(after labels: [String], in lines: [String]) -> String? {
        for line in lines where containsAny(line, keywords: labels) {
            if let value = valueAfterSeparator(in: line), !value.isEmpty {
                return value
            }
        }

        return nil
    }

    private static func valueAfterSeparator(in line: String) -> String? {
        for separator in ["：", ":", "-", "—"] {
            if let range = line.range(of: separator) {
                return textBeforeHashtag(in: String(line[range.upperBound...]))
                    .trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }

        return nil
    }

    private static func textBeforeHashtag(in text: String) -> String {
        var visibleText = text

        for hashtag in ["#", "＃"] {
            if let range = visibleText.range(of: hashtag) {
                visibleText = String(visibleText[..<range.lowerBound])
            }
        }

        return visibleText
    }

    private static func builtInRecipeName(in lines: [String]) -> String? {
        let text = lines.joined(separator: " ")
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }

        let names = CocktailLibrary.staticRecipes.flatMap { recipe in
            [
                (match: recipe.chineseName, display: recipe.chineseName),
                (match: recipe.englishName, display: recipe.chineseName)
            ]
        }
        .filter { $0.match.count >= 3 }
        .sorted { $0.match.count > $1.match.count }

        return names.first { name in
            text.localizedCaseInsensitiveContains(name.match)
        }?.display
    }

    private static func isTitleLikeLine(_ line: String) -> Bool {
        !containsAny(line, keywords: ["配料", "材料", "原料", "用料", "做法", "步骤", "方法", "杯型", "杯子", "容器", "标签", "备注"]) &&
        !looksLikeIngredient(line)
    }

    private static func normalizedNameCandidate(from line: String) -> String? {
        var candidate = textBeforeHashtag(in: line)

        for separator in ["｜", "|", " - 小红书", "_小红书", "—小红书", " - RedNote", "_RedNote"] {
            if let range = candidate.range(of: separator, options: .caseInsensitive) {
                candidate = String(candidate[..<range.lowerBound])
            }
        }

        let noisePhrases = [
            "给自己做一杯", "给自已做一杯", "给自己做", "给自已做",
            "做一杯", "来一杯", "一杯", "最爱的", "超好喝的", "好喝的",
            "我的", "自制", "教程", "配方", "调酒", "鸡尾酒"
        ]

        for phrase in noisePhrases {
            candidate = candidate.replacingOccurrences(of: phrase, with: "", options: .caseInsensitive)
        }

        candidate = candidate
            .replacingOccurrences(of: "...", with: "")
            .replacingOccurrences(of: "…", with: "")
            .trimmingCharacters(in: CharacterSet.whitespacesAndNewlines.union(CharacterSet(charactersIn: "，。；;、:：!！?？-—_ ")))

        candidate = candidate
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")

        return candidate.isEmpty ? nil : candidate
    }

    private static func isValidNameCandidate(_ candidate: String) -> Bool {
        let invalidSignals = [
            "小红书", "rednote", "打开app", "打开 app", "copy and open", "登录",
            "验证码", "安全验证", "隐私政策", "你的生活指南", "配料", "材料",
            "原料", "用料", "做法", "步骤", "杯型", "标签"
        ]
        let trimmed = candidate.trimmingCharacters(in: .whitespacesAndNewlines)

        guard trimmed.count >= 2, trimmed.count <= 36 else { return false }
        guard !trimmed.hasPrefix("http://"), !trimmed.hasPrefix("https://") else { return false }
        guard !containsAny(trimmed, keywords: invalidSignals) else { return false }
        guard !looksLikeIngredient(trimmed) else { return false }

        return true
    }

    private static func looksLikeIngredient(_ line: String) -> Bool {
        let ingredientSignals = [
            "ml", "mL", "毫升", "oz", "盎司", "滴", "dash", "勺", "匙", "适量",
            "金酒", "伏特加", "朗姆", "龙舌兰", "威士忌", "白兰地", "利口酒", "味美思",
            "柠檬", "青柠", "糖浆", "苏打", "可乐", "果汁", "咖啡", "牛奶", "奶油"
        ]

        return containsAny(line, keywords: ingredientSignals)
    }

    private static func containsAny(_ text: String, keywords: [String]) -> Bool {
        keywords.contains { text.localizedCaseInsensitiveContains($0) }
    }
}
