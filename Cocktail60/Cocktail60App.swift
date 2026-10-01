import SwiftUI

@main
struct Cocktail60App: App {
    @StateObject private var favoritesStore = FavoritesStore()
    @StateObject private var recipeStore = RecipeStore()
    @StateObject private var drinkLogStore = DrinkLogStore()
    @StateObject private var myLiquorStore = MyLiquorStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(favoritesStore)
                .environmentObject(recipeStore)
                .environmentObject(drinkLogStore)
                .environmentObject(myLiquorStore)
        }
    }
}
