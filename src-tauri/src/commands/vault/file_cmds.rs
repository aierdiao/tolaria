use crate::commands::expand_tilde;
use crate::vault::filename_rules::validate_folder_name;
use crate::vault::{self, FolderNode, VaultEntry};
use std::path::{Path, PathBuf};

use super::boundary::{
    with_boundary, with_existing_paths, with_requested_root, with_validated_path, ValidatedPathMode,
};

fn with_note_path<T>(
    path: &Path,
    vault_path: Option<&Path>,
    mode: ValidatedPathMode,
    action: impl FnOnce(&Path) -> Result<T, String>,
) -> Result<T, String> {
    let raw_path = path.to_string_lossy();
    let raw_vault_path = vault_path.map(|value| value.to_string_lossy());
    with_validated_path(
        &raw_path,
        raw_vault_path.as_deref(),
        mode,
        |validated_path| action(Path::new(validated_path)),
    )
}

fn with_external_file_path<T>(
    path: &Path,
    vault_path: Option<&Path>,
    action: impl FnOnce(&Path) -> Result<T, String>,
) -> Result<T, String> {
    with_note_path(path, vault_path, ValidatedPathMode::Existing, action)
}

fn with_expanded_vault_root<T>(
    path: &Path,
    action: impl FnOnce(&Path) -> Result<T, String>,
) -> Result<T, String> {
    let raw_path = path.to_string_lossy();
    let expanded = expand_tilde(raw_path.as_ref()).into_owned();
    action(Path::new(&expanded))
}

fn with_requested_root_path<T>(
    vault_path: &Path,
    action: impl FnOnce(&str) -> Result<T, String>,
) -> Result<T, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_requested_root(raw_vault_path.as_ref(), action)
}

fn sync_image_asset_scope(
    app_handle: &tauri::AppHandle,
    requested_root: &str,
) -> Result<(), String> {
    #[cfg(desktop)]
    crate::sync_vault_asset_scope(app_handle, Path::new(requested_root))?;
    #[cfg(not(desktop))]
    let _ = requested_root;
    #[cfg(not(desktop))]
    let _ = app_handle;
    Ok(())
}

fn with_image_asset_scope(
    app_handle: &tauri::AppHandle,
    vault_path: &Path,
    action: impl FnOnce(&str) -> Result<String, String>,
) -> Result<String, String> {
    with_requested_root_path(vault_path, |requested_root| {
        let saved_path = action(requested_root)?;
        sync_image_asset_scope(app_handle, requested_root)?;
        Ok(saved_path)
    })
}

#[tauri::command]
pub fn sync_vault_asset_scope_for_window(
    app_handle: tauri::AppHandle,
    vault_path: PathBuf,
) -> Result<(), String> {
    with_requested_root_path(vault_path.as_path(), |requested_root| {
        sync_image_asset_scope(&app_handle, requested_root)
    })
}

#[tauri::command]
pub fn open_vault_file_external(
    app_handle: tauri::AppHandle,
    path: PathBuf,
    vault_path: Option<PathBuf>,
) -> Result<(), String> {
    with_external_file_path(path.as_path(), vault_path.as_deref(), |validated_path| {
        open_path_with_default_app(&app_handle, validated_path)
    })
}

fn open_path_with_default_app(app_handle: &tauri::AppHandle, path: &Path) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    app_handle
        .opener()
        .open_path(path.to_string_lossy().into_owned(), None::<String>)
        .map_err(|error| error.to_string())
}

fn with_writable_note_path<T>(
    path: PathBuf,
    vault_path: Option<PathBuf>,
    action: impl FnOnce(&str) -> Result<T, String>,
) -> Result<T, String> {
    with_validated_path(
        path.to_string_lossy().as_ref(),
        vault_path
            .as_ref()
            .map(|value| value.to_string_lossy())
            .as_deref(),
        ValidatedPathMode::Writable,
        action,
    )
}

#[tauri::command]
pub fn get_note_content(path: PathBuf, vault_path: Option<PathBuf>) -> Result<String, String> {
    with_note_path(
        path.as_path(),
        vault_path.as_deref(),
        ValidatedPathMode::Existing,
        vault::get_note_content,
    )
}

