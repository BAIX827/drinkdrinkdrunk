import SwiftUI
import UIKit

struct ContentView: View {
    @EnvironmentObject private var favoritesStore: FavoritesStore
    @EnvironmentObject private var recipeStore: RecipeStore
    @EnvironmentObject private var drinkLogStore: DrinkLogStore
    @EnvironmentObject private var myLiquorStore: MyLiquorStore
    @State private var searchText = ""
    @State private var selectedFilter = CocktailData.allFilter
    @State private var isShowingAddRecipe = false
    @State private var isShowingAppearanceSettings = false
    @State private var isShowingDrinkCalendar = false
    @State private var isShowingMyLiquor = false
    @State private var drinkCalendarInitialDate = Date()
    @State private var isFunctionBarExpanded = true
    @State private var initialScrollOffset: CGFloat?

    private var filteredRecipes: [CocktailRecipe] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        let recipesInSelectedFilter = recipeStore.allRecipes.filter { recipe in
            let matchesFilter: Bool
            if selectedFilter == CocktailData.allFilter {
                matchesFilter = true
            } else if selectedFilter == CocktailData.favoritesFilter {
                matchesFilter = favoritesStore.contains(recipe)
            } else if selectedFilter == CocktailData.userFilter {
                matchesFilter = recipe.isUserCreated
            } else {
                matchesFilter = recipe.tags.contains(selectedFilter)
            }

            guard matchesFilter else { return false }
            return true
        }

        return RecipeSearch.filtered(recipesInSelectedFilter, query: query)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppBackground()

                VStack(spacing: 0) {
                    SearchField(text: $searchText)
                        .padding(.horizontal, 18)
                        .padding(.top, 12)
                        .padding(.bottom, 10)
                        .zIndex(1)

                    ScrollView {
                        GeometryReader { proxy in
                            Color.clear.preference(
                                key: RecipeScrollOffsetPreferenceKey.self,
                                value: proxy.frame(in: .global).minY
                            )
                        }
                        .frame(height: 0)

                        VStack(alignment: .leading, spacing: 16) {
                            HeaderCard(
                                totalCount: recipeStore.allRecipes.count,
                                userCount: recipeStore.userRecipes.count,
                                favoriteCount: favoritesStore.favoriteIDs.count
                            )

                            HomeDrinkCalendarCard(drinkLogStore: drinkLogStore) { date in
                                openDrinkCalendar(on: date)
                            }

                            FilterRail(selectedFilter: $selectedFilter)

                            HStack {
                                Text("\(filteredRecipes.count) 款")
                                    .font(.headline)
                                    .foregroundStyle(.primary)

                                Spacer()

                                Text(selectedFilter)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.top, 2)

                            if filteredRecipes.isEmpty {
                                EmptyStateView()
                                    .padding(.top, 40)
                            } else {
                                LazyVStack(spacing: 12) {
                                    ForEach(filteredRecipes) { recipe in
                                        NavigationLink(value: recipe) {
                                            RecipeCard(
                                                recipe: recipe,
                                                isFavorite: favoritesStore.contains(recipe)
                                            )
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }

                            Text(CocktailData.footerNote)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                                .padding(.top, 8)
                                .padding(.bottom, 120)
                        }
                        .padding(.horizontal, 18)
                        .padding(.top, 8)
                        .padding(.bottom, 18)
                    }
                    .onPreferenceChange(RecipeScrollOffsetPreferenceKey.self) { offset in
                        updateFunctionBar(for: offset)
                    }
                    .simultaneousGesture(
                        DragGesture(minimumDistance: 6)
                            .onChanged { value in
                                if value.translation.height < -6 {
                                    collapseFunctionBar()
                                } else if value.translation.height > 18 {
                                    expandFunctionBar()
                                }
                            }
                    )
                }
            }
            .navigationTitle("昏天黑地不省人事")
            .navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                BottomFunctionBar(isExpanded: isFunctionBarExpanded) {
                    expandFunctionBar()
                    isShowingAppearanceSettings = true
                } onMyLiquor: {
                    expandFunctionBar()
                    isShowingMyLiquor = true
                } onDrinkLog: {
                    openDrinkCalendar(on: Date())
                } onAddRecipe: {
                    expandFunctionBar()
                    isShowingAddRecipe = true
                } onExpand: {
                    expandFunctionBar()
                }
            }
            .sheet(isPresented: $isShowingAddRecipe) {
                AddRecipeView()
            }
            .sheet(isPresented: $isShowingAppearanceSettings) {
                AppearanceSettingsView()
            }
            .sheet(isPresented: $isShowingDrinkCalendar) {
                DrinkCalendarView(initialDate: drinkCalendarInitialDate)
            }
            .sheet(isPresented: $isShowingMyLiquor) {
                BarWebView()
            }
            .navigationDestination(for: CocktailRecipe.self) { recipe in
                RecipeDetailView(recipe: recipe)
            }
        }
    }

    private func updateFunctionBar(for offset: CGFloat) {
        if initialScrollOffset == nil {
            initialScrollOffset = offset
        }

        let movement = offset - (initialScrollOffset ?? offset)
        if movement < -12, isFunctionBarExpanded {
            collapseFunctionBar()
        } else if movement > -3, !isFunctionBarExpanded {
            expandFunctionBar()
        }
    }

    private func collapseFunctionBar() {
        guard isFunctionBarExpanded else { return }
        withAnimation(.spring(response: 0.44, dampingFraction: 0.84, blendDuration: 0.12)) {
            isFunctionBarExpanded = false
        }
    }

    private func expandFunctionBar() {
        guard !isFunctionBarExpanded else { return }
        withAnimation(.spring(response: 0.42, dampingFraction: 0.84, blendDuration: 0.12)) {
            isFunctionBarExpanded = true
        }
    }

    private func openDrinkCalendar(on date: Date) {
        expandFunctionBar()
        drinkCalendarInitialDate = date
        isShowingDrinkCalendar = true
    }
}

