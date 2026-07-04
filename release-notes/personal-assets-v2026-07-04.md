# Tolaria Personal Assets v2026.7.4.5

First of all, thank you to the Tolaria team and contributors for building such a great open-source app.

I use Tolaria not only as a knowledge base, but also as my main writing environment. I write articles in it, organize source material, keep long-term archives of my work, and back everything up with Git.

Since I am not sure whether this workflow is useful to other people, I implemented it first in a personal fork.

This release is the current baseline for that fork.

## What this fork adds

### 1. Optional per-article asset folders for writing workflows

In the original Tolaria workflow, pasted or dropped images are saved into a shared attachments folder. This is simple and works well for many knowledge-base use cases.

For long-form writing, however, especially when a vault contains many articles and many images over time, keeping every image in one shared folder can make it harder to organize, locate, review, and clean up assets.

This fork adds a new attachment-location option in Settings: **"Per-note asset folder"**.

When **"Per-note asset folder"** is enabled, an article can have its own paired asset folder, for example:

```text
my-article.md
my-article.assets/
  image-1.png
  image-2.png
```

This keeps an article and its images close together, which works better for:

- long-term blog archives
- portfolio writing
- article backups across platforms
- future migration to a static site or GitHub repository
- manually checking which images belong to a specific article

When a note is renamed or moved inside Tolaria, its paired `.assets` folder is moved along with it where possible, so the relationship between the article and its assets stays stable.

### 2. Per-article unused image checks

In the original workflow, images are saved into the attachments folder, but over time it can become difficult to tell which images are still used by an article and which ones were only temporary writing materials.

This fork adds a per-article image reference check.

For the current article, Tolaria can now check its paired asset folder and tell whether:

- images are referenced by the article
- images are not used by the current article
- the current check result is still valid

If unused images are found, the UI shows a warning state and lets me jump to the paired asset folder to review them.

The goal is not to automatically delete files for the user. Instead, the goal is to make cleanup clearer and safer: check first, then let the user decide what to delete.

## Implementation notes

### Attachment-location setting

The new attachment-location behavior is implemented as a normal Tolaria setting rather than a forced default.

Key files:

- `src-tauri/src/settings.rs`
- `src/components/VaultContentSettingsSection.tsx`
- `src/components/SettingsPanel.tsx`
- `src/components/settingsPreferenceTracking.ts`
- `src/lib/locales/*.json`

Implementation outline:

- Adds an attachment-location setting with the original vault `attachments/` behavior preserved.
- Adds the **"Per-note asset folder"** option for the article-centered workflow.
- Keeps UI copy localized across the existing locale catalogs.
- Tracks the setting change as a safe preference event without note content or file paths.

### Image saving and path generation

The image save pipeline now knows which note is receiving the image, so it can choose the correct destination folder.

Key files:

- `src-tauri/src/commands/vault/file_cmds.rs`
- `src-tauri/src/vault/image.rs`
- `src/hooks/useImageDrop.ts`
- `src/components/Editor.tsx`
- `src/components/SingleEditorView.tsx`
- `src/mock-tauri/mock-handlers.ts`
- `src/types.ts`

Implementation outline:

- Plumbs the current note path through pasted-image and dropped-image flows.
- Computes the image destination on the Rust side, inside the vault boundary.
- Preserves existing Markdown relative-link serialization, so images saved next to a note naturally become relative references such as `./my-article.assets/image.png`.
- Keeps the original `attachments/` behavior available for users who prefer Tolaria's default workflow.

### Paired `.assets` folder migration

When a note is renamed or moved inside Tolaria, the paired asset folder is moved with it where possible.

Key files:

- `src-tauri/src/vault/note_assets.rs`
- `src-tauri/src/vault/rename.rs`
- `src-tauri/src/commands/vault/rename_cmds.rs`
- `src/utils/noteAssetsRename.ts`
- `src/utils/noteAssetsRename.test.ts`

Implementation outline:

- Treats `{note-filename}.assets/` as the paired asset folder for a note.
- Moves the paired folder after the note rename or move succeeds.
- Updates image references in the renamed note when the paired folder move succeeds.
- Never overwrites or merges an existing destination folder.
- Leaves external file-manager or Git renames out of scope; this migration runs for actions performed inside Tolaria.

### Folder tree and note list behavior

The paired asset folders remain visible in Tolaria's folder tree, but image files inside them no longer pollute the parent folder's note list.

Key files:

- `src/utils/noteListHelpers.ts`
- `src/utils/noteListHelpers.test.ts`
- `src/components/NoteList.tsx`
- `src/components/NoteItem.tsx`
- `src/components/note-list/useNoteListModel.tsx`
- `src/App.tsx`

Implementation outline:

- Keeps `.assets` folders visible so article assets can be reviewed from inside Tolaria.
- Hides files inside paired `.assets` folders when viewing the parent article folder.
- Shows those files normally when the user opens the `.assets` folder itself.
- Adds an in-app jump from a note's unused-image warning to the paired asset folder.

### Per-article image audit

The image audit checks only the current article against its paired asset folder.

Key files:

- `src/utils/perNoteAssetAudit.ts`
- `src/utils/perNoteAssetAudit.test.ts`
- `src/components/NoteList.tsx`
- `src/components/NoteItem.tsx`
- `src/hooks/noteContentCache.ts`

Implementation outline:

- Reads the current note's Markdown and compares image references with files in the paired `.assets` folder.
- Handles relative paths, normalized file separators, decoded paths, and Tauri asset URLs.
- Marks unused files with a warning state.
- Persists successful and warning audit states locally.
- Invalidates the displayed audit result when the note file changes, so stale checks do not look permanently valid.

## Existing bugs fixed in this fork

- Fixed Windows note renaming failures caused by verbatim `\\?\` vault paths mixing with `/` separators.
- Fixed manual and automatic filename rename failures by surfacing backend rename errors instead of silently swallowing them.
- Fixed broken image references after untitled notes are auto-renamed.
- Fixed image-reference checks disappearing or changing based only on Git dirty/new status.
- Fixed parent folder note lists being polluted by images stored inside paired `.assets` folders.
- Fixed ambiguous image-check UI by separating the check action, warning state, and file-type icon.

## Current status

This is a personal fork and does not represent the official Tolaria design direction.

If Tolaria later implements a similar workflow officially, and the official implementation fits this use case better, I will prefer the official version. Until then, I will maintain this fork as my stable writing and blog-archive version.

## Asset

- Windows NSIS installer: `Tolaria_0.1.0_x64-setup.exe`
- SHA256: `1840616D9078A2A544B12D8EFE6B8CD54578BA377CC81BA88F43C527D8A6E4A9`