#[tauri::command]
pub fn validate_note_content(
    path: PathBuf,
    content: String,
    vault_path: Option<PathBuf>,
) -> Result<bool, String> {
    with_note_path(
        path.as_path(),
        vault_path.as_deref(),
        ValidatedPathMode::Existing,
        |validated_path| vault::note_content_matches(validated_path, &content),
    )
}

#[tauri::command]
pub async fn save_note_content(
    path: PathBuf,
    content: String,
    vault_path: Option<PathBuf>,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        with_writable_note_path(path, vault_path, |validated_path| {
            vault::save_note_content(validated_path, &content)
        })
    })
    .await
    .map_err(|e| format!("Task panicked: {e}"))?
}

#[tauri::command]
pub fn create_note_content(
    path: PathBuf,
    content: String,
    vault_path: Option<PathBuf>,
) -> Result<(), String> {
    with_writable_note_path(path, vault_path, |validated_path| {
        vault::create_note_content(validated_path, &content)
    })
}

#[tauri::command]
pub fn delete_note(path: PathBuf) -> Result<String, String> {
    with_validated_path(
        path.to_string_lossy().as_ref(),
        None,
        ValidatedPathMode::Existing,
        vault::delete_note,
    )
}

#[tauri::command]
pub fn batch_delete_notes(paths: Vec<PathBuf>) -> Result<Vec<String>, String> {
    let raw_paths = paths
        .iter()
        .map(|path| path.to_string_lossy().into_owned())
        .collect::<Vec<_>>();
    with_existing_paths(&raw_paths, None, |validated_paths| {
        vault::batch_delete_notes(&validated_paths)
    })
}

#[tauri::command]
pub fn create_vault_folder(
    vault_path: PathBuf,
    folder_name: PathBuf,
    parent_path: Option<PathBuf>,
) -> Result<String, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        let folder_name = folder_name.to_string_lossy();
        let relative_path = match parent_path.as_deref() {
            Some(parent) if !parent.as_os_str().is_empty() => parent.join(folder_name.as_ref()),
            _ => PathBuf::from(folder_name.as_ref()),
        };
        let folder_path = boundary.child_path(&relative_path.to_string_lossy())?;
        validate_folder_name(folder_name.as_ref())?;
        ensure_missing_folder(&folder_path, folder_name.as_ref())?;
        std::fs::create_dir_all(&folder_path)
            .map_err(|e| format!("Failed to create folder: {}", e))?;
        Ok(folder_name.into_owned())
    })
}

fn ensure_missing_folder(folder_path: &Path, folder_name: &str) -> Result<(), String> {
    if folder_path.exists() {
        return Err(format!("Folder '{}' already exists", folder_name));
    }
    Ok(())
}

fn scan_visible_vault_entries(vault_path: &Path) -> Result<Vec<VaultEntry>, String> {
    let entries = vault::scan_vault_cached(vault_path)?;
    Ok(vault::filter_gitignored_entries(
        vault_path,
        entries,
        crate::settings::hide_gitignored_files_enabled(),
    ))
}

fn scan_visible_vault_folders(vault_path: &Path) -> Result<Vec<FolderNode>, String> {
    let folders = vault::scan_vault_folders(vault_path)?;
    Ok(vault::filter_gitignored_folders(
        vault_path,
        folders,
        crate::settings::hide_gitignored_files_enabled(),
    ))
}

/// Sync the `title` frontmatter field with the filename on note open.
/// Returns `true` if the file was modified (title was absent or desynced).
#[tauri::command]
pub fn sync_note_title(path: PathBuf, vault_path: Option<PathBuf>) -> Result<bool, String> {
    use vault::SyncAction;

    with_note_path(
        path.as_path(),
        vault_path.as_deref(),
        ValidatedPathMode::Existing,
        |validated_path| {
            let action = vault::sync_title_on_open(validated_path)?;
            Ok(matches!(action, SyncAction::Updated { .. }))
        },
    )
}

