import SwiftUI
import WidgetKit

struct DailyCocktailEntry: TimelineEntry {
    let date: Date
    let recipe: CocktailRecipe
}

struct DailyCocktailProvider: TimelineProvider {
    func placeholder(in context: Context) -> DailyCocktailEntry {
        DailyCocktailEntry(date: Date(), recipe: CocktailLibrary.dailyRecipe())
    }

    func getSnapshot(in context: Context, completion: @escaping (DailyCocktailEntry) -> Void) {
        completion(DailyCocktailEntry(date: Date(), recipe: CocktailLibrary.dailyRecipe()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyCocktailEntry>) -> Void) {
        let now = Date()
        let calendar = Calendar.current
        let nextUpdate = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now)) ?? now.addingTimeInterval(86400)
        let entry = DailyCocktailEntry(date: now, recipe: CocktailLibrary.dailyRecipe(for: now))
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

struct DailyCocktailWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var colorScheme
    let entry: DailyCocktailEntry

    var body: some View {
        switch family {
        case .systemSmall:
            smallView
        case .systemMedium:
            mediumView
        case .systemLarge, .systemExtraLarge:
            largeView
        case .accessoryInline:
            Text("今日：\(entry.recipe.chineseName)")
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: iconName)
                    .font(.title3.weight(.bold))
                Text(String(entry.recipe.chineseName.prefix(1)))
                    .font(.caption2.weight(.bold))
                    .offset(y: 18)
            }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text("今日推荐")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(entry.recipe.chineseName)
                    .font(.headline)
                    .lineLimit(1)
                Text(entry.recipe.baseSummary.isEmpty ? entry.recipe.englishName : entry.recipe.baseSummary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        @unknown default:
            smallView
        }
    }

    private var smallView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: iconName)
                .font(.title2.weight(.bold))
                .foregroundStyle(accent)

            Spacer(minLength: 4)

            Text("今日推荐")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            Text(entry.recipe.chineseName)
                .font(.headline.weight(.bold))
                .lineLimit(2)

            Text(entry.recipe.baseSummary.isEmpty ? entry.recipe.englishName : entry.recipe.baseSummary)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .padding()
        .widgetBackground(background)
    }

    private var mediumView: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(accent.opacity(colorScheme == .dark ? 0.28 : 0.16))
                Image(systemName: iconName)
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(accent)
            }
            .frame(width: 74, height: 74)

            VStack(alignment: .leading, spacing: 6) {
                Text("今日推荐")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(entry.recipe.chineseName)
                    .font(.title3.weight(.bold))
                    .lineLimit(1)
                Text(entry.recipe.englishName)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Text(entry.recipe.ingredients.prefix(3).joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding()
        .widgetBackground(background)
    }

    private var largeView: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("今日推荐")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text(entry.recipe.chineseName)
                        .font(.title.weight(.bold))
                        .lineLimit(2)
                    Text(entry.recipe.englishName)
                        .font(.headline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer()

                Image(systemName: iconName)
                    .font(.system(size: 38, weight: .bold))
                    .foregroundStyle(accent)
            }

            Divider()

            VStack(alignment: .leading, spacing: 7) {
                ForEach(entry.recipe.ingredients.prefix(6), id: \.self) { ingredient in
                    HStack(alignment: .firstTextBaseline, spacing: 7) {
                        Circle()
                            .fill(accent)
                            .frame(width: 6, height: 6)
                        Text(ingredient)
                            .font(.subheadline)
                            .lineLimit(1)
                    }
                }
            }

            Text(entry.recipe.method)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .lineLimit(3)
        }
        .padding()
        .widgetBackground(background)
    }

    private var accent: Color {
        Color(hex: entry.recipe.accentHex)
    }

    private var background: LinearGradient {
        LinearGradient(
            colors: colorScheme == .dark
                ? [Color(hex: "#101F24"), Color(hex: "#2A2022")]
                : [Color(hex: "#FBF5EC"), Color(hex: "#EEF7F3")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var iconName: String {
        if entry.recipe.tags.contains("咖啡") { return "cup.and.saucer.fill" }
        if entry.recipe.tags.contains("长饮") { return "tropicalstorm" }
        if entry.recipe.tags.contains("酸爽") { return "drop.fill" }
        return "wineglass.fill"
    }
}

struct DailyCocktailWidget: Widget {
    let kind = "DailyCocktailWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyCocktailProvider()) { entry in
            DailyCocktailWidgetView(entry: entry)
        }
        .configurationDisplayName("每日鸡尾酒")
        .description("每天推荐一款鸡尾酒配方。")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .systemExtraLarge,
            .accessoryInline,
            .accessoryCircular,
            .accessoryRectangular
        ])
    }
}

@main
struct Cocktail60WidgetBundle: WidgetBundle {
    var body: some Widget {
        DailyCocktailWidget()
    }
}

private extension View {
    @ViewBuilder
    func widgetBackground(_ background: LinearGradient) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) {
                background
            }
        } else {
            self.background(background)
        }
    }
}

private extension Color {
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
