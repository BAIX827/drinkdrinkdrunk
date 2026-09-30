import SwiftUI
import PhotosUI
import UIKit

struct DrinkCalendarView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var recipeStore: RecipeStore
    @EnvironmentObject private var drinkLogStore: DrinkLogStore

    @State private var displayedMonth = Calendar.current.startOfMonth(for: Date())
    @State private var selectedDate = Date()
    @State private var selectedRecipeID = ""
    @State private var drinkNameText = ""
    @State private var drinkEnglishNameText = ""
    @State private var noteText = ""
    @State private var selectedImages: [UIImage] = []
    @State private var selectedPhotoItems: [PhotosPickerItem] = []
    @State private var cameraImage: UIImage?
    @State private var editingEntryID: DrinkLogEntry.ID?
    @State private var pickerSource: PickerSource?

    private let calendar = Calendar.current
    private let weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"]

    init(initialDate: Date = Date()) {
        let calendar = Calendar.current
        _displayedMonth = State(initialValue: calendar.startOfMonth(for: initialDate))
        _selectedDate = State(initialValue: initialDate)
    }

    private var selectedEntries: [DrinkLogEntry] {
        drinkLogStore.entries(for: selectedDate)
    }

    private var editingEntry: DrinkLogEntry? {
        selectedEntries.first { $0.id == editingEntryID }
    }

    private var availableRecipesForEditor: [CocktailRecipe] {
        recipeStore.allRecipes
    }

    private var canSaveEntry: Bool {
        !drinkNameText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppBackground()

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        monthHeader
                        weekdayHeader
                        calendarGrid
                        selectedDayCard
                    }
                    .padding(18)
                }
            }
            .navigationTitle("饮酒日历")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
            .sheet(item: $pickerSource) { source in
                ImageCapturePicker(image: $cameraImage, sourceType: source.sourceType)
                    .ignoresSafeArea()
            }
            .onAppear {
                loadSelectedDay()
            }
            .onChange(of: selectedDate) { _ in
                loadSelectedDay()
            }
            .onChange(of: selectedPhotoItems) { items in
                appendPhotos(from: items)
            }
            .onChange(of: cameraImage) { image in
                guard let image else { return }
                selectedImages.append(image)
                cameraImage = nil
            }
        }
    }

    private var monthHeader: some View {
        HStack(spacing: 12) {
            Button {
                shiftMonth(by: -1)
            } label: {
                Image(systemName: "chevron.left")
                    .font(.headline.weight(.semibold))
                    .frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("上个月")

            VStack(alignment: .leading, spacing: 2) {
                Text(Self.monthFormatter.string(from: displayedMonth))
                    .font(.title2.weight(.bold))
                    .foregroundStyle(.primary)

                Text(selectedDateTitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button("今天") {
                selectedDate = Date()
                displayedMonth = calendar.startOfMonth(for: Date())
            }
            .font(.subheadline.weight(.semibold))
            .buttonStyle(.bordered)

            Button {
                shiftMonth(by: 1)
            } label: {
                Image(systemName: "chevron.right")
                    .font(.headline.weight(.semibold))
                    .frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("下个月")
        }
        .padding(16)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color.black.opacity(0.055), lineWidth: 1)
        )
    }

    private var weekdayHeader: some View {
        HStack(spacing: 8) {
            ForEach(weekdayLabels, id: \.self) { label in
                Text(label)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, 4)
    }

    private var calendarGrid: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 7), spacing: 8) {
            ForEach(Array(monthDays.enumerated()), id: \.offset) { _, date in
                if let date {
                    CalendarDayButton(
                        day: date,
                        isSelected: calendar.isDate(date, inSameDayAs: selectedDate),
                        isToday: calendar.isDateInToday(date),
                        drinkCount: drinkLogStore.drinkCount(on: date)
                    ) {
                        selectedDate = date
                    }
                } else {
                    Color.clear
                        .frame(height: 48)
                }
            }
        }
    }

    private var selectedDayCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(calendar.isDateInToday(selectedDate) ? "今天喝了什么" : "这天喝了什么")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.primary)

                    Text(daySummary)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if !selectedEntries.isEmpty {
                    Button(role: .destructive) {
                        drinkLogStore.deleteLog(for: selectedDate)
                        loadSelectedDay()
                    } label: {
                        Image(systemName: "trash")
                    }
                    .accessibilityLabel("清空这天记录")
                }
            }

            entriesSection

            Divider()

            entryEditor
        }
        .padding(16)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color.black.opacity(0.055), lineWidth: 1)
        )
    }

    private var entriesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            if selectedEntries.isEmpty {
                Text("还没有记录，下面添加第一款酒。")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 6)
            } else {
                ForEach(selectedEntries) { entry in
                    DrinkEntryRow(
                        entry: entry,
                        images: drinkLogStore.images(for: entry),
                        isEditing: entry.id == editingEntryID,
                        onEdit: {
                            edit(entry)
                        },
                        onDelete: {
                            drinkLogStore.deleteEntry(entry, for: selectedDate)
                            if editingEntryID == entry.id {
                                resetEditor()
                            }
                        }
                    )
                }
            }
        }
    }

    private var entryEditor: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(editingEntry == nil ? "添加一款酒" : "编辑这款酒")
                    .font(.headline.weight(.bold))

                Spacer()

                if editingEntry != nil {
                    Button("取消编辑") {
                        resetEditor()
                    }
                    .font(.subheadline.weight(.semibold))
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                TextField("酒名 / 种类，例如：金汤力、威士忌酸、朋友调的特饮", text: $drinkNameText)
                    .textFieldStyle(.roundedBorder)

                HStack(spacing: 10) {
                    TextField("英文名或补充名，可选", text: $drinkEnglishNameText)
                        .textFieldStyle(.roundedBorder)

                    Menu {
                        ForEach(availableRecipesForEditor) { recipe in
                            Button(recipe.chineseName) {
                                fillFromRecipe(recipe)
                            }
                        }
                    } label: {
                        Label("配方", systemImage: "list.bullet.rectangle")
                            .font(.subheadline.weight(.semibold))
                    }
                    .buttonStyle(.bordered)
                }
            }

            TextField("备注，可选，例如：少糖、朋友聚会、很清爽", text: $noteText, axis: .vertical)
                .lineLimit(2...4)
                .textFieldStyle(.roundedBorder)

            photoSection

            Button {
                saveSelectedEntry()
            } label: {
                Label(editingEntry == nil ? "添加这款酒" : "更新这款酒", systemImage: "checkmark.circle.fill")
                    .font(.headline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 46)
            }
            .buttonStyle(.borderedProminent)
            .disabled(!canSaveEntry)
        }
    }

    private var photoSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            if selectedImages.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundStyle(Color(hex: "#31535A"))

                    Text("还没有照片")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 150)
                .background(Color(hex: "#31535A").opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(selectedImages.indices, id: \.self) { index in
                            ZStack(alignment: .topTrailing) {
                                Image(uiImage: selectedImages[index])
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 128, height: 128)
                                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                                            .stroke(Color.black.opacity(0.08), lineWidth: 1)
                                    )

                                Button {
                                    selectedImages.remove(at: index)
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.title3)
                                        .symbolRenderingMode(.palette)
                                        .foregroundStyle(.white, Color.black.opacity(0.45))
                                        .padding(6)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("移除第 \(index + 1) 张照片")
                            }
                        }
                    }
                    .padding(.vertical, 2)
                }
            }

            HStack(spacing: 10) {
                if UIImagePickerController.isSourceTypeAvailable(.camera) {
                    Button {
                        pickerSource = PickerSource(sourceType: .camera)
                    } label: {
                        Label("拍照", systemImage: "camera.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }

                PhotosPicker(selection: $selectedPhotoItems, maxSelectionCount: 24, matching: .images) {
                    Label("相册", systemImage: "photo.on.rectangle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private var monthDays: [Date?] {
        guard
            let monthInterval = calendar.dateInterval(of: .month, for: displayedMonth),
            let days = calendar.range(of: .day, in: .month, for: monthInterval.start)
        else { return [] }

        let leadingEmptyDays = calendar.component(.weekday, from: monthInterval.start) - 1
        let dates = days.compactMap { day -> Date? in
            calendar.date(byAdding: .day, value: day - 1, to: monthInterval.start)
        }

        return Array(repeating: nil, count: leadingEmptyDays) + dates
    }

    private var selectedDateTitle: String {
        Self.dayFormatter.string(from: selectedDate)
    }

    private var daySummary: String {
        if selectedEntries.isEmpty {
            return "选一款酒，再拍张照片留个念"
        }

        let photoCount = selectedEntries.reduce(0) { $0 + $1.photoFilenames.count }
        if photoCount > 0 {
            return "已记录 \(selectedEntries.count) 款酒，\(photoCount) 张照片"
        }
        return "已记录 \(selectedEntries.count) 款酒"
    }

    private func shiftMonth(by value: Int) {
        guard let newMonth = calendar.date(byAdding: .month, value: value, to: displayedMonth) else { return }
        displayedMonth = newMonth

        if !calendar.isDate(selectedDate, equalTo: newMonth, toGranularity: .month) {
            selectedDate = newMonth
        }
    }

    private func loadSelectedDay() {
        editingEntryID = nil
        resetEditor()
    }

    private func edit(_ entry: DrinkLogEntry) {
        editingEntryID = entry.id
        selectedRecipeID = entry.recipeID
        drinkNameText = entry.recipeName
        drinkEnglishNameText = entry.recipeEnglishName
        noteText = entry.note
        selectedImages = drinkLogStore.images(for: entry)
    }

    private func resetEditor() {
        editingEntryID = nil
        selectedRecipeID = ""
        drinkNameText = ""
        drinkEnglishNameText = ""
        selectedImages = []
        selectedPhotoItems = []
        cameraImage = nil
        noteText = ""
    }

    private func saveSelectedEntry() {
        guard canSaveEntry else { return }

        if let editingEntryID {
            drinkLogStore.updateEntry(
                date: selectedDate,
                entryID: editingEntryID,
                drinkName: drinkNameText,
                drinkEnglishName: drinkEnglishNameText,
                recipeID: selectedRecipeID,
                note: noteText,
                photos: selectedImages
            )
        } else {
            drinkLogStore.addEntry(
                date: selectedDate,
                drinkName: drinkNameText,
                drinkEnglishName: drinkEnglishNameText,
                recipeID: selectedRecipeID,
                note: noteText,
                photos: selectedImages
            )
        }

        resetEditor()
    }

    private func fillFromRecipe(_ recipe: CocktailRecipe) {
        selectedRecipeID = recipe.id
        drinkNameText = recipe.chineseName
        drinkEnglishNameText = recipe.englishName
    }

    private func appendPhotos(from items: [PhotosPickerItem]) {
        guard !items.isEmpty else { return }

        Task {
            var images: [UIImage] = []
            for item in items {
                if
                    let data = try? await item.loadTransferable(type: Data.self),
                    let image = UIImage(data: data)
                {
                    images.append(image)
                }
            }

            await MainActor.run {
                selectedImages.append(contentsOf: images)
                selectedPhotoItems = []
            }
        }
    }

    private static let monthFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_Hans_CN")
        formatter.dateFormat = "yyyy 年 M 月"
        return formatter
    }()

    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_Hans_CN")
        formatter.dateFormat = "M 月 d 日 EEEE"
        return formatter
    }()
}

private struct CalendarDayButton: View {
    let day: Date
    let isSelected: Bool
    let isToday: Bool
    let drinkCount: Int
    let action: () -> Void

    private let calendar = Calendar.current

    var body: some View {
        Button(action: action) {
            VStack(spacing: 3) {
                Text("\(calendar.component(.day, from: day))")
                    .font(.subheadline.weight(.bold))

                if drinkCount > 0 {
                    Text("\(drinkCount)")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(isSelected ? Color(hex: "#31535A") : .white)
                        .frame(minWidth: 16)
                        .frame(height: 13)
                        .background(isSelected ? Color.white : Color(hex: "#B76E54"))
                        .clipShape(Capsule())
                } else {
                    Color.clear
                        .frame(width: 16, height: 13)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .foregroundStyle(isSelected ? .white : .primary)
            .background(isSelected ? Color(hex: "#31535A") : Color.appSurface)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(isToday ? Color(hex: "#B76E54") : Color.black.opacity(0.045), lineWidth: isToday ? 1.5 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct DrinkEntryRow: View {
    let entry: DrinkLogEntry
    let images: [UIImage]
    let isEditing: Bool
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            thumbnail

            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(entry.recipeName)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(.primary)
                        .lineLimit(2)

                    Text("已记录")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color(hex: "#B76E54"))
                }

                if !entry.recipeEnglishName.isEmpty {
                    Text(entry.recipeEnglishName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                if !entry.note.isEmpty {
                    Text(entry.note)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer(minLength: 6)

            VStack(spacing: 8) {
                Button(action: onEdit) {
                    Image(systemName: isEditing ? "pencil.circle.fill" : "pencil")
                        .font(.headline)
                }
                .accessibilityLabel("编辑这杯")

                Button(role: .destructive, action: onDelete) {
                    Image(systemName: "trash")
                        .font(.headline)
                }
                .accessibilityLabel("删除这杯")
            }
        }
        .padding(12)
        .background(isEditing ? Color(hex: "#31535A").opacity(0.1) : Color(hex: "#31535A").opacity(0.055))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    @ViewBuilder
    private var thumbnail: some View {
        if let image = images.first {
            ZStack(alignment: .topTrailing) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 58, height: 58)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                if images.count > 1 {
                    Text("\(images.count)")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(minWidth: 17)
                        .frame(height: 15)
                        .background(Color(hex: "#B76E54"))
                        .clipShape(Capsule())
                        .padding(4)
                }
            }
        } else {
            Image(systemName: "wineglass.fill")
                .font(.title3.weight(.semibold))
                .foregroundStyle(Color(hex: "#31535A"))
                .frame(width: 58, height: 58)
                .background(Color(hex: "#31535A").opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
    }
}

private struct PickerSource: Identifiable {
    let id = UUID()
    let sourceType: UIImagePickerController.SourceType
}

private struct ImageCapturePicker: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    @Binding var image: UIImage?
    let sourceType: UIImagePickerController.SourceType

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = UIImagePickerController.isSourceTypeAvailable(sourceType) ? sourceType : .photoLibrary
        picker.allowsEditing = false
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) { }

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    final class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        let parent: ImageCapturePicker

        init(parent: ImageCapturePicker) {
            self.parent = parent
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            parent.image = info[.originalImage] as? UIImage
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

private extension Calendar {
    func startOfMonth(for date: Date) -> Date {
        let components = dateComponents([.year, .month], from: date)
        return self.date(from: components) ?? startOfDay(for: date)
    }
}