private struct RecipeScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0

    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

private struct BottomFunctionBar: View {
    let isExpanded: Bool
    let onTheme: () -> Void
    let onMyLiquor: () -> Void
    let onDrinkLog: () -> Void
    let onAddRecipe: () -> Void
    let onExpand: () -> Void

    var body: some View {
        HStack(spacing: isExpanded ? 8 : 18) {
            BottomFunctionButton(
                title: "主题",
                systemImage: "circle.lefthalf.filled",
                isExpanded: isExpanded,
                onExpand: onExpand,
                action: onTheme
            )

            BottomFunctionButton(
                title: "我的吧台",
                systemImage: "wineglass.fill",
                isExpanded: isExpanded,
                onExpand: onExpand,
                action: onMyLiquor
            )

            BottomFunctionButton(
                title: "饮酒记录",
                systemImage: "calendar",
                isExpanded: isExpanded,
                onExpand: onExpand,
                action: onDrinkLog
            )

            BottomFunctionButton(
                title: "添加配方",
                systemImage: "plus.circle.fill",
                isExpanded: isExpanded,
                onExpand: onExpand,
                action: onAddRecipe
            )
        }
        .frame(maxWidth: .infinity)
        .frame(height: isExpanded ? 84 : 58)
        .padding(.horizontal, isExpanded ? 12 : 0)
        .background {
            FunctionBarBackground()
                .opacity(isExpanded ? 1 : 0)
                .scaleEffect(x: isExpanded ? 1 : 0.76, y: isExpanded ? 1 : 0.68, anchor: .bottom)
                .blur(radius: isExpanded ? 0 : 5)
                .offset(y: isExpanded ? 0 : 10)
        }
        .padding(.horizontal, isExpanded ? 18 : 22)
        .padding(.top, isExpanded ? 12 : 10)
        .padding(.bottom, 8)
        .contentShape(Rectangle())
        .animation(.spring(response: 0.44, dampingFraction: 0.82, blendDuration: 0.12), value: isExpanded)
    }
}

private struct BottomFunctionButton: View {
    @Environment(\.colorScheme) private var colorScheme

    let title: String
    let systemImage: String
    let isExpanded: Bool
    let onExpand: () -> Void
    let action: () -> Void

