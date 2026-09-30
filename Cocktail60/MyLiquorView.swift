import SwiftUI

struct MyLiquorView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var recipeStore: RecipeStore
    @EnvironmentObject private var myLiquorStore: MyLiquorStore

    @State private var newLiquorName = ""

    private var availableCategories: [String] {
        LiquorInventoryCatalog.categories(
            from: recipeStore.allRecipes,
            ownedLiquors: myLiquorStore.ownedLiquors
        )
    }

    private var sortedOwnedLiquors: [String] {
        availableCategories.filter { myLiquorStore.ownedLiquors.contains($0) }
            + myLiquorStore.ownedLiquors.subtracting(availableCategories).sorted()
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppBackground()

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        summaryCard
                        inputCard
                        ownedCard
                        categoryCard
                    }
                    .padding(18)
                }
            }
            .navigationTitle("我的酒")
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

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("库存酒类")
                .font(.headline.weight(.bold))
                .foregroundStyle(.primary)

            Text(myLiquorStore.ownedLiquors.isEmpty ? "还没有登记。登记后，缺少的酒类和对应鸡尾酒会自动标红。" : "已登记 \(myLiquorStore.ownedLiquors.count) 种酒类。")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color.black.opacity(0.055), lineWidth: 1)
        )
    }

    private var inputCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("手动添加")
                .font(.headline.weight(.bold))

            HStack(spacing: 10) {
                TextField("例如：金酒、橙味利口酒、味美思", text: $newLiquorName)
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.done)
                    .onSubmit(addNewLiquor)

                Button(action: addNewLiquor) {
                    Image(systemName: "plus")
                        .font(.headline.weight(.bold))
                        .frame(width: 42, height: 42)
                }
                .buttonStyle(.borderedProminent)
                .disabled(newLiquorName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .accessibilityLabel("添加酒类")
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

    private var ownedCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("我已有")
                .font(.headline.weight(.bold))

            if sortedOwnedLiquors.isEmpty {
                Text("还没有选择任何酒类。")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                LazyVGrid(columns: chipColumns, alignment: .leading, spacing: 8) {
                    ForEach(sortedOwnedLiquors, id: \.self) { liquor in
                        RemovableLiquorChip(title: liquor) {
                            myLiquorStore.remove(liquor)
                        }
                    }
                }
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

    private var categoryCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("配方酒类")
                .font(.headline.weight(.bold))

            LazyVGrid(columns: chipColumns, alignment: .leading, spacing: 8) {
                ForEach(availableCategories, id: \.self) { category in
                    LiquorToggleChip(
                        title: category,
                        isSelected: myLiquorStore.contains(category)
                    ) {
                        myLiquorStore.toggle(category)
                    }
                }
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

    private func addNewLiquor() {
        myLiquorStore.add(newLiquorName)
        newLiquorName = ""
    }

    private var chipColumns: [GridItem] {
        [GridItem(.adaptive(minimum: 88), spacing: 8)]
    }
}

private struct LiquorToggleChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.caption.weight(.bold))

                Text(title)
                    .font(.caption.weight(.bold))
                    .lineLimit(1)
            }
            .foregroundStyle(isSelected ? .white : Color(hex: "#31535A"))
            .padding(.horizontal, 10)
            .frame(height: 30)
            .background(isSelected ? Color(hex: "#31535A") : Color(hex: "#31535A").opacity(0.09))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

private struct RemovableLiquorChip: View {
    let title: String
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            Text(title)
                .font(.caption.weight(.bold))

            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.caption.weight(.bold))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("移除 \(title)")
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 10)
        .frame(height: 30)
        .background(Color(hex: "#31535A"))
        .clipShape(Capsule())
    }
}
