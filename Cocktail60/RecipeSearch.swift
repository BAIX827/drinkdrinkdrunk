import Foundation

enum RecipeSearch {
    static func filtered(_ recipes: [CocktailRecipe], query: String) -> [CocktailRecipe] {
        let terms = searchTerms(from: query)
        guard !terms.isEmpty else { return recipes }

        let scoredRecipes: [(recipe: CocktailRecipe, score: Int)] = recipes.map { recipe in
            (recipe: recipe, score: score(recipe, terms: terms))
        }

        let matchingRecipes = scoredRecipes.filter { item in
            item.score > 0
        }

        let sortedRecipes = matchingRecipes.sorted { left, right in
            if left.score == right.score {
                return left.recipe.chineseName.localizedCompare(right.recipe.chineseName) == .orderedAscending
            }

            return left.score > right.score
        }

        return sortedRecipes.map { item in
            item.recipe
        }
    }

    private static func score(_ recipe: CocktailRecipe, terms: [String]) -> Int {
        let chineseName = compact(recipe.chineseName)
        let englishName = compact(recipe.englishName)
        let ingredientText = compact(recipe.ingredients.joined(separator: " "))
        let tagText = compact(recipe.tags.joined(separator: " "))
        let glassText = compact(recipe.glass)
        let methodText = compact(recipe.method)
        let noteText = compact(recipe.note ?? "")
        let allText = [chineseName, englishName, ingredientText, tagText, glassText, methodText, noteText]
            .joined(separator: " ")

        var total = 0

        for term in terms {
            if chineseName == term || englishName == term {
                total += 140
            }

            if chineseName.hasPrefix(term) || englishName.hasPrefix(term) {
                total += 100
            }

            if chineseName.contains(term) || englishName.contains(term) {
                total += 85
            }

            if tagText.contains(term) {
                total += 65
            }

            if ingredientText.contains(term) {
                total += 55
            }

            if glassText.contains(term) || methodText.contains(term) {
                total += 35
            }

            if noteText.contains(term) {
                total += 20
            }

            if allText.contains(term) {
                total += 15
            } else if term.count >= 2 && isSubsequence(term, of: allText) {
                total += 8
            }
        }

        return total
    }

    private static func searchTerms(from query: String) -> [String] {
        let compactQuery = compact(query)
        let splitTerms = query
            .components(separatedBy: separators)
            .map(compact)
            .filter { !$0.isEmpty }

        var terms = splitTerms
        if !compactQuery.isEmpty && !terms.contains(compactQuery) {
            terms.append(compactQuery)
        }

        let unique = NSOrderedSet(array: terms).array as? [String] ?? terms
        return unique
    }

    private static func compact(_ value: String) -> String {
        let folded = value
            .replacingOccurrences(of: "’", with: "'")
            .folding(options: [.caseInsensitive, .diacriticInsensitive, .widthInsensitive], locale: .current)

        let allowed = CharacterSet.letters.union(.decimalDigits)
        return String(folded.unicodeScalars.filter { allowed.contains($0) })
    }

    private static func isSubsequence(_ needle: String, of haystack: String) -> Bool {
        var remaining = ArraySlice(needle)

        for character in haystack where remaining.first == character {
            remaining.removeFirst()
            if remaining.isEmpty { return true }
        }

        return remaining.isEmpty
    }

    private static var separators: CharacterSet {
        var set = CharacterSet.whitespacesAndNewlines
        set.formUnion(.punctuationCharacters)
        set.formUnion(.symbols)
        return set
    }
}