    var body: some View {
        Button {
            if isExpanded {
                action()
            } else {
                onExpand()
            }
        } label: {
            ZStack {
                expandedContent
                    .opacity(isExpanded ? 1 : 0)
                    .scaleEffect(isExpanded ? 1 : 0.86)
                    .offset(y: isExpanded ? 0 : 10)
                    .blur(radius: isExpanded ? 0 : 2)

                compactContent
                    .opacity(isExpanded ? 0 : 1)
                    .scaleEffect(isExpanded ? 0.78 : 1)
                    .offset(y: isExpanded ? 8 : 0)
                    .blur(radius: isExpanded ? 2 : 0)
            }
            .frame(width: isExpanded ? 78 : 56)
            .frame(height: isExpanded ? 70 : 56)
            .foregroundStyle(labelColor)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
    }

    private var iconColor: Color {
        colorScheme == .dark ? Color(hex: "#0F1F24") : Color(hex: "#31535A")
    }

    private var labelColor: Color {
        colorScheme == .dark ? Color(hex: "#CDECE5") : Color(hex: "#31535A")
    }

    private var expandedContent: some View {
        VStack(spacing: 7) {
            Image(systemName: systemImage)
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(iconColor)
                .frame(width: 42, height: 34)

            Text(title)
                .font(.caption.weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
    }

    private var compactContent: some View {
        ZStack {
            Image(systemName: systemImage)
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(iconColor)
        }
        .frame(width: 52, height: 52)
        .systemGlassCircle()
    }
}

private struct FunctionBarBackground: View {
    var body: some View {
        if #available(iOS 26.0, *) {
            Color.clear
                .glassEffect(.clear.interactive(), in: Capsule())
        } else {
            Capsule()
                .fill(Color.appSurface.opacity(0.98))
                .shadow(color: Color.black.opacity(0.12), radius: 16, x: 0, y: 8)
        }
    }
}

private extension View {
    @ViewBuilder
    func systemGlassCircle() -> some View {
        if #available(iOS 26.0, *) {
            self
                .glassEffect(.clear.interactive(), in: Circle())
        } else {
            self
                .overlay(
                    Circle()
                        .stroke(Color(hex: "#31535A").opacity(0.22), lineWidth: 1)
                )
        }
    }
}

private struct HeaderCard: View {
    let totalCount: Int
    let userCount: Int
    let favoriteCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("酒是粮食精 越喝越年轻")
                        .font(.system(.largeTitle, design: .rounded, weight: .bold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)

                    Text("大喝特喝畅快饮！！")
                        .font(.headline.weight(.medium))
                        .foregroundStyle(.white.opacity(0.78))
                }

                Spacer()

                Image(systemName: "wineglass.fill")
                    .font(.system(size: 34, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 56, height: 56)
                    .background(.white.opacity(0.16))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }

