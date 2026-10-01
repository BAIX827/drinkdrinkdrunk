import Combine
import Foundation
import UIKit

struct DrinkLog: Identifiable, Codable, Hashable {
    let id: String
    let date: Date
    var entries: [DrinkLogEntry]

    init(id: String, date: Date, entries: [DrinkLogEntry]) {
        self.id = id
        self.date = date
        self.entries = entries
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case date
        case entries
        case recipeID
        case recipeName
        case recipeEnglishName
        case note
        case photoFilename
        case photoFilenames
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        date = try container.decode(Date.self, forKey: .date)

        if let decodedEntries = try? container.decode([DrinkLogEntry].self, forKey: .entries) {
            entries = decodedEntries
            return
        }

        let entry = DrinkLogEntry(
            id: UUID().uuidString,
            recipeID: (try? container.decode(String.self, forKey: .recipeID)) ?? "",
            recipeName: (try? container.decode(String.self, forKey: .recipeName)) ?? "未命名鸡尾酒",
            recipeEnglishName: (try? container.decode(String.self, forKey: .recipeEnglishName)) ?? "",
            note: (try? container.decode(String.self, forKey: .note)) ?? "",
            photoFilenames: (try? container.decode([String].self, forKey: .photoFilenames))
                ?? (try? container.decode(String.self, forKey: .photoFilename)).map { [$0] }
                ?? []
        )
        entries = [entry]
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(date, forKey: .date)
        try container.encode(entries, forKey: .entries)
    }
}

struct DrinkLogEntry: Identifiable, Codable, Hashable {
    let id: String
    let recipeID: String
    let recipeName: String
    let recipeEnglishName: String
    let note: String
    let photoFilenames: [String]

    var photoFilename: String? {
        photoFilenames.first
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case recipeID
        case recipeName
        case recipeEnglishName
        case note
        case photoFilename
        case photoFilenames
    }

    init(
        id: String,
        recipeID: String,
        recipeName: String,
        recipeEnglishName: String,
        note: String,
        photoFilenames: [String]
    ) {
        self.id = id
        self.recipeID = recipeID
        self.recipeName = recipeName
        self.recipeEnglishName = recipeEnglishName
        self.note = note
        self.photoFilenames = photoFilenames
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        recipeID = (try? container.decode(String.self, forKey: .recipeID)) ?? ""
        recipeName = (try? container.decode(String.self, forKey: .recipeName)) ?? "未命名鸡尾酒"
        recipeEnglishName = (try? container.decode(String.self, forKey: .recipeEnglishName)) ?? ""
        note = (try? container.decode(String.self, forKey: .note)) ?? ""

        if let filenames = try? container.decode([String].self, forKey: .photoFilenames) {
            photoFilenames = filenames
        } else if let filename = try? container.decode(String.self, forKey: .photoFilename) {
            photoFilenames = [filename]
        } else {
            photoFilenames = []
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(recipeID, forKey: .recipeID)
        try container.encode(recipeName, forKey: .recipeName)
        try container.encode(recipeEnglishName, forKey: .recipeEnglishName)
        try container.encode(note, forKey: .note)
        try container.encode(photoFilenames, forKey: .photoFilenames)
        try container.encodeIfPresent(photoFilename, forKey: .photoFilename)
    }
}

final class DrinkLogStore: ObservableObject {
    @Published private(set) var logs: [DrinkLog] = [] {
        didSet { if hasLoaded { save() } }
    }

    // Loading legacy data must not rewrite or clear the source archive.
    private var hasLoaded = false
    private let storageKey = "dailyDrinkLogs"
    private let calendar = Calendar.current

    init() {
        defer { hasLoaded = true }
        guard
            let data = UserDefaults.standard.data(forKey: storageKey),
            let decodedLogs = try? JSONDecoder().decode([DrinkLog].self, from: data)
        else {
            logs = []
            return
        }

        logs = decodedLogs
    }

    func log(for date: Date) -> DrinkLog? {
        logs.first { calendar.isDate($0.date, inSameDayAs: date) }
    }

    func entries(for date: Date) -> [DrinkLogEntry] {
        log(for: date)?.entries ?? []
    }

    func hasLog(on date: Date) -> Bool {
        !entries(for: date).isEmpty
    }

    func drinkCount(on date: Date) -> Int {
        entries(for: date).count
    }

    func recentEntries(limit: Int) -> [(date: Date, entry: DrinkLogEntry)] {
        logs
            .flatMap { log in
                log.entries.map { (date: log.date, entry: $0) }
            }
            .sorted { lhs, rhs in
                if calendar.isDate(lhs.date, inSameDayAs: rhs.date) {
                    return lhs.entry.recipeName < rhs.entry.recipeName
                }
                return lhs.date > rhs.date
            }
            .prefix(limit)
            .map { $0 }
    }

