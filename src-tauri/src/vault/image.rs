use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

const ATTACHMENTS_DIR: &str = "attachments";

/// Check if a character is safe for use in filenames (alphanumeric, dot, dash, underscore).
fn is_safe_filename_char(c: char) -> bool {
    c.is_alphanumeric() || matches!(c, '.' | '-' | '_')
}

/// Sanitize a filename by replacing unsafe characters with underscores.
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if is_safe_filename_char(c) { c } else { '_' })
        .collect()
}

/// Image file extensions considered valid for drag-drop import.
const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"];

/// Resolve the directory new attachments are saved into.
///
/// When `preferred_dir` is provided (e.g. an `assets/` or `<note>.assets/`
/// folder next to the note), images go there. If that folder cannot be
/// created (e.g. a file with the same name already exists), fall back to the
/// vault-root `attachments/` folder so the paste never fails.
fn ensure_attachment_dir(vault_path: &str, preferred_dir: Option<&Path>) -> Result<PathBuf, String> {
    if let Some(preferred_dir) = preferred_dir {
        match fs::create_dir_all(preferred_dir) {
            Ok(()) => return Ok(preferred_dir.to_path_buf()),
            Err(error) => log::warn!(
                "Failed to create note assets directory {}, falling back to vault attachments: {}",
                preferred_dir.display(),
                error
            ),
        }
    }

    let attachments_dir = Path::new(vault_path).join(ATTACHMENTS_DIR);
    fs::create_dir_all(&attachments_dir)
        .map_err(|e| format!("Failed to create attachments directory: {}", e))?;
    Ok(attachments_dir)
}

/// Prepare the attachment directory and generate a unique target path.
fn prepare_attachment_path(
    vault_path: &str,
    filename: &str,
    preferred_dir: Option<&Path>,
) -> Result<PathBuf, String> {
    let target_dir = ensure_attachment_dir(vault_path, preferred_dir)?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let unique_name = format!("{}-{}", timestamp, sanitize_filename(filename));
    Ok(target_dir.join(unique_name))
}

/// Save an uploaded image to the vault's attachment directory.
/// Pass `preferred_dir` to save into an assets folder next to the current note.
/// Returns the absolute path to the saved file.
pub fn save_image(
    vault_path: &str,
    filename: &str,
    data: &str,
    preferred_dir: Option<&Path>,
) -> Result<String, String> {
    use base64::Engine;

    let target_path = prepare_attachment_path(vault_path, filename, preferred_dir)?;

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data)
        .map_err(|e| format!("Invalid base64 data: {}", e))?;

    fs::write(&target_path, bytes).map_err(|e| format!("Failed to write image: {}", e))?;

    Ok(target_path.to_string_lossy().to_string())
}