            HStack(spacing: 10) {
                HeaderMetric(value: "\(totalCount)", label: "配方")
                HeaderMetric(value: "\(userCount)", label: "我的")
                HeaderMetric(value: "\(favoriteCount)", label: "收藏")
            }
        }
        .padding(18)
        .background(
            LinearGradient(
                colors: [
                    Color(hex: "#28464B"),
                    Color(hex: "#7C5948"),
                    Color(hex: "#B76E54")
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct HeaderMetric: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)

            Text(label)
                .font(.caption.weight(.medium))
                .foregroundStyle(.white.opacity(0.72))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(.white.opacity(0.13))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct HomeDrinkCalendarCard: View {
    @ObservedObject var drinkLogStore: DrinkLogStore
    let onSelectDate: (Date) -> Void

    private let calendar = Calendar.current
    private let weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"]

    private var monthStart: Date {
        let components = calendar.dateComponents([.year, .month], from: Date())
        return calendar.date(from: components) ?? calendar.startOfDay(for: Date())
    }

    private var monthDays: [Date?] {
        guard
            let monthInterval = calendar.dateInterval(of: .month, for: monthStart),
            let days = calendar.range(of: .day, in: .month, for: monthInterval.start)
        else { return [] }

        let leadingEmptyDays = calendar.component(.weekday, from: monthInterval.start) - 1
        let dates = days.compactMap { day -> Date? in
            calendar.date(byAdding: .day, value: day - 1, to: monthInterval.start)
        }

        return Array(repeating: nil, count: leadingEmptyDays) + dates
    }

    private var monthDrinkCount: Int {
        monthDays.compactMap { $0 }.reduce(0) { count, date in
            count + drinkLogStore.drinkCount(on: date)
        }
    }

    private var recentItems: [RecentDrinkLogItem] {
        drinkLogStore.recentEntries(limit: 3).map { item in
            RecentDrinkLogItem(date: item.date, entry: item.entry)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("本月饮酒日历")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.primary)

                    Text(monthDrinkCount == 0 ? "这个月还没有记录" : "这个月已记录 \(monthDrinkCount) 款酒")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    onSelectDate(Date())
                } label: {
                    Image(systemName: "calendar")
                        .font(.headline.weight(.semibold))
                        .frame(width: 42, height: 42)
                }
                .buttonStyle(.plain)
                .background(Color(hex: "#31535A").opacity(0.1))
                .clipShape(Circle())
                .accessibilityLabel("打开饮酒日历")
            }

            HStack(spacing: 6) {
                ForEach(weekdayLabels, id: \.self) { label in
                    Text(label)
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7), spacing: 6) {
                ForEach(Array(monthDays.enumerated()), id: \.offset) { _, date in
                    if let date {
                        HomeDrinkDayButton(
                            day: date,
                            drinkCount: drinkLogStore.drinkCount(on: date),
                            isToday: calendar.isDateInToday(date)
                        ) {
                            onSelectDate(date)
                        }
                    } else {
                        Color.clear
                            .frame(height: 34)
                    }
                }
            }

            if !recentItems.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(recentItems) { item in
                        Button {
                            onSelectDate(item.date)
                        } label: {
                            HStack(spacing: 8) {
                                Text(Self.shortDateFormatter.string(from: item.date))
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(Color(hex: "#B76E54"))
                                    .frame(width: 44, alignment: .leading)

                                Text(item.entry.recipeName)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.primary)
                                    .lineLimit(1)

                                Spacer()

                                if !item.entry.photoFilenames.isEmpty {
                                    Image(systemName: "photo.on.rectangle")
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.top, 2)
            }
        }
        .padding(16)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color.black.opacity(0.055), lineWidth: 1)
        )
    }

    private static let shortDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_Hans_CN")
        formatter.dateFormat = "M/d"
        return formatter
    }()
}

private struct RecentDrinkLogItem: Identifiable {
    let date: Date
    let entry: DrinkLogEntry

    var id: String {
        entry.id
    }
}

private struct HomeDrinkDayButton: View {
    let day: Date
    let drinkCount: Int
    let isToday: Bool
    let action: () -> Void

    private let calendar = Calendar.current

    var body: some View {
        Button(action: action) {
            ZStack(alignment: .topTrailing) {
                Text("\(calendar.component(.day, from: day))")
                    .font(.caption.weight(.bold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 34)
                    .foregroundStyle(isToday ? .white : .primary)
                    .background(isToday ? Color(hex: "#31535A") : Color(hex: "#31535A").opacity(0.055))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                if drinkCount > 0 {
                    Text("\(drinkCount)")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(minWidth: 15)
                        .frame(height: 13)
                        .background(Color(hex: "#B76E54"))
                        .clipShape(Capsule())
                        .padding(2)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("查看 \(calendar.component(.day, from: day)) 日饮酒记录")
    }
}

private struct SearchField: View {
    @Binding var text: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)

            TextField("搜索酒名或配料", text: $text)
                .disableAutocorrection(true)

            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .accessibilityLabel("清空搜索")
            }
        }
        .padding(.horizontal, 14)
        .frame(height: 48)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color.black.opacity(0.06), lineWidth: 1)
        )
    }
}

