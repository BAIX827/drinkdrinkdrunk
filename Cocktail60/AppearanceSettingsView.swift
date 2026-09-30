import SwiftUI

struct AppearanceSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appearanceStore: AppearanceStore

    var body: some View {
        NavigationStack {
            Form {
                Section("显示模式") {
                    Picker("显示模式", selection: appearanceBinding) {
                        ForEach(AppAppearance.allCases) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("App 图标") {
                    Text("图标会交给 iOS 按系统外观自动选择，不会再弹出切换提示。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("外观")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var appearanceBinding: Binding<AppAppearance> {
        Binding(
            get: { appearanceStore.appearance },
            set: { appearanceStore.setAppearance($0) }
        )
    }

}