/// Copy an image file from a source path into the vault's attachment directory.
/// Used for Tauri native drag-drop which provides absolute file paths.
/// Pass `preferred_dir` to save into an assets folder next to the current note.
/// Returns the absolute path to the saved file.
pub fn copy_image_to_vault(
    vault_path: &str,
    source_path: &str,
    preferred_dir: Option<&Path>,
) -> Result<String, String> {
    let source = Path::new(source_path);
    if !source.exists() {
        return Err(format!("Source file does not exist: {}", source_path));
    }

    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if !IMAGE_EXTENSIONS.contains(&ext.as_str()) {
        return Err(format!("Not a supported image format: {}", source_path));
    }

    let filename = source
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image");
    let target_path = prepare_attachment_path(vault_path, filename, preferred_dir)?;

    fs::copy(source, &target_path).map_err(|e| format!("Failed to copy image: {}", e))?;

    Ok(target_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_sanitize_filename_safe_chars() {
        assert_eq!(sanitize_filename("photo.png"), "photo.png");
        assert_eq!(sanitize_filename("my-image_01.jpg"), "my-image_01.jpg");
    }

    #[test]
    fn test_sanitize_filename_unsafe_chars() {
        assert_eq!(sanitize_filename("my file (1).png"), "my_file__1_.png");
        assert_eq!(sanitize_filename("path/to/img.png"), "path_to_img.png");
    }

    #[test]
    fn test_save_image_creates_file() {
        use base64::Engine;

        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();
        let data = base64::engine::general_purpose::STANDARD.encode(b"fake image data");

        let result = save_image(vault_path, "test.png", &data, None);
        assert!(result.is_ok());

        let saved_path = result.unwrap();
        assert!(std::path::Path::new(&saved_path).exists());
        assert!(saved_path.contains("attachments"));
        assert!(saved_path.contains("test.png"));

        let content = fs::read(&saved_path).unwrap();
        assert_eq!(content, b"fake image data");
    }

    #[test]
    fn test_save_image_creates_attachments_dir() {
        use base64::Engine;

        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();
        let attachments = dir.path().join("attachments");
        assert!(!attachments.exists());

        let data = base64::engine::general_purpose::STANDARD.encode(b"test");
        save_image(vault_path, "img.png", &data, None).unwrap();
        assert!(attachments.exists());
    }

    #[test]
    fn test_save_image_invalid_base64() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        let result = save_image(vault_path, "test.png", "not-valid-base64!!!", None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid base64"));
    }

    #[test]
    fn test_copy_image_to_vault_success() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        // Create a source image file
        let source_path = dir.path().join("source.png");
        fs::write(&source_path, b"fake png data").unwrap();

        let result = copy_image_to_vault(vault_path, source_path.to_str().unwrap(), None);
        assert!(result.is_ok());

        let saved_path = result.unwrap();
        assert!(std::path::Path::new(&saved_path).exists());
        assert!(saved_path.contains("attachments"));
        assert!(saved_path.contains("source.png"));

        let content = fs::read(&saved_path).unwrap();
        assert_eq!(content, b"fake png data");
    }

    #[test]
    fn test_copy_image_to_vault_nonexistent_source() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        let result = copy_image_to_vault(vault_path, "/nonexistent/photo.png", None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_copy_image_to_vault_rejects_non_image() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        let source_path = dir.path().join("document.pdf");
        fs::write(&source_path, b"fake pdf").unwrap();

        let result = copy_image_to_vault(vault_path, source_path.to_str().unwrap(), None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Not a supported image"));
    }

    #[test]
    fn test_copy_image_to_vault_accepts_all_extensions() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        for ext in &["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"] {
            let source_path = dir.path().join(format!("img.{}", ext));
            fs::write(&source_path, b"data").unwrap();
            let result = copy_image_to_vault(vault_path, source_path.to_str().unwrap(), None);
            assert!(result.is_ok(), "failed for extension: {}", ext);
        }
    }

    fn encode(data: &[u8]) -> String {
        use base64::Engine;
        base64::engine::general_purpose::STANDARD.encode(data)
    }

    #[test]
    fn test_save_image_with_preferred_dir_saves_there() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();
        let note_dir = dir.path().join("posts").join("japan");
        fs::create_dir_all(&note_dir).unwrap();
        let assets_dir = note_dir.join("assets");

        let saved_path =
            save_image(vault_path, "photo.png", &encode(b"data"), Some(&assets_dir)).unwrap();

        let saved = Path::new(&saved_path);
        assert!(saved.exists());
        assert!(saved.starts_with(&assets_dir));
        assert!(!dir.path().join("attachments").exists());
    }

    #[test]
    fn test_save_image_with_preferred_dir_at_vault_root() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();
        let assets_dir = dir.path().join("assets");

        let saved_path =
            save_image(vault_path, "photo.png", &encode(b"data"), Some(&assets_dir)).unwrap();

        assert!(Path::new(&saved_path).starts_with(&assets_dir));
    }

    #[test]
    fn test_save_image_with_cjk_per_note_dir_preserves_cjk_filename() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();
        let assets_dir = dir.path().join("文章").join("真是漫长的一年啊.assets");

        let saved_path =
            save_image(vault_path, "封面图.png", &encode(b"data"), Some(&assets_dir)).unwrap();

        assert!(saved_path.contains("封面图.png"));
        assert!(saved_path.contains("真是漫长的一年啊.assets"));
        assert!(Path::new(&saved_path).exists());
    }

    #[test]
    fn test_save_image_same_filename_gets_unique_prefix() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();
        let assets_dir = dir.path().join("assets");

        let saved_path =
            save_image(vault_path, "photo.png", &encode(b"data"), Some(&assets_dir)).unwrap();

        let saved_name = Path::new(&saved_path)
            .file_name()
            .unwrap()
            .to_string_lossy()
            .to_string();
        assert_ne!(saved_name, "photo.png");
        assert!(saved_name.ends_with("-photo.png"));
    }

    #[test]
    fn test_save_image_falls_back_when_assets_dir_creation_fails() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();
        let note_dir = dir.path().join("posts");
        fs::create_dir_all(&note_dir).unwrap();
        // A file named `assets` blocks create_dir_all for the assets folder.
        fs::write(note_dir.join("assets"), b"not a directory").unwrap();

        let saved_path = save_image(
            vault_path,
            "photo.png",
            &encode(b"data"),
            Some(&note_dir.join("assets")),
        )
        .unwrap();

        let saved = Path::new(&saved_path);
        assert!(saved.exists());
        assert!(saved.starts_with(dir.path().join("attachments")));
    }

    #[test]
    fn test_copy_image_to_vault_with_preferred_dir_saves_there() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();
        let assets_dir = dir.path().join("notes").join("assets");
        let source_path = dir.path().join("source.png");
        fs::write(&source_path, b"fake png data").unwrap();

        let saved_path = copy_image_to_vault(
            vault_path,
            source_path.to_str().unwrap(),
            Some(&assets_dir),
        )
        .unwrap();

        let saved = Path::new(&saved_path);
        assert!(saved.exists());
        assert!(saved.starts_with(&assets_dir));
        assert_eq!(fs::read(saved).unwrap(), b"fake png data");
    }
}
