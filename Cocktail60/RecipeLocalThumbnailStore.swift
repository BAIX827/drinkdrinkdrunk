import Foundation
import UIKit

enum RecipeLocalThumbnailStore {
    static func image(for recipeID: String) -> UIImage? {
        UIImage(contentsOfFile: imageURL(for: recipeID).path)
    }

    static func save(_ image: UIImage, for recipeID: String) {
        guard let data = image.jpegData(compressionQuality: 0.84) else { return }
        try? FileManager.default.createDirectory(at: thumbnailsDirectory, withIntermediateDirectories: true)
        try? data.write(to: imageURL(for: recipeID), options: [.atomic])
    }

    static func delete(for recipeID: String) {
        try? FileManager.default.removeItem(at: imageURL(for: recipeID))
    }

    private static func imageURL(for recipeID: String) -> URL {
        thumbnailsDirectory.appendingPathComponent("\(recipeID).jpg")
    }

    private static var thumbnailsDirectory: URL {
        FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("RecipeThumbnails", isDirectory: true)
    }
}
