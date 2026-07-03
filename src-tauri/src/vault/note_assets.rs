//! Migration of paired `<note name>.assets/` attachment directories when a
//! note is renamed or moved inside the vault.
//!
//! Only the standard paired directory next to the note is handled. If the
//! target directory already exists, nothing is moved or merged: the old
//! directory and the old references stay intact and a warning is logged, so
//! the note never loses its images.

use std::fs;
use std::path::{Path, PathBuf};

const ASSETS_SUFFIX: &str = ".assets";

/// The paired assets directory for a note path, e.g. `posts/test.md` →
/// `posts/test.assets`.
fn paired_assets_dir(note_file: &Path) -> Option<PathBuf> {
    let parent = note_file.parent()?;
    let stem = note_file.file_stem()?.to_str()?;
    if stem.is_empty() {
        return None;
    }
    Some(parent.join(format!("{}{}", stem, ASSETS_SUFFIX)))
}

/// Whether two paths refer to the same existing directory (covers Windows
/// case-insensitive renames like `test.assets` → `Test.assets`).
fn is_same_existing_dir(left: &Path, right: &Path) -> bool {
    match (fs::canonicalize(left), fs::canonicalize(right)) {
        (Ok(a), Ok(b)) => a == b,
        _ => false,
    }
}

/// Move the paired `<old stem>.assets/` directory alongside a renamed or
/// moved note, and rewrite the note's own image references to the new
/// directory name. Best effort: any failure leaves the old directory and the
/// old references untouched.
pub(crate) fn migrate_note_assets(old_file: &Path, new_file: &Path) {
    let Some(old_assets) = paired_assets_dir(old_file) else {
        return;
    };
    if !old_assets.is_dir() {
        return;
    }
    let Some(new_assets) = paired_assets_dir(new_file) else {
        return;
    };
    if old_assets == new_assets {
        return;
    }

    if new_assets.exists() && !is_same_existing_dir(&old_assets, &new_assets) {
        log::warn!(
            "Not migrating note assets: target directory {} already exists; keeping {} and existing references",
            new_assets.display(),
            old_assets.display()
        );
        return;
    }

    if let Err(error) = fs::rename(&old_assets, &new_assets) {
        log::warn!(
            "Failed to migrate note assets directory {} -> {}: {}; keeping existing references",
            old_assets.display(),
            new_assets.display(),
            error
        );
        return;
    }

    rewrite_note_assets_references(new_file, old_file, &old_assets, &new_assets);
}

/// Rewrite `old.assets/` references inside the migrated note itself.
fn rewrite_note_assets_references(
    new_file: &Path,
    old_file: &Path,
    old_assets: &Path,
    new_assets: &Path,
) {
    let (Some(old_dir_name), Some(new_dir_name)) = (
        old_assets.file_name().and_then(|n| n.to_str()),
        new_assets.file_name().and_then(|n| n.to_str()),
    ) else {
        return;
    };

    let content = match fs::read_to_string(new_file) {
        Ok(content) => content,
        Err(error) => {
            log::warn!(
                "Migrated note assets for {} but could not read the note to rewrite references: {}",
                new_file.display(),
                error
            );
            return;
        }
    };

    let rewritten = rewrite_assets_dir_in_markdown(&content, old_dir_name, new_dir_name);
    if rewritten == content {
        return;
    }

    if let Err(error) = fs::write(new_file, &rewritten) {
        log::warn!(
            "Migrated note assets for {} (was {}) but failed to rewrite references: {}",
            new_file.display(),
            old_file.display(),
            error
        );
    }
}

/// Decode percent-escapes (`%20`, `%E7%9C%9F`, …) so encoded destinations can
/// be matched against the raw directory name.
fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(byte) = u8::from_str_radix(&value[i + 1..i + 3], 16) {
                out.push(byte);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8(out).unwrap_or_else(|_| value.to_string())
}

