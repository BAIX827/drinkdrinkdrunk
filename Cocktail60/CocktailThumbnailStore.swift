import Foundation

actor CocktailThumbnailStore {
    static let shared = CocktailThumbnailStore()

    private var cachedURLs: [String: URL] = [:]
    private var missedRecipeIDs: Set<String> = []

    func thumbnailURL(for recipe: CocktailRecipe) async -> URL? {
        if let cachedURL = cachedURLs[recipe.id] {
            return cachedURL
        }

        if missedRecipeIDs.contains(recipe.id) {
            return nil
        }

        for query in searchQueries(for: recipe) {
            if let thumbnailURL = await fetchThumbnailURL(query: query) {
                cachedURLs[recipe.id] = thumbnailURL
                return thumbnailURL
            }
        }

        missedRecipeIDs.insert(recipe.id)
        return nil
    }

    private func searchQueries(for recipe: CocktailRecipe) -> [String] {
        let englishName = recipe.englishName
            .replacingOccurrences(of: "’", with: "'")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        let chineseName = recipe.chineseName.trimmingCharacters(in: .whitespacesAndNewlines)

        return [
            "\(englishName) cocktail",
            "\(englishName) drink",
            "\(chineseName) 鸡尾酒"
        ].filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    private func fetchThumbnailURL(query: String) async -> URL? {
        var components = URLComponents(string: "https://en.wikipedia.org/w/rest.php/v1/search/page")
        components?.queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "limit", value: "6")
        ]

        guard let url = components?.url else { return nil }

        var request = URLRequest(url: url)
        request.setValue("Cocktail60/1.0", forHTTPHeaderField: "User-Agent")
        request.setValue("Cocktail60/1.0", forHTTPHeaderField: "Api-User-Agent")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard
                let httpResponse = response as? HTTPURLResponse,
                (200..<300).contains(httpResponse.statusCode)
            else { return nil }

            let decodedResponse = try JSONDecoder().decode(WikipediaSearchResponse.self, from: data)
            return decodedResponse.pages
                .compactMap { $0.thumbnail?.resolvedURL }
                .first
        } catch {
            return nil
        }
    }
}

private struct WikipediaSearchResponse: Decodable {
    let pages: [WikipediaSearchPage]
}

private struct WikipediaSearchPage: Decodable {
    let thumbnail: WikipediaThumbnail?
}

private struct WikipediaThumbnail: Decodable {
    let url: String?

    var resolvedURL: URL? {
        guard let url else { return nil }

        if url.hasPrefix("//") {
            return URL(string: "https:\(url)")
        }

        return URL(string: url)
    }
}