    func addEntry(
        date: Date,
        drinkName: String,
        drinkEnglishName: String,
        recipeID: String,
        note: String,
        photos: [UIImage]
    ) {
        let day = calendar.startOfDay(for: date)
        var log = log(for: day) ?? DrinkLog(id: UUID().uuidString, date: day, entries: [])
        let normalizedName = normalizedDrinkName(drinkName)
        guard !normalizedName.isEmpty else { return }
        guard !log.entries.contains(where: { normalizedDrinkName($0.recipeName) == normalizedName }) else { return }

        let entry = makeEntry(
            id: UUID().uuidString,
            drinkName: drinkName,
            drinkEnglishName: drinkEnglishName,
            recipeID: recipeID,
            note: note,
            photoFilenames: savePhotos(photos, replacing: [])
        )

        log.entries.append(entry)
        upsert(log)
    }

    func updateEntry(
        date: Date,
        entryID: String,
        drinkName: String,
        drinkEnglishName: String,
        recipeID: String,
        note: String,
        photos: [UIImage]
    ) {
        let day = calendar.startOfDay(for: date)
        guard var log = log(for: day), let index = log.entries.firstIndex(where: { $0.id == entryID }) else { return }
        let normalizedName = normalizedDrinkName(drinkName)
        guard !normalizedName.isEmpty else { return }
        guard !log.entries.contains(where: { $0.id != entryID && normalizedDrinkName($0.recipeName) == normalizedName }) else { return }

        let oldEntry = log.entries[index]
        let photoFilenames = savePhotos(photos, replacing: oldEntry.photoFilenames)
        log.entries[index] = makeEntry(
            id: entryID,
            drinkName: drinkName,
            drinkEnglishName: drinkEnglishName,
            recipeID: recipeID,
            note: note,
            photoFilenames: photoFilenames
        )
        upsert(log)
    }

    func deleteEntry(_ entry: DrinkLogEntry, for date: Date) {
        let day = calendar.startOfDay(for: date)
        guard var log = log(for: day) else { return }

        for filename in entry.photoFilenames {
            try? FileManager.default.removeItem(at: photosDirectory.appendingPathComponent(filename))
        }

        log.entries.removeAll { $0.id == entry.id }
        if log.entries.isEmpty {
            logs.removeAll { $0.id == log.id }
        } else {
            upsert(log)
        }
    }

    func deleteLog(for date: Date) {
        guard let existingLog = log(for: date) else { return }
        for entry in existingLog.entries {
            for filename in entry.photoFilenames {
                try? FileManager.default.removeItem(at: photosDirectory.appendingPathComponent(filename))
            }
        }
        logs.removeAll { $0.id == existingLog.id }
    }

    func image(for entry: DrinkLogEntry) -> UIImage? {
        images(for: entry).first
    }

    func images(for entry: DrinkLogEntry) -> [UIImage] {
        entry.photoFilenames.compactMap { filename in
            let url = photosDirectory.appendingPathComponent(filename)
            return UIImage(contentsOfFile: url.path)
        }
    }

    private func upsert(_ log: DrinkLog) {
        logs.removeAll { calendar.isDate($0.date, inSameDayAs: log.date) }
        logs.append(log)
        logs.sort { $0.date > $1.date }
    }

    private func makeEntry(
        id: String,
        drinkName: String,
        drinkEnglishName: String,
        recipeID: String,
        note: String,
        photoFilenames: [String]
    ) -> DrinkLogEntry {
        DrinkLogEntry(
            id: id,
            recipeID: recipeID,
            recipeName: drinkName.trimmingCharacters(in: .whitespacesAndNewlines),
            recipeEnglishName: drinkEnglishName.trimmingCharacters(in: .whitespacesAndNewlines),
            note: note.trimmingCharacters(in: .whitespacesAndNewlines),
            photoFilenames: photoFilenames
        )
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(logs) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }

    private func savePhotos(_ images: [UIImage], replacing filenames: [String]) -> [String] {
        try? FileManager.default.createDirectory(at: photosDirectory, withIntermediateDirectories: true)

        guard !images.isEmpty else {
            for filename in filenames {
                try? FileManager.default.removeItem(at: photosDirectory.appendingPathComponent(filename))
            }
            return []
        }

        var savedFilenames: [String] = []
        for (index, image) in images.enumerated() {
            guard let data = image.jpegData(compressionQuality: 0.86) else { continue }
            let photoName = filenames.indices.contains(index) ? filenames[index] : "drink-\(UUID().uuidString).jpg"
            let url = photosDirectory.appendingPathComponent(photoName)

            do {
                try data.write(to: url, options: [.atomic])
                savedFilenames.append(photoName)
            } catch {
                continue
            }
        }

        for filename in filenames where !savedFilenames.contains(filename) {
            try? FileManager.default.removeItem(at: photosDirectory.appendingPathComponent(filename))
        }

        return savedFilenames
    }

    private func normalizedDrinkName(_ name: String) -> String {
        name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private var photosDirectory: URL {
        FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("DrinkPhotos", isDirectory: true)
    }
}
