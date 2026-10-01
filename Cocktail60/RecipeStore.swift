import Foundation

final class RecipeStore: ObservableObject {
    @Published private(set) var userRecipes: [CocktailRecipe] = [] {
        didSet { if hasLoaded { save() } }
    }

    // Loading legacy data must not rewrite or clear the source archive.
    private var hasLoaded = false
    private let storageKey = "userCocktailRecipes"

    var allRecipes: [CocktailRecipe] {
        CocktailLibrary.staticRecipes + userRecipes
    }

    init() {
        defer { hasLoaded = true }
        guard
            let data = UserDefaults.standard.data(forKey: storageKey),
            let recipes = try? JSONDecoder().decode([CocktailRecipe].self, from: data)
        else {
            userRecipes = []
            return
        }

        userRecipes = recipes
    }

    @discardableResult
    func add(
        chineseName: String,
        englishName: String,
        ingredients: [String],
        tags: [String],
        glass: String,
        method: String,
        note: String?
    ) -> CocktailRecipe {
        let recipe = CocktailRecipe(
            id: "user-\(UUID().uuidString)",
            englishName: englishName,
            chineseName: chineseName,
            ingredients: ingredients,
            tags: tags,
            glass: glass,
            method: method,
            note: note,
            accentHex: accentHex(for: tags),
            isUserCreated: true
        )

        userRecipes.insert(recipe, at: 0)
        return recipe
    }

    func delete(_ recipe: CocktailRecipe) {
        guard recipe.isUserCreated else { return }
        userRecipes.removeAll { $0.id == recipe.id }
        RecipeLocalThumbnailStore.delete(for: recipe.id)
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(userRecipes) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }

    private func accentHex(for tags: [String]) -> String {
        if tags.contains("百利甜") { return "#9B6B5D" }
        if tags.contains("龙舌兰") { return "#D0A052" }
        if tags.contains("朗姆") { return "#D18B48" }
        if tags.contains("威士忌") { return "#9A5C3E" }
        if tags.contains("伏特加") { return "#7FA6BD" }
        if tags.contains("金酒") { return "#79A883" }
        if tags.contains("咖啡") { return "#806154" }
        if tags.contains("酸爽") { return "#6FAE9A" }
        return "#31535A"
    }
}