/// Compute the assets directory for a validated note path, or `None` for the
/// default vault `attachments/` location.
fn assets_dir_for_note(
    location: crate::settings::AttachmentLocation,
    validated_note_path: &Path,
) -> Option<PathBuf> {
    use crate::settings::AttachmentLocation;

    let note_dir = validated_note_path.parent()?;
    match location {
        AttachmentLocation::VaultAttachments => None,
        AttachmentLocation::NoteAssets => Some(note_dir.join("assets")),
        AttachmentLocation::PerNoteAssets => {
            let stem = validated_note_path.file_stem()?.to_string_lossy();
            Some(note_dir.join(format!("{}.assets", stem)))
        }
    }
}

/// Resolve the directory new attachments should be saved into, or `None` for
/// the default vault `attachments/` folder.
///
/// Only consulted when the attachment location setting targets the note. The
/// note path is treated as a hint: it must validate as a writable path inside
/// the vault, otherwise we fall back to the default vault `attachments/`
/// folder (returning `None`) so the paste never fails. Writable validation lets
/// brand-new untitled notes save into their paired assets folder before the
/// markdown file has been flushed to disk.
fn attachment_override_dir(
    location: crate::settings::AttachmentLocation,
    requested_root: &str,
    note_path: Option<&Path>,
) -> Option<PathBuf> {
    if location == crate::settings::AttachmentLocation::VaultAttachments {
        return None;
    }
    let Some(note_path) = note_path else {
        log::debug!(
            "Attachment location targets the note but no note path was provided; saving to vault attachments"
        );
        return None;
    };

    let assets_dir = with_note_path(
        note_path,
        Some(Path::new(requested_root)),
        ValidatedPathMode::Writable,
        |validated_path| Ok(assets_dir_for_note(location, validated_path)),
    );
    match assets_dir {
        Ok(Some(dir)) => Some(dir),
        Ok(None) => {
            log::debug!(
                "Note path {} has no usable parent directory or file stem; saving to vault attachments",
                note_path.display()
            );
            None
        }
        Err(error) => {
            log::debug!(
                "Note path {} failed vault validation ({}); saving to vault attachments",
                note_path.display(),
                error
            );
            None
        }
    }
}

#[tauri::command]
pub fn save_image(
    app_handle: tauri::AppHandle,
    vault_path: PathBuf,
    filename: String,
    data: String,
    note_path: Option<PathBuf>,
) -> Result<String, String> {
    with_image_asset_scope(&app_handle, vault_path.as_path(), |requested_root| {
        let assets_dir = attachment_override_dir(
            crate::settings::attachment_location(),
            requested_root,
            note_path.as_deref(),
        );
        vault::save_image(requested_root, &filename, &data, assets_dir.as_deref())
    })
}

#[tauri::command]
pub fn copy_image_to_vault(
    app_handle: tauri::AppHandle,
    vault_path: PathBuf,
    source_path: PathBuf,
    note_path: Option<PathBuf>,
) -> Result<String, String> {
    with_image_asset_scope(&app_handle, vault_path.as_path(), |requested_root| {
        let assets_dir = attachment_override_dir(
            crate::settings::attachment_location(),
            requested_root,
            note_path.as_deref(),
        );
        vault::copy_image_to_vault(
            requested_root,
            source_path.to_string_lossy().as_ref(),
            assets_dir.as_deref(),
        )
    })
}

#[tauri::command]
pub async fn list_vault(path: PathBuf) -> Result<Vec<VaultEntry>, String> {
    tokio::task::spawn_blocking(move || {
        with_expanded_vault_root(path.as_path(), scan_visible_vault_entries)
    })
    .await
    .map_err(|e| format!("Task panicked: {e}"))?
}