private struct FilterRail: View {
    @Binding var selectedFilter: String

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(CocktailData.filterTags, id: \.self) { filter in
                    Button {
                        selectedFilter = filter
                    } label: {
                        HStack(spacing: 6) {
                            if filter == CocktailData.favoritesFilter {
                                Image(systemName: "heart.fill")
                                    .font(.caption)
                            } else if filter == CocktailData.userFilter {
                                Image(systemName: "person.crop.circle.fill")
                                    .font(.caption)
                            }

                            Text(filter)
                                .font(.subheadline.weight(.semibold))
                        }
                        .padding(.horizontal, 13)
                        .frame(height: 36)
                        .foregroundStyle(selectedFilter == filter ? .white : Color(hex: "#31535A"))
                        .background(selectedFilter == filter ? Color(hex: "#31535A") : Color.appSurface)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 2)
        }
    }
}

private struct RecipeCard: View {
    @EnvironmentObject private var myLiquorStore: MyLiquorStore

    let recipe: CocktailRecipe
    let isFavorite: Bool

    private var recipeLiquors: [String] {
        LiquorInventoryCatalog.stockCategories(for: recipe)
    }

    private var missingLiquors: [String] {
        LiquorInventoryCatalog.missingCategories(for: recipe, ownedLiquors: myLiquorStore.ownedLiquors)
    }

    private var hasMissingLiquor: Bool {
        !missingLiquors.isEmpty
    }

    var body: some View {
        HStack(spacing: 14) {
            RecipeThumbnailView(recipe: recipe, symbolName: symbolName)

            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(recipe.chineseName)
                        .font(.headline.weight(.bold))
                        .foregroundStyle(hasMissingLiquor ? Color(hex: "#C45A5A") : Color.primary)
                        .lineLimit(2)
                        .minimumScaleFactor(0.82)
                        .animation(.easeInOut(duration: 0.22), value: hasMissingLiquor)

                    if isFavorite {
                        Image(systemName: "heart.fill")
                            .font(.caption)
                            .foregroundStyle(Color(hex: "#C45A5A"))
                    }
                }

                Text(recipe.englishName)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)

                HStack(spacing: 8) {
                    if recipe.isUserCreated {
                        TagPill(text: "我的", tint: Color(hex: "#B76E54"))
                    }

                    if recipeLiquors.isEmpty {
                        TagPill(text: recipe.tags.first ?? "配方")
                    } else {
                        ForEach(recipeLiquors.prefix(3), id: \.self) { liquor in
                            TagPill(
                                text: liquor,
                                tint: missingLiquors.contains(liquor) ? Color(hex: "#C45A5A") : Color(hex: "#31535A")
                            )
                        }
                    }

                    Text("\(recipe.ingredients.count) 项")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }
            }

            Spacer(minLength: 8)

            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(.tertiary)
        }
        .padding(14)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color.black.opacity(0.055), lineWidth: 1)
        )
    }

    private var symbolName: String {
        if recipe.tags.contains("咖啡") { return "cup.and.saucer.fill" }
        if recipe.tags.contains("百利甜") { return "mug.fill" }
        if recipe.tags.contains("长饮") { return "tropicalstorm" }
        if recipe.tags.contains("酸爽") { return "drop.fill" }
        return "wineglass.fill"
    }
}

private struct RecipeThumbnailView: View {
    let recipe: CocktailRecipe
    let symbolName: String

    @State private var localImage: UIImage?
    @State private var thumbnailURL: URL?
    @State private var didRequestThumbnail = false

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Color(hex: recipe.accentHex).opacity(0.18))

            if let localImage {
                Image(uiImage: localImage)
                    .resizable()
                    .scaledToFill()
                    .transition(.opacity.combined(with: .scale(scale: 1.02)))
            } else if let thumbnailURL {
                AsyncImage(
                    url: thumbnailURL,
                    transaction: Transaction(animation: .easeInOut(duration: 0.24))
                ) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .transition(.opacity.combined(with: .scale(scale: 1.02)))
                    case .empty:
                        fallbackIcon
                    case .failure:
                        fallbackIcon
                    @unknown default:
                        fallbackIcon
                    }
                }
            } else {
                fallbackIcon
            }
        }
        .frame(width: 58, height: 58)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color.black.opacity(0.055), lineWidth: 1)
        )
        .task(id: recipe.id) {
            guard !didRequestThumbnail else { return }
            didRequestThumbnail = true

            if let savedImage = RecipeLocalThumbnailStore.image(for: recipe.id) {
                localImage = savedImage
                return
            }

            thumbnailURL = await CocktailThumbnailStore.shared.thumbnailURL(for: recipe)
        }
    }

    private var fallbackIcon: some View {
        Image(systemName: symbolName)
            .font(.system(size: 25, weight: .semibold))
            .foregroundStyle(Color(hex: recipe.accentHex))
    }
}

