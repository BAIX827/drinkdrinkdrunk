import Foundation

final class FavoritesStore: ObservableObject {
    @Published private(set) var favoriteIDs: Set<String> = [] {
        didSet { if hasLoaded { save() } }
    }

    // Loading legacy data must not rewrite or clear the source archive.
    private var hasLoaded = false
    private let storageKey = "favoriteCocktailIDs"

    init() {
        defer { hasLoaded = true }
        guard
            let data = UserDefaults.standard.data(forKey: storageKey),
            let ids = try? JSONDecoder().decode([String].self, from: data)
        else {
            favoriteIDs = []
            return
        }

        favoriteIDs = Set(ids)
    }

    func contains(_ recipe: CocktailRecipe) -> Bool {
        favoriteIDs.contains(recipe.id)
    }

    func toggle(_ recipe: CocktailRecipe) {
        if favoriteIDs.contains(recipe.id) {
            favoriteIDs.remove(recipe.id)
        } else {
            favoriteIDs.insert(recipe.id)
        }
    }

    func remove(_ recipe: CocktailRecipe) {
        favoriteIDs.remove(recipe.id)
    }

    func replace(with ids: [String]) {
        favoriteIDs = Set(ids)
    }

    private func save() {
        let ids = favoriteIDs.sorted()
        guard let data = try? JSONEncoder().encode(ids) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }
}
