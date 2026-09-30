import SwiftUI

enum AppAppearance: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: return "跟随系统"
        case .light: return "浅色"
        case .dark: return "深色"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

final class AppearanceStore: ObservableObject {
    @Published private(set) var appearance: AppAppearance {
        didSet { saveAppearance() }
    }

    private let appearanceKey = "appAppearance"

    init() {
        let savedAppearance = UserDefaults.standard.string(forKey: appearanceKey)
        appearance = AppAppearance(rawValue: savedAppearance ?? "") ?? .system
    }

    var preferredColorScheme: ColorScheme? {
        appearance.colorScheme
    }

    func setAppearance(_ newAppearance: AppAppearance) {
        appearance = newAppearance
    }

    private func saveAppearance() {
        UserDefaults.standard.set(appearance.rawValue, forKey: appearanceKey)
    }
}
