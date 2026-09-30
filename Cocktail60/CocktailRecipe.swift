import Foundation

struct CocktailRecipe: Identifiable, Hashable, Codable {
    let id: String
    let englishName: String
    let chineseName: String
    let ingredients: [String]
    let tags: [String]
    let glass: String
    let method: String
    let note: String?
    let accentHex: String
    let isUserCreated: Bool

    var searchText: String {
        ([englishName, chineseName, glass, method, isUserCreated ? "我的配方" : "经典配方"] + ingredients + tags)
            .joined(separator: " ")
    }

    var baseSummary: String {
        tags
            .filter { CocktailData.baseFilters.contains($0) }
            .prefix(3)
            .joined(separator: " / ")
    }
}
