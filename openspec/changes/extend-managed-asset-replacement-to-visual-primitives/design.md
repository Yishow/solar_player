## Context

Media bindings already know about `managed-asset`, but icon and ornament sources have parallel models. `DisplayPageIconSource` currently supports `asset-image` with direct `src`, `reference-glyph`, and `page-icon-key`. Shell ornaments support `ornament-image` with an ornament key. These are useful fallbacks but not enough for a gallery-driven editor.

## Goals

- Allow managed asset replacement for existing page visuals, not only newly added freeform objects.
- Keep current glyph/registry/ornament primitives as fallback choices.
- Ensure all new managed references participate in asset health and delete guard reporting.

## Non-Goals

- Do not remove built-in SVG glyphs or existing direct-src support.
- Do not make every CSS-only color or line token into an image asset.
- Do not merge this with asset library route integration or seed bootstrap.

## Decisions

### Managed Visual Source Mode

Icon and ornament source schemas SHALL support a managed asset source mode with `assetId` and optional `fallbackSrc`. Existing direct `src`, reference glyph, page icon key, and ornament key modes remain valid fallback modes.

### Replacement Coverage

The editor SHALL expose managed asset replacement controls for:

- hero/background media bindings
- Images main stage fallback
- Solar flow and KPI card icons
- Overview KPI/reference icons
- Factory node, load row, and KPI card icons
- Images placeholder/info/thumb icons
- Sustainability KPI/stat card icons
- page chrome leaf ornaments where rendered as replaceable visual assets
- shared shell ornament-image objects where currently limited to built-in ornament keys

### Runtime Resolution

Runtime rendering SHALL prefer the selected managed asset when it resolves, then fall back to the configured seed source or built-in glyph. Broken managed references SHALL be reported through asset health instead of silently disappearing.

### Asset Governance

Asset reference collection SHALL include managed icon and ornament references so delete guards and usage panels show these dependencies.

## Verification

- Web tests cover managed asset replacement controls for representative card icon and ornament surfaces.
- Runtime tests cover managed icon rendering with fallback to seed glyph/source.
- Server tests cover asset health and delete guard reporting for managed icon and ornament references.
