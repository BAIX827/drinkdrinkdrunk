import SwiftUI
import WebKit

struct BarWebView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var myLiquorStore: MyLiquorStore
    @EnvironmentObject private var recipeStore: RecipeStore
    @EnvironmentObject private var favoritesStore: FavoritesStore
    @AppStorage(BarWebHost.storageKey) private var savedBarState = ""
    var initialRoute = "bar"

    var body: some View {
        NavigationStack {
            BarWebContainer(
                recipes: recipeStore.allRecipes,
                ownedLiquors: myLiquorStore.ownedLiquors,
                favorites: favoritesStore.favoriteIDs,
                initialRoute: initialRoute
            ) { state in
                if let items = state["inventory"] as? [[String: Any]] {
                    let names = items.compactMap { item -> String? in
                        let type = item["type"] as? String ?? ""
                        return type.isEmpty ? item["name"] as? String : type
                    }
                    myLiquorStore.replace(with: names)
                }
                if let favorites = state["favorites"] as? [String] {
                    favoritesStore.replace(with: favorites)
                }
            }
            .navigationTitle(usesEnglish ? "DDDrunk · My bar" : "大喝特喝 · 我的吧台")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(usesEnglish ? "Done" : "完成") { dismiss() }
                }
            }
        }
    }

    private var usesEnglish: Bool {
        guard let data = savedBarState.data(using: .utf8),
              let state = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return false }
        return state["locale"] as? String == "en"
    }
}

private struct BarWebContainer: UIViewRepresentable {
    let recipes: [CocktailRecipe]
    let ownedLiquors: Set<String>
    let favorites: Set<String>
    let initialRoute: String
    let onSave: ([String: Any]) -> Void

    func makeCoordinator() -> BarWebHost { BarWebHost(onSave: onSave) }

    func makeUIView(context: Context) -> WKWebView {
        let recipeData = (try? JSONEncoder().encode(recipes)) ?? Data("[]".utf8)
        let recipeObjects = (try? JSONSerialization.jsonObject(with: recipeData)) ?? []
        return context.coordinator.makeWebView(bootstrap: [
            "legacyLiquors": ownedLiquors.sorted(),
            "favorites": favorites.sorted(),
            "recipes": recipeObjects,
            "route": initialRoute
        ])
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: BarWebHost) {
        uiView.stopLoading()
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "barState")
    }
}