private struct RecipeDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var favoritesStore: FavoritesStore
    @EnvironmentObject private var recipeStore: RecipeStore
    @EnvironmentObject private var myLiquorStore: MyLiquorStore
    @State private var isShowingDeleteConfirmation = false
    @State private var isShowingFollowAlong = false

    let recipe: CocktailRecipe

    private var missingLiquors: [String] {
        LiquorInventoryCatalog.missingCategories(for: recipe, ownedLiquors: myLiquorStore.ownedLiquors)
    }

    var body: some View {
        ZStack {
            AppBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    DetailHero(recipe: recipe, isFavorite: favoritesStore.contains(recipe), missingLiquors: missingLiquors)

                    Button {
                        isShowingFollowAlong = true
                    } label: {
                        Label("开始跟做 · 查看我的材料", systemImage: "play.circle.fill")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                    }
                    .buttonStyle(.borderedProminent)

                    DetailSection(title: "配料") {
                        VStack(spacing: 10) {
                            ForEach(Array(recipe.ingredients.enumerated()), id: \.offset) { index, ingredient in
                                IngredientRow(
                                    index: index + 1,
                                    text: ingredient,
                                    accent: Color(hex: recipe.accentHex),
                                    isMissing: LiquorInventoryCatalog.isMissingIngredient(
                                        ingredient,
                                        recipe: recipe,
                                        ownedLiquors: myLiquorStore.ownedLiquors
                                    )
                                )
                            }
                        }
                    }

                    DetailSection(title: "杯型与做法") {
                        VStack(spacing: 10) {
                            InfoRow(icon: "wineglass", title: "杯型", text: recipe.glass)
                            InfoRow(icon: "arrow.triangle.2.circlepath", title: "做法", text: recipe.method)
                        }
                    }

                    if let note = recipe.note {
                        DetailSection(title: "小记") {
                            Text(note)
                                .font(.body)
                                .foregroundStyle(.primary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }

                    DetailSection(title: "标签") {
                        FlowTags(tags: recipe.tags, accent: Color(hex: recipe.accentHex), missingTags: missingLiquors)
                    }

                    Text(CocktailData.footerNote)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .padding(.top, 4)
                }
                .padding(18)
            }
        }
        .navigationTitle(recipe.chineseName)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $isShowingFollowAlong) {
            BarWebView(initialRoute: "recipe/\(recipe.id)")
        }
        .toolbar {
            if recipe.isUserCreated {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(role: .destructive) {
                        isShowingDeleteConfirmation = true
                    } label: {
                        Image(systemName: "trash")
                    }
                    .accessibilityLabel("删除配方")
                }
            }

            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    favoritesStore.toggle(recipe)
                } label: {
                    Image(systemName: favoritesStore.contains(recipe) ? "heart.fill" : "heart")
                        .foregroundStyle(favoritesStore.contains(recipe) ? Color(hex: "#C45A5A") : .primary)
                }
                .accessibilityLabel(favoritesStore.contains(recipe) ? "取消收藏" : "收藏")
            }
        }
        .confirmationDialog("删除这个配方？", isPresented: $isShowingDeleteConfirmation, titleVisibility: .visible) {
            Button("删除", role: .destructive) {
                favoritesStore.remove(recipe)
                recipeStore.delete(recipe)
                dismiss()
            }

            Button("取消", role: .cancel) { }
        }
    }
}

private struct DetailHero: View {
    let recipe: CocktailRecipe
    let isFavorite: Bool
    let missingLiquors: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(recipe.chineseName)
                        .font(.system(.largeTitle, design: .rounded, weight: .bold))
                        .foregroundStyle(missingLiquors.isEmpty ? Color.white : Color(hex: "#FFD1D1"))
                        .lineLimit(2)
                        .minimumScaleFactor(0.72)
                        .animation(.easeInOut(duration: 0.22), value: missingLiquors)

