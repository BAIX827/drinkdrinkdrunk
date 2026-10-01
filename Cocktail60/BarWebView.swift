import SwiftUI
import WebKit
import Combine

/// One web session is shared by all four native tabs.
final class IPhoneBarSession: ObservableObject {
    @Published var tab = "discover"
    @Published var expanded = true
    @Published var overlay = false
    @Published var keyboard = false
    @Published var ready = false
    @Published var theme: String
    @Published var english: Bool
    @Published var importing = false
    @Published var migrationError: String?
    var webView: WKWebView?
    var host: BarWebHost?
    private var pendingRoute: String?

    init() {
        let raw = UserDefaults.standard.string(forKey: BarWebHost.storageKey) ?? "{}"
        let state = (try? JSONSerialization.jsonObject(with: Data(raw.utf8))) as? [String: Any]
        theme = state?["theme"] as? String ?? "bar"
        english = state?["locale"] as? String == "en"
    }

    var background: Color { Color(hex: theme == "light" ? "#F2ECDF" : theme == "dark" ? "#0B100E" : "#0E1714") }
    var tint: Color { Color(hex: theme == "light" ? "#365747" : "#D9B579") }

    func navigate(_ route: String) {
        guard ready, let webView else { pendingRoute = route; return }
        webView.callAsyncJavaScript("window.BarNative.navigate(route)", arguments: ["route": route], in: nil, in: .page) { _ in }
    }

    func receive(_ event: [String: Any]) {
        switch event["type"] as? String {
        case "ready":
            ready = true
            if let route = pendingRoute { pendingRoute = nil; navigate(route) }
        case "route":
            if let value = event["tab"] as? String { tab = value }
            expanded = true
        case "scroll":
            withAnimation(.spring(response: 0.44, dampingFraction: 0.84)) { expanded = event["expanded"] as? Bool ?? true }
        case "overlay": overlay = event["open"] as? Bool ?? false
        case "appearance":
            theme = event["theme"] as? String ?? "bar"
            english = event["locale"] as? String == "en"
            webView?.backgroundColor = UIColor(background)
            webView?.scrollView.backgroundColor = UIColor(background)
        case "importRecipe": importing = true
        case "migrationError": migrationError = event["message"] as? String ?? "旧数据迁移未完成。"
        default: break
        }
    }

    func importRecipes(_ recipes: [CocktailRecipe]) {
        guard !recipes.isEmpty else { return }
        guard let objects = try? LegacyBarMigration.recipeObjects(recipes) else {
            migrationError = english ? "The original recipe is saved. Please reopen the app to retry the import." : "原始配方已保存，请重新打开 App 重试导入。"
            return
        }
        webView?.callAsyncJavaScript("return window.BarNative.importRecipes(recipes)", arguments: ["recipes": objects], in: nil, in: .page) { [weak self] result in
            if case .success(let value) = result, (value as? Bool) == true { return }
            self?.migrationError = self?.english == true ? "Import is pending. The original recipe is saved; reopen the app to retry." : "配方待同步，原始配方已保存，可重新打开 App 重试。"
        }
    }
}

struct BarWebView: View {
    @StateObject private var session = IPhoneBarSession()
    @EnvironmentObject private var recipeStore: RecipeStore
    @State private var importExistingIDs = Set<String>()
    @State private var showingLegacyLogs = false
    var initialRoute = "discover"

