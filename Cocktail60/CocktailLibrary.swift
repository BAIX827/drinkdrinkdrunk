import Foundation

enum CocktailLibrary {
    static let staticRecipes: [CocktailRecipe] = CocktailData.recipes + WorldCocktailData.recipes + CuratedCocktailData.recipes

    static func dailyRecipe(for date: Date = Date()) -> CocktailRecipe {
        let recipes = staticRecipes
        guard !recipes.isEmpty else {
            return CocktailData.recipes[0]
        }

        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let dayNumber = calendar.ordinality(of: .day, in: .era, for: startOfDay) ?? 0
        return recipes[dayNumber % recipes.count]
    }
}