#[tauri::command]
pub async fn list_vault_folders(path: PathBuf) -> Result<Vec<FolderNode>, String> {
    tokio::task::spawn_blocking(move || {
        with_expanded_vault_root(path.as_path(), scan_visible_vault_folders)
    })
    .await
    .map_err(|e| format!("Task panicked: {e}"))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn vault_root(dir: &TempDir) -> PathBuf {
        dir.path().to_path_buf()
    }

    fn note_path(dir: &TempDir, name: &str) -> PathBuf {
        dir.path().join(name)
    }

    #[test]
    fn attachment_override_dir_returns_none_for_default_location() {
        let dir = TempDir::new().unwrap();
        let note = note_path(&dir, "note.md");
        fs::write(&note, "# Note\n").unwrap();

        let result = attachment_override_dir(
            crate::settings::AttachmentLocation::VaultAttachments,
            dir.path().to_str().unwrap(),
            Some(note.as_path()),
        );
        assert!(result.is_none());
    }

    #[test]
    fn attachment_override_dir_returns_none_without_note_path() {
        let dir = TempDir::new().unwrap();

        let result = attachment_override_dir(
            crate::settings::AttachmentLocation::NoteAssets,
            dir.path().to_str().unwrap(),
            None,
        );
        assert!(result.is_none());
    }

    #[test]
    fn attachment_override_dir_returns_shared_assets_dir_for_valid_note() {
        let dir = TempDir::new().unwrap();
        let nested = dir.path().join("posts").join("japan");
        fs::create_dir_all(&nested).unwrap();
        let note = nested.join("真是漫长的一年啊.md");
        fs::write(&note, "# Note\n").unwrap();

        let result = attachment_override_dir(
            crate::settings::AttachmentLocation::NoteAssets,
            dir.path().to_str().unwrap(),
            Some(note.as_path()),
        );
        assert_eq!(result, Some(nested.join("assets")));
    }

    #[test]
    fn attachment_override_dir_returns_per_note_assets_dir_for_valid_note() {
        let dir = TempDir::new().unwrap();
        let nested = dir.path().join("sakuhinn");
        fs::create_dir_all(&nested).unwrap();
        let note = nested.join("真是漫长的一年啊.md");
        fs::write(&note, "# Note\n").unwrap();

        let result = attachment_override_dir(
            crate::settings::AttachmentLocation::PerNoteAssets,
            dir.path().to_str().unwrap(),
            Some(note.as_path()),
        );
        assert_eq!(result, Some(nested.join("真是漫长的一年啊.assets")));
    }

    #[test]
    fn attachment_override_dir_uses_per_note_assets_for_missing_but_writable_note_file() {
        let dir = TempDir::new().unwrap();
        let unsaved_note = note_path(&dir, "untitled-note-1783095975.md");

        let result = attachment_override_dir(
            crate::settings::AttachmentLocation::PerNoteAssets,
            dir.path().to_str().unwrap(),
            Some(unsaved_note.as_path()),
        );
        assert_eq!(
            result,
            Some(dir.path().join("untitled-note-1783095975.assets"))
        );
    }

    #[test]
    fn attachment_override_dir_falls_back_for_note_outside_vault() {
        let vault_dir = TempDir::new().unwrap();
        let outside_dir = TempDir::new().unwrap();
        let outside_note = outside_dir.path().join("outside.md");
        fs::write(&outside_note, "# Outside\n").unwrap();

        let result = attachment_override_dir(
            crate::settings::AttachmentLocation::NoteAssets,
            vault_dir.path().to_str().unwrap(),
            Some(outside_note.as_path()),
        );
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn note_content_commands_roundtrip_with_requested_vault() {
        let dir = TempDir::new().unwrap();
        let root = vault_root(&dir);
        let note = note_path(&dir, "notes/command-note.md");

        create_note_content(
            note.clone(),
            "# Command Note\n".to_string(),
            Some(root.clone()),
        )
        .unwrap();
        assert_eq!(
            get_note_content(note.clone(), Some(root.clone())).unwrap(),
            "# Command Note\n"
        );

        save_note_content(
            note.clone(),
            "---\ntitle: Command Note\n---\n# Command Note\nBody\n".to_string(),
            Some(root.clone()),
        )
        .await
        .unwrap();
        assert!(!sync_note_title(note.clone(), Some(root.clone())).unwrap());

        save_note_content(
            note.clone(),
            "# Updated Command Note\n".to_string(),
            Some(root.clone()),
        )
        .await
        .unwrap();
        assert!(sync_note_title(note.clone(), Some(root.clone())).unwrap());
        assert!(get_note_content(note, Some(root))
            .unwrap()
            .contains("title: Command Note"));
    }

    #[tokio::test]
    async fn note_content_commands_accept_windows_sensitive_valid_segments() {
        let dir = TempDir::new().unwrap();
        let root = vault_root(&dir);
        let note = root
            .join("@raflymln")
            .join("notes with spaces")
            .join("résumé note.md");

        save_note_content(
            note.clone(),
            "# Windows-Sensitive Path\n\nBody\n".to_string(),
            Some(root.clone()),
        )
        .await
        .unwrap();

        assert_eq!(
            get_note_content(note, Some(root)).unwrap(),
            "# Windows-Sensitive Path\n\nBody\n"
        );
    }

    #[tokio::test]
    async fn folder_and_listing_commands_use_expanded_vault_root() {
        let dir = TempDir::new().unwrap();
        let root = vault_root(&dir);
        fs::write(dir.path().join("root.md"), "# Root\n").unwrap();

        assert_eq!(
            create_vault_folder(root.clone(), PathBuf::from("Projects"), None).unwrap(),
            "Projects"
        );
        fs::write(dir.path().join("Projects/project.md"), "# Project\n").unwrap();

        let entries = list_vault(root.clone()).await.unwrap();
        assert!(entries.iter().any(|entry| entry.filename == "root.md"));
        assert!(entries.iter().any(|entry| entry.filename == "project.md"));

        let folders = list_vault_folders(root).await.unwrap();
        assert!(folders.iter().any(|folder| folder.name == "Projects"));
    }

    #[test]
    fn commands_reject_paths_outside_requested_vault() {
        let vault = TempDir::new().unwrap();
        let outside = TempDir::new().unwrap();
        let outside_note = outside.path().join("outside.md");
        fs::write(&outside_note, "# Outside\n").unwrap();

        let error = get_note_content(outside_note, Some(vault.path().to_path_buf())).unwrap_err();
        assert!(error.contains("Path must stay inside the active vault"));

        let folder_error =
            create_vault_folder(vault.path().to_path_buf(), PathBuf::from("../escape"), None)
                .unwrap_err();
        assert!(folder_error.contains("Path must stay inside the active vault"));
    }

    #[test]
    fn external_file_paths_accept_files_inside_requested_vault() {
        let dir = TempDir::new().unwrap();
        let root = vault_root(&dir);
        let attachment = note_path(&dir, "attachments/photo.png");
        fs::create_dir_all(attachment.parent().unwrap()).unwrap();
        fs::write(&attachment, "image-bytes").unwrap();

        let validated = with_external_file_path(
            attachment.as_path(),
            Some(root.as_path()),
            |validated_path| Ok(validated_path.to_path_buf()),
        )
        .unwrap();

        assert_eq!(validated, attachment);
    }

    #[test]
    fn external_file_paths_reject_files_outside_requested_vault() {
        let vault = TempDir::new().unwrap();
        let outside = TempDir::new().unwrap();
        let outside_file = outside.path().join("photo.png");
        fs::write(&outside_file, "image-bytes").unwrap();

        let error = with_external_file_path(
            outside_file.as_path(),
            Some(vault.path()),
            |validated_path| Ok(validated_path.to_path_buf()),
        )
        .unwrap_err();

        assert!(error.contains("Path must stay inside the active vault"));
    }

    #[test]
    fn validate_note_content_compares_against_disk() {
        let dir = TempDir::new().unwrap();
        let root = vault_root(&dir);
        let note = note_path(&dir, "note.md");
        fs::write(&note, "# Fresh\n").unwrap();

        assert!(
            validate_note_content(note.clone(), "# Fresh\n".to_string(), Some(root.clone()),)
                .unwrap()
        );
        assert!(!validate_note_content(note, "# Stale\n".to_string(), Some(root)).unwrap());
    }
}