    var body: some View {
        ZStack(alignment: .bottom) {
            session.background.ignoresSafeArea()
            IPhoneBarContainer(session: session, initialRoute: initialRoute)
            if !session.overlay && !session.keyboard {
                IPhoneGlassBar(session: session)
                    .padding(.horizontal, 18)
                    .padding(.bottom, 8)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
            if !session.ready {
                ProgressView().tint(session.tint).frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .tint(session.tint)
        .preferredColorScheme(session.theme == "light" ? .light : .dark)
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in session.keyboard = true }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in session.keyboard = false }
        .onChange(of: session.importing) { showing in
            if showing { importExistingIDs = Set(recipeStore.userRecipes.map(\.id)) }
        }
        .sheet(isPresented: $session.importing, onDismiss: {
            session.importRecipes(recipeStore.userRecipes.filter { !importExistingIDs.contains($0.id) })
        }) {
            XiaohongshuImportView { session.importing = false }
        }
        .alert(session.english ? "Original records retained" : "原始记录已保留", isPresented: Binding(get: { session.migrationError != nil }, set: { if !$0 { session.migrationError = nil } })) {
            Button(session.english ? "View original diary" : "查看旧日记") { showingLegacyLogs = true }
            Button(session.english ? "OK" : "知道了", role: .cancel) { }
        } message: { Text(session.migrationError ?? "") }
        .sheet(isPresented: $showingLegacyLogs) { DrinkCalendarView(initialDate: Date()) }
        .onOpenURL { url in
            guard url.scheme == "dddrunk", url.host == "recipe", let id = url.pathComponents.last,
                  id.range(of: "^[a-zA-Z0-9-]+$", options: .regularExpression) != nil else { return }
            session.navigate("recipe/\(id)")
        }
    }
}

private struct IPhoneGlassBar: View {
    @ObservedObject var session: IPhoneBarSession
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private var tabs: [(String, String, String)] {
        [("discover", "square.grid.2x2.fill", session.english ? "Recipes" : "配方"),
         ("bar", "wineglass.fill", session.english ? "My bar" : "吧台"),
         ("dna", "sparkles", session.english ? "Taste" : "口味"),
         ("journal", "calendar", session.english ? "Diary" : "日记")]
    }
    var body: some View {
        HStack(spacing: 8) {
            ForEach(tabs, id: \.0) { tab in
                Button { session.navigate(tab.0) } label: {
                    VStack(spacing: 5) {
                        Image(systemName: tab.1).font(.system(size: 21, weight: .semibold))
                            .frame(height: 27)
                        if session.expanded { Text(tab.2).font(.caption.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.75) }
                    }
                    .foregroundStyle(session.tab == tab.0 ? session.tint : Color.primary.opacity(0.7))
                    .frame(maxWidth: .infinity)
                    .frame(height: session.expanded ? 64 : 52)
                    .background {
                        if session.expanded && session.tab == tab.0 {
                            Capsule().fill(session.tint.opacity(0.14)).padding(4)
                        }
                    }
                    .modifier(CompactGlass(enabled: !session.expanded))
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.2)
                .accessibilityAddTraits(session.tab == tab.0 ? [.isSelected] : [])
                .disabled(!session.ready)
            }
        }
        .padding(session.expanded ? 6 : 0)
        .background {
            if session.expanded {
                if #available(iOS 26.0, *) {
                    Color.clear.glassEffect(.clear.interactive(), in: Capsule())
                } else { Capsule().fill(.ultraThinMaterial) }
            }
        }
        .frame(maxWidth: 430)
        .animation(reduceMotion ? nil : .spring(response: 0.44, dampingFraction: 0.84), value: session.expanded)
    }
}

private struct CompactGlass: ViewModifier {
    let enabled: Bool
    func body(content: Content) -> some View {
        if enabled {
            if #available(iOS 26.0, *) { content.glassEffect(.clear.interactive(), in: Circle()) }
            else { content.background(.ultraThinMaterial, in: Circle()) }
        } else { content }
    }
}

private struct IPhoneBarContainer: UIViewRepresentable {
    @ObservedObject var session: IPhoneBarSession
    let initialRoute: String
    func makeUIView(context: Context) -> WKWebView {
        let host = BarWebHost(onSave: { state in
            if state["nativeMigrationVersion"] as? Int == 1 {
                UserDefaults.standard.set(true, forKey: "nativeBarMigrationComplete")
                UserDefaults.standard.set(state["nativeImportedRecipeIDs"] as? [String] ?? [], forKey: "nativeBarImportedRecipeIDs")
            }
        }, onEvent: { [weak session] event in session?.receive(event) })
        let needsMigration = !UserDefaults.standard.bool(forKey: "nativeBarMigrationComplete")
        let webView = host.makeWebView(bootstrap: [
            "nativeNavigation": true, "route": initialRoute,
            "legacyLiquors": needsMigration ? UserDefaults.standard.stringArray(forKey: "myOwnedLiquors") ?? [] : [],
            "favorites": needsMigration ? Array(FavoritesStore().favoriteIDs) : [],
            "legacy": LegacyBarMigration.payload()
        ])
        webView.isOpaque = false
        webView.backgroundColor = UIColor(session.background)
        webView.scrollView.backgroundColor = UIColor(session.background)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.keyboardDismissMode = .interactive
        session.host = host
        session.webView = webView
        return webView
    }
    func updateUIView(_ uiView: WKWebView, context: Context) { }
}