/// Replace `old_dir/` with `new_dir/` when it appears as a path segment at a
/// segment boundary inside a link destination.
fn replace_assets_segment(destination: &str, old_dir: &str, new_dir: &str) -> Option<String> {
    let decoded = percent_decode(destination);
    let needle = format!("{}/", old_dir);

    let mut result = String::with_capacity(decoded.len());
    let mut rest = decoded.as_str();
    let mut replaced = false;
    while let Some(index) = rest.find(&needle) {
        let at_boundary = index == 0
            || matches!(rest.as_bytes()[index - 1], b'/' | b'\\' | b'<' | b'(');
        result.push_str(&rest[..index]);
        if at_boundary {
            result.push_str(new_dir);
            result.push('/');
            replaced = true;
        } else {
            result.push_str(&needle);
        }
        rest = &rest[index + needle.len()..];
    }
    if !replaced {
        return None;
    }
    result.push_str(rest);
    Some(result)
}

/// Rewrite image/link destinations and wikilink targets that reference
/// `old_dir/` to point at `new_dir/`. Plain prose is never touched: only the
/// destination part of `[...](...)` / `![...](...)` and the target part of
/// `[[...]]` / `![[...]]` are considered.
fn rewrite_assets_dir_in_markdown(content: &str, old_dir: &str, new_dir: &str) -> String {
    let inline = rewrite_delimited(content, "](", ")", old_dir, new_dir);
    rewrite_delimited(&inline, "[[", "]]", old_dir, new_dir)
}

