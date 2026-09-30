import SwiftUI

struct AddRecipeView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var recipeStore: RecipeStore

    @State private var chineseName = ""
    @State private var englishName = ""
    @State private var ingredients = [
        IngredientField(),
        IngredientField(),
        IngredientField()
    ]
    @State private var glass = ""
    @State private var method = ""
    @State private var selectedTags: Set<String> = []
    @State private var customTags = ""
    @State private var note = ""
    @State private var isShowingXiaohongshuImport = false

    private let suggestedTags = CocktailData.baseFilters + ["咖啡", "奶油", "酸爽", "长饮"]

    private var cleanedIngredients: [String] {
        ingredients
            .map { $0.text.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    private var cleanedTags: [String] {
        let custom = customTags
            .split { character in
                character == "," || character == "，" || character == "、" || character == " "
            }
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        let combined = Array(selectedTags) + custom
        let unique = NSOrderedSet(array: combined).array as? [String] ?? combined
        return unique.isEmpty ? ["自制"] : unique
    }

    private var canSave: Bool {
        !chineseName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !cleanedIngredients.isEmpty &&
        !glass.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !method.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("小红书") {
                    Button {
                        isShowingXiaohongshuImport = true
                    } label: {
                        Label("搜索并导入小红书配方", systemImage: "magnifyingglass.circle.fill")
                    }
                }

                Section("酒名") {
                    TextField("中文名，例如：金汤力", text: $chineseName)
                    TextField("英文名，可选", text: $englishName)
                }

                Section("配料") {
                    ForEach($ingredients) { $ingredient in
                        HStack(spacing: 8) {
                            TextField("例如：金酒 45 ml", text: $ingredient.text)

                            if ingredients.count > 1 {
                                Button {
                                    removeIngredient(ingredient.id)
                                } label: {
                                    Image(systemName: "minus.circle.fill")
                                        .foregroundStyle(Color(hex: "#C45A5A"))
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("删除配料")
                            }
                        }
                    }

                    Button {
                        ingredients.append(IngredientField())
                    } label: {
                        Label("添加一项配料", systemImage: "plus.circle.fill")
                    }
                }

                Section("杯型与做法") {
                    TextField("杯型，例如：高球杯", text: $glass)
                    TextField("做法，例如：杯中加冰直调", text: $method, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section("标签") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 82), spacing: 8)], alignment: .leading, spacing: 8) {
                        ForEach(suggestedTags, id: \.self) { tag in
                            Button {
                                toggleTag(tag)
                            } label: {
                                Text(tag)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(selectedTags.contains(tag) ? .white : Color(hex: "#31535A"))
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 34)
                                    .background(selectedTags.contains(tag) ? Color(hex: "#31535A") : Color(hex: "#31535A").opacity(0.12))
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 4)

                    TextField("其他标签，可用逗号分隔", text: $customTags)
                }

                Section("备注") {
                    TextField("可选，例如：适合少糖或加薄荷", text: $note, axis: .vertical)
                        .lineLimit(2...5)
                }
            }
            .sheet(isPresented: $isShowingXiaohongshuImport) {
                XiaohongshuImportView {
                    dismiss()
                }
            }
            .navigationTitle("添加配方")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        save()
                    }
                    .disabled(!canSave)
                }
            }
        }
    }

    private func toggleTag(_ tag: String) {
        if selectedTags.contains(tag) {
            selectedTags.remove(tag)
        } else {
            selectedTags.insert(tag)
        }
    }

    private func removeIngredient(_ id: IngredientField.ID) {
        guard ingredients.count > 1 else { return }
        ingredients.removeAll { $0.id == id }
    }

    private func save() {
        let chinese = chineseName.trimmingCharacters(in: .whitespacesAndNewlines)
        let english = englishName.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanedGlass = glass.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanedMethod = method.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanedNote = note.trimmingCharacters(in: .whitespacesAndNewlines)

        recipeStore.add(
            chineseName: chinese,
            englishName: english.isEmpty ? "自定义配方" : english,
            ingredients: cleanedIngredients,
            tags: cleanedTags,
            glass: cleanedGlass,
            method: cleanedMethod,
            note: cleanedNote.isEmpty ? nil : cleanedNote
        )

        dismiss()
    }
}

private struct IngredientField: Identifiable {
    let id = UUID()
    var text = ""
}
