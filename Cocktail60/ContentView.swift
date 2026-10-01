import SwiftUI

struct ContentView: View {
    var body: some View { BarWebView() }
}

struct AppBackground: View {
    @Environment(\.colorScheme) private var colorScheme
    var body: some View {
        Color(hex: colorScheme == .dark ? "#0E1714" : "#F2ECDF").ignoresSafeArea()
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
