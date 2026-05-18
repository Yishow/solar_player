## ADDED Requirements

### Requirement: Let Image Management govern playlist-facing playback metadata

The implementation SHALL let `/settings/images` read and update the playlist-facing metadata that directly affects `/images` playback instead of limiting the page to asset-library fields only.

#### Scenario: Operator edits playback-facing image settings

- **WHEN** the operator opens `/settings/images` for a selected image asset
- **THEN** the page surfaces the playlist-facing fields that affect playback behavior
- **AND** saving those fields updates the same runtime domain used by `/images`

##### Example: Duration and fallback mode are managed from the existing page

- **GIVEN** an image asset already participates in the playlist runtime
- **WHEN** the operator changes its display duration or fallback mode in `/settings/images`
- **THEN** the save path updates the corresponding playlist-facing metadata
- **AND** the page does not require a second independent management screen just to control playback behavior

### Requirement: Surface deletion blockers from playlist usage and live display references

The implementation SHALL surface blockers or explicit warnings when deleting or replacing an image asset would affect active playlist usage or live display references.

#### Scenario: Selected image is still used by playback

- **WHEN** the selected image asset is still referenced by the playlist runtime or a live display page
- **THEN** the management page surfaces that dependency before a destructive action runs
- **AND** the operator is not left to discover broken playback only after deletion

##### Example: Delete stays blocked while the asset is still in active use

- **GIVEN** a selected image is referenced by the playlist runtime and also appears in live display references
- **WHEN** the operator attempts to delete that image from `/settings/images`
- **THEN** the page shows the active dependency as a blocker or explicit warning
- **AND** the destructive action does not proceed as if the image were an unused library file
