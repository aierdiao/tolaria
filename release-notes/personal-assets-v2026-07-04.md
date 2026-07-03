# Tolaria Personal Assets v2026.7.4.1

This is a personal fork build focused on Markdown writing workflows with flat note folders and per-note image assets.

## Highlights

- Added configurable image attachment locations:
  - Vault `attachments/` folder, preserving the original default behavior.
  - Shared `assets/` folder next to the current note.
  - Per-note `{filename}.assets/` folder for flat Markdown article folders.
- Added safe migration for paired `.assets` folders when notes are renamed or moved inside Tolaria.
  - `old.md` + `old.assets/` becomes `new.md` + `new.assets/`.
  - Standard Markdown image references in the renamed note are updated after the folder move succeeds.
  - Existing target folders are never overwritten or merged.
- Hid per-note `*.assets` folders from the sidebar folder tree.
  - This is display-only. Files remain on disk, in Git, and available to image previews.
- Improved new-note behavior for per-note assets.
  - New untitled notes now use their temporary note filename for the initial `.assets` folder instead of falling back to vault `attachments/`.
  - When Tolaria later renames the note from its H1/title, the paired `.assets` folder follows through the existing rename migration.
- Added localized settings text across all locale catalogs, with polished English, Simplified Chinese, and Japanese copy.

## Validation

- TypeScript production build passed.
- Vite production build passed.
- Tauri release build produced the Windows application executable.
- NSIS installer was produced successfully:
  - `Tolaria_0.1.0_x64-setup.exe`
  - SHA256: `0ACAC8770D0D6D19AC639614B01588EC301862DA9C7F2FC929DE86B9ED675B93`

## Known Notes

- This build is unsigned and does not include Tauri updater signatures.
- The MSI bundling path failed in WiX packaging; the NSIS installer is the release artifact for this build.
- External file-manager or Git renames are not synchronized. The paired `.assets` migration only runs for note rename or move actions performed inside Tolaria.
- Full upstream Windows test cleanup is intentionally out of scope for this personal fork release.