fn rewrite_delimited(
    content: &str,
    open: &str,
    close: &str,
    old_dir: &str,
    new_dir: &str,
) -> String {
    let mut result = String::with_capacity(content.len());
    let mut rest = content;
    while let Some(start) = rest.find(open) {
        let body_start = start + open.len();
        let Some(len) = rest[body_start..].find(close) else {
            break;
        };
        let body = &rest[body_start..body_start + len];
        result.push_str(&rest[..body_start]);
        match (!body.contains('\n'))
            .then(|| replace_assets_segment(body, old_dir, new_dir))
            .flatten()
        {
            Some(updated) => result.push_str(&updated),
            None => result.push_str(body),
        }
        rest = &rest[body_start + len..];
    }
    result.push_str(rest);
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn write_note(dir: &Path, name: &str, content: &str) -> PathBuf {
        let path = dir.join(name);
        fs::write(&path, content).unwrap();
        path
    }

    #[test]
    fn test_paired_assets_dir() {
        assert_eq!(
            paired_assets_dir(Path::new("posts/test.md")),
            Some(PathBuf::from("posts").join("test.assets"))
        );
        assert_eq!(
            paired_assets_dir(Path::new("真是漫长的一年啊.md")),
            Some(PathBuf::from("").join("真是漫长的一年啊.assets"))
        );
    }

    #[test]
    fn test_migrate_renames_dir_and_rewrites_references() {
        let dir = TempDir::new().unwrap();
        let assets = dir.path().join("test.assets");
        fs::create_dir_all(&assets).unwrap();
        fs::write(assets.join("image.png"), b"img").unwrap();
        let new_file = write_note(
            dir.path(),
            "tokyo.md",
            "# Tokyo\n\n![image](./test.assets/image.png)\n\n![[test.assets/other.png]]\n",
        );
        let old_file = dir.path().join("test.md");

        migrate_note_assets(&old_file, &new_file);

        assert!(!assets.exists());
        assert!(dir.path().join("tokyo.assets").join("image.png").exists());
        let content = fs::read_to_string(&new_file).unwrap();
        assert!(content.contains("![image](./tokyo.assets/image.png)"));
        assert!(content.contains("![[tokyo.assets/other.png]]"));
        assert!(!content.contains("test.assets"));
    }

    #[test]
    fn test_migrate_handles_cjk_and_percent_encoded_references() {
        let dir = TempDir::new().unwrap();
        let assets = dir.path().join("真是漫长的一年啊.assets");
        fs::create_dir_all(&assets).unwrap();
        let encoded = "%E7%9C%9F%E6%98%AF%E6%BC%AB%E9%95%BF%E7%9A%84%E4%B8%80%E5%B9%B4%E5%95%8A.assets";
        let new_file = write_note(
            dir.path(),
            "东京.md",
            &format!(
                "![a](./真是漫长的一年啊.assets/a.png)\n![b](./{}/b.png)\n",
                encoded
            ),
        );
        let old_file = dir.path().join("真是漫长的一年啊.md");

        migrate_note_assets(&old_file, &new_file);

        assert!(dir.path().join("东京.assets").exists());
        let content = fs::read_to_string(&new_file).unwrap();
        assert!(content.contains("![a](./东京.assets/a.png)"));
        assert!(content.contains("![b](./东京.assets/b.png)"));
    }

    #[test]
    fn test_migrate_skips_when_target_exists() {
        let dir = TempDir::new().unwrap();
        let old_assets = dir.path().join("test.assets");
        fs::create_dir_all(&old_assets).unwrap();
        fs::write(old_assets.join("image.png"), b"old").unwrap();
        let existing_target = dir.path().join("tokyo.assets");
        fs::create_dir_all(&existing_target).unwrap();
        fs::write(existing_target.join("keep.png"), b"keep").unwrap();
        let new_file = write_note(
            dir.path(),
            "tokyo.md",
            "![image](./test.assets/image.png)\n",
        );

        migrate_note_assets(&dir.path().join("test.md"), &new_file);

        // Nothing moved, merged, or deleted; references untouched.
        assert!(old_assets.join("image.png").exists());
        assert!(existing_target.join("keep.png").exists());
        assert!(!existing_target.join("image.png").exists());
        let content = fs::read_to_string(&new_file).unwrap();
        assert!(content.contains("./test.assets/image.png"));
    }

    #[test]
    fn test_migrate_noop_without_paired_dir() {
        let dir = TempDir::new().unwrap();
        let new_file = write_note(dir.path(), "tokyo.md", "![i](attachments/i.png)\n");

        migrate_note_assets(&dir.path().join("test.md"), &new_file);

        let content = fs::read_to_string(&new_file).unwrap();
        assert_eq!(content, "![i](attachments/i.png)\n");
        assert!(!dir.path().join("tokyo.assets").exists());
    }

    #[test]
    fn test_migrate_follows_move_to_other_folder() {
        let dir = TempDir::new().unwrap();
        let assets = dir.path().join("test.assets");
        fs::create_dir_all(&assets).unwrap();
        fs::write(assets.join("image.png"), b"img").unwrap();
        let destination = dir.path().join("areas");
        fs::create_dir_all(&destination).unwrap();
        let new_file = write_note(
            &destination,
            "test.md",
            "![image](./test.assets/image.png)\n",
        );

        migrate_note_assets(&dir.path().join("test.md"), &new_file);

        assert!(destination.join("test.assets").join("image.png").exists());
        // Same directory name, so the note-relative reference still matches.
        let content = fs::read_to_string(&new_file).unwrap();
        assert!(content.contains("./test.assets/image.png"));
    }

    #[test]
    fn test_replace_assets_segment_ignores_prose_and_other_dirs() {
        assert!(replace_assets_segment("attachments/test.assets.png", "test.assets", "t.assets").is_none());
        assert!(replace_assets_segment("nested/test.assets/i.png", "test.assets", "t.assets").is_some());
        assert!(replace_assets_segment("untest.assets/i.png", "test.assets", "t.assets").is_none());
    }

    #[test]
    fn test_rewrite_leaves_plain_text_untouched() {
        let content = "the folder test.assets/ is mentioned in prose\n![i](./test.assets/i.png)\n";
        let rewritten = rewrite_assets_dir_in_markdown(content, "test.assets", "tokyo.assets");
        assert!(rewritten.contains("the folder test.assets/ is mentioned in prose"));
        assert!(rewritten.contains("![i](./tokyo.assets/i.png)"));
    }
}