/// Copy legacy records. Original UserDefaults and full-resolution photo files stay intact.
private enum LegacyBarMigration {
    static func payload() -> [String: Any] {
        let defaults = UserDefaults.standard
        let migrated = defaults.bool(forKey: "nativeBarMigrationComplete")
        let sourceID = defaults.string(forKey: "nativeBarMigrationSourceID") ?? UUID().uuidString
        defaults.set(sourceID, forKey: "nativeBarMigrationSourceID")
        var payload: [String: Any] = ["migrated": migrated, "sourceID": sourceID,
            "consumedRecipeIDs": defaults.stringArray(forKey: "nativeBarImportedRecipeIDs") ?? [],
            "favorites": Array(FavoritesStore().favoriteIDs)]
        do {
            if let data = defaults.data(forKey: "userCocktailRecipes") {
                let recipes = try JSONDecoder().decode([CocktailRecipe].self, from: data)
                let consumed = Set(defaults.stringArray(forKey: "nativeBarImportedRecipeIDs") ?? [])
                payload["recipes"] = try recipeObjects(recipes.filter { !consumed.contains($0.id) })
            }
            if !migrated, let data = defaults.data(forKey: "dailyDrinkLogs") {
                let days = try JSONDecoder().decode([DrinkLog].self, from: data)
                let formatter = DateFormatter()
                formatter.calendar = Calendar(identifier: .gregorian)
                formatter.locale = Locale(identifier: "en_US_POSIX")
                formatter.dateFormat = "yyyy-MM-dd"
                let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("DrinkPhotos")
                var logs: [[String: Any]] = []
                for day in days {
                    for entry in day.entries {
                        var log: [String: Any] = ["id": "native-\(entry.id)", "date": formatter.string(from: day.date),
                            "name": entry.recipeName, "englishName": entry.recipeEnglishName, "note": entry.note,
                            "recipeID": entry.recipeID]
                        var photos: [String] = []
                        for name in entry.photoFilenames {
                            guard !name.contains("/"), let image = UIImage(contentsOfFile: folder.appendingPathComponent(name).path),
                                  let photo = compress(image) else { throw MigrationError.photo }
                            photos.append(photo)
                        }
                        if !photos.isEmpty { log["photos"] = photos; log["legacyPhotos"] = true }
                        logs.append(log)
                    }
                }
                payload["logs"] = logs
            }
        } catch {
            payload["error"] = "旧数据暂时无法完整迁移，原始配方、日记和照片已保留。请先查看旧日记并检查照片。"
        }
        return payload
    }
    static func recipeObjects(_ recipes: [CocktailRecipe]) throws -> [[String: Any]] {
        var objects = try JSONSerialization.jsonObject(with: JSONEncoder().encode(recipes)) as? [[String: Any]] ?? []
        for index in objects.indices {
            guard let id = objects[index]["id"] as? String, let image = RecipeLocalThumbnailStore.image(for: id) else { continue }
            guard let photo = compress(image) else { throw MigrationError.photo }
            objects[index]["photo"] = photo
        }
        return objects
    }
    private static func compress(_ image: UIImage) -> String? {
        var edge: CGFloat = 1280
        for _ in 0..<7 {
            let scale = min(1, edge / max(image.size.width, image.size.height))
            let size = CGSize(width: max(1, image.size.width * scale), height: max(1, image.size.height * scale))
            let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
            let rendered = UIGraphicsImageRenderer(size: size, format: format).image { context in
                UIColor.white.setFill(); context.fill(CGRect(origin: .zero, size: size)); image.draw(in: CGRect(origin: .zero, size: size))
            }
            if let data = rendered.jpegData(compressionQuality: 0.75) {
                let result = "data:image/jpeg;base64," + data.base64EncodedString()
                if result.count <= 180000 { return result }
            }
            edge *= 0.7
        }
        return nil
    }
    private enum MigrationError: Error { case photo }
}