                    Text(recipe.englishName)
                        .font(.headline.weight(.medium))
                        .foregroundStyle(.white.opacity(0.78))
                        .lineLimit(2)
                }

                Spacer(minLength: 10)

                Image(systemName: isFavorite ? "heart.fill" : "wineglass.fill")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 52, height: 52)
                    .background(.white.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }

            HStack(spacing: 8) {
                if recipe.isUserCreated {
                    HeroBadge(text: "我的配方")
                }

                HeroBadge(text: recipe.baseSummary.isEmpty ? "调饮" : recipe.baseSummary)
                HeroBadge(text: "\(recipe.ingredients.count) 项配料")

                if !missingLiquors.isEmpty {
                    HeroBadge(text: "缺 \(missingLiquors.count) 类")
                }
            }
        }
        .padding(18)
        .background(
            LinearGradient(
                colors: [
                    Color(hex: recipe.accentHex),
                    Color(hex: "#263E43")
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct DetailSection<Content: View>: View {
    let title: String
    private let content: () -> Content

    init(title: String, @ViewBuilder content: @escaping () -> Content) {
        self.title = title
        self.content = content
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline.weight(.bold))
                .foregroundStyle(.primary)

            content()
        }
        .padding(16)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color.black.opacity(0.055), lineWidth: 1)
        )
    }
}

private struct IngredientRow: View {
    let index: Int
    let text: String
    let accent: Color
    var isMissing: Bool = false

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text("\(index)")
                .font(.caption.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 24, height: 24)
                .background(isMissing ? Color(hex: "#C45A5A") : accent)
                .clipShape(Circle())

            Text(text)
                .font(.body)
                .foregroundStyle(isMissing ? Color(hex: "#C45A5A") : Color.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .animation(.easeInOut(duration: 0.22), value: isMissing)
        }
    }
}

private struct InfoRow: View {
    let icon: String
    let title: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.headline)
                .foregroundStyle(Color(hex: "#31535A"))
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)

                Text(text)
                    .font(.body)
                    .foregroundStyle(.primary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct FlowTags: View {
    let tags: [String]
    let accent: Color
    var missingTags: [String] = []

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 76), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(tags, id: \.self) { tag in
                TagPill(text: tag, tint: missingTags.contains(tag) ? Color(hex: "#C45A5A") : accent)
            }
        }
    }
}

private struct HeroBadge: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption.weight(.bold))
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.72)
            .padding(.horizontal, 10)
            .frame(height: 30)
            .background(.white.opacity(0.16))
            .clipShape(Capsule())
    }
}

private struct TagPill: View {
    let text: String
    var tint: Color = Color(hex: "#31535A")

    var body: some View {
        Text(text)
            .font(.caption.weight(.bold))
            .foregroundStyle(tint)
            .lineLimit(1)
            .minimumScaleFactor(0.72)
            .padding(.horizontal, 9)
            .frame(height: 24)
            .background(tint.opacity(0.11))
            .clipShape(Capsule())
    }
}

private struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 34, weight: .semibold))
                .foregroundStyle(.secondary)

            Text("没有找到匹配配方")
                .font(.headline)

            Text("换个酒名、基酒或配料试试")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(28)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct AppBackground: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        LinearGradient(
            colors: colorScheme == .dark ? darkColors : lightColors,
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }

    private var lightColors: [Color] {
        [
            Color(hex: "#F8F2EA"),
            Color(hex: "#EFF7F3"),
            Color(hex: "#F6ECEC")
        ]
    }

    private var darkColors: [Color] {
        [
            Color(hex: "#0F1F24"),
            Color(hex: "#182629"),
            Color(hex: "#2B2022")
        ]
    }
}

extension Color {
    static var appSurface: Color {
        Color(.secondarySystemGroupedBackground)
    }

    init(hex: String) {
        let cleanHex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: cleanHex).scanHexInt64(&value)

        let red = Double((value >> 16) & 0xFF) / 255.0
        let green = Double((value >> 8) & 0xFF) / 255.0
        let blue = Double(value & 0xFF) / 255.0

        self.init(.sRGB, red: red, green: green, blue: blue, opacity: 1)
    }
}
