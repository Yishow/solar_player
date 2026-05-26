## Context

`image_assets` is server-owned and file-backed under uploads. Current display visual defaults are frontend-bundled assets imported from reference docs or static direct paths. A usable asset library needs a server-visible catalog row and a resolvable file for each current seed visual asset.

## Goals

- Make current display visuals visible in Asset Library without requiring manual upload.
- Keep bootstrap idempotent and safe across repeated seed/startup runs.
- Provide stable metadata so editor pickers can filter backgrounds, icons, objects, and shell/page scope.

## Non-Goals

- Do not remove frontend seed fallbacks in this change.
- Do not rewrite display page config schemas in this change.
- Do not add a new external storage provider.

## Decisions

### Seed Asset Manifest

The system SHALL define a server-readable seed asset manifest. Each entry includes a stable key, source file, target filename, category, usage scope, title, and optional description. The manifest covers current display visuals used by the five playback pages and shared display ornament vocabulary.

### Idempotent Bootstrap

Bootstrap SHALL upsert catalog rows by stable seed key or deterministic filename. If the file already exists and the catalog row exists, bootstrap does not overwrite operator metadata unless the row is missing required seed metadata.

### File Ownership

Seed assets SHALL be copied into the server uploads directory or otherwise made available through the same `/uploads/images/<filename>` path used by managed assets. This keeps runtime resolution, health checks, delete guards, and thumbnails on the existing managed asset path.

### Seed Asset Labeling

Asset Library SHALL indicate that an item came from the display seed catalog. This label is informational only; it does not prevent selection or replacement.

## Verification

- Server tests confirm seed assets appear in `GET /api/images` after `seedDatabase()`.
- Server tests confirm repeated bootstrap runs do not duplicate rows or overwrite user uploads.
- Web tests confirm Asset Library displays seed asset metadata and category filters include seed assets.
