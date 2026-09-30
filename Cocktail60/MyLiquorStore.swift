import Combine
import Foundation

final class MyLiquorStore: ObservableObject {
    @Published private(set) var ownedLiquors: Set<String> = [] {
        didSet { save() }
    }

    private let storageKey = "myOwnedLiquors"

    init() {
        let saved = UserDefaults.standard.stringArray(forKey: storageKey) ?? []
        ownedLiquors = Set(saved.map(LiquorInventoryCatalog.normalizedName).filter { !$0.isEmpty })
    }

    func contains(_ name: String) -> Bool {
        ownedLiquors.contains(LiquorInventoryCatalog.normalizedName(name))
    }

    func toggle(_ name: String) {
        let normalizedName = LiquorInventoryCatalog.normalizedName(name)
        guard !normalizedName.isEmpty else { return }

        if ownedLiquors.contains(normalizedName) {
            ownedLiquors.remove(normalizedName)
        } else {
            ownedLiquors.insert(normalizedName)
        }
    }

    func add(_ name: String) {
        let normalizedName = LiquorInventoryCatalog.normalizedName(name)
        guard !normalizedName.isEmpty else { return }
        ownedLiquors.insert(normalizedName)
    }

    func remove(_ name: String) {
        ownedLiquors.remove(LiquorInventoryCatalog.normalizedName(name))
    }

    func replace(with names: [String]) {
        ownedLiquors = Set(names.map(LiquorInventoryCatalog.normalizedName).filter { !$0.isEmpty })
    }

    private func save() {
        UserDefaults.standard.set(ownedLiquors.sorted(), forKey: storageKey)
    }
}

enum LiquorInventoryCatalog {
    static let orderedCategories = [
        "金酒",
        "伏特加",
        "白朗姆",
        "黑朗姆",
        "椰子朗姆",
        "朗姆",
        "龙舌兰",
        "波本",
        "苏格兰",
        "黑麦",
        "威士忌",
        "百利甜",
        "干邑",
        "白兰地",
        "橙味利口酒",
        "咖啡利口酒",
        "樱桃利口酒",
        "三秒酒",
        "君度",
        "柑曼怡",
        "马拉斯奇诺",
        "利口酒",
        "起泡酒",
        "香槟",
        "普洛赛克",
        "起泡",
        "干味美思",
        "甜味美思",
        "味美思",
        "苦艾酒"
    ]

    private static let broadCategories = [
        "金酒",
        "伏特加",
        "朗姆",
        "龙舌兰",
        "威士忌",
        "百利甜",
        "白兰地",
        "利口酒",
        "起泡",
        "味美思",
        "苦艾酒"
    ]

    private static let parentCategories = [
        "白朗姆": "朗姆",
        "黑朗姆": "朗姆",
        "椰子朗姆": "朗姆",
        "波本": "威士忌",
        "苏格兰": "威士忌",
        "黑麦": "威士忌",
        "干邑": "白兰地",
        "橙味利口酒": "利口酒",
        "咖啡利口酒": "利口酒",
        "樱桃利口酒": "利口酒",
        "三秒酒": "利口酒",
        "君度": "利口酒",
        "柑曼怡": "利口酒",
        "马拉斯奇诺": "利口酒",
        "起泡酒": "起泡",
        "香槟": "起泡",
        "普洛赛克": "起泡",
        "干味美思": "味美思",
        "甜味美思": "味美思"
    ]

    static func normalizedName(_ rawName: String) -> String {
        rawName.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static let aliases = [
        "深色朗姆": "黑朗姆", "苏格兰威士忌": "苏格兰",
        "黑麦威士忌": "黑麦", "普罗塞克": "普洛赛克"
    ]

    static func categories(from recipes: [CocktailRecipe], ownedLiquors: Set<String>) -> [String] {
        let discovered = Set(recipes.flatMap { stockCategories(for: $0) })
        let allCategories = discovered.union(ownedLiquors).union(broadCategories)
        let ordered = orderedCategories.filter { allCategories.contains($0) }
        let custom = allCategories.subtracting(orderedCategories).sorted()
        return ordered + custom
    }

    static func stockCategories(for recipe: CocktailRecipe) -> [String] {
        var categories = Set<String>()

        for ingredient in recipe.ingredients {
            if let liquorName = liquorName(forIngredient: ingredient) {
                categories.insert(liquorName)
            }
        }

        for tag in recipe.tags {
            if broadCategories.contains(tag), !categories.contains(where: { isSpecificName($0, under: tag) }) {
                categories.insert(tag)
            }
        }

        return orderedCategories.filter { categories.contains($0) }
    }

    static func missingCategories(for recipe: CocktailRecipe, ownedLiquors: Set<String>) -> [String] {
        stockCategories(for: recipe).filter { !isOwned($0, in: ownedLiquors) }
    }

    static func isMissingIngredient(_ ingredient: String, recipe: CocktailRecipe, ownedLiquors: Set<String>) -> Bool {
        guard let liquorName = liquorName(forIngredient: ingredient) else { return false }
        return !isOwned(liquorName, in: ownedLiquors)
    }

    static func liquorName(forIngredient ingredient: String) -> String? {
        for (alias, canonical) in aliases where ingredient.contains(alias) {
            return canonical
        }
        for category in orderedCategories.sorted(by: { $0.count > $1.count }) {
            if ingredient.contains(category) {
                return category
            }
        }

        return nil
    }

    private static func isOwned(_ requiredName: String, in ownedLiquors: Set<String>) -> Bool {
        let name = normalizedName(requiredName)
        let required = aliases[name] ?? name
        guard !required.isEmpty else { return true }

        return ownedLiquors.contains { ownedName in
            let name = normalizedName(ownedName)
            var current: String? = aliases[name] ?? name
            while let type = current {
                if type == required { return true }
                current = parentCategories[type]
            }
            return false
        }
    }

    private static func isSpecificName(_ name: String, under broadCategory: String) -> Bool {
        guard name != broadCategory else { return false }
        return name.contains(broadCategory) || parentCategories[name] == broadCategory
    }
}
