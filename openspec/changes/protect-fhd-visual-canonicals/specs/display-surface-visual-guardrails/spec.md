## ADDED Requirements

### Requirement: Preserve playback visual canonicals from FHD witnesses

The implementation SHALL treat the playback page visual canonicals as protected contracts when a change modifies playback page visuals, shared display chrome, display card family styling, or live preview presentation. These canonicals SHALL include hero hierarchy, card-family rhythm, photo fade treatment, ornament consistency, source-like icon language, page-specific absolute composition, and distance readability.

#### Scenario: Playback visual cleanup keeps protected canonicals

- **WHEN** a change updates the visual styling of `/overview`, `/solar`, `/factory-circuit`, `/images`, or `/sustainability`
- **THEN** the change preserves the protected playback visual canonicals for the affected page
- **AND** the review notes identify which canonical attributes were intentionally preserved or intentionally changed

##### Example: Overview cleanup does not flatten the hero composition

- **GIVEN** `/overview` contains a hero region, KPI family, ornaments, and photo fade treatment in the FHD witness
- **WHEN** a developer adjusts spacing, card styling, or shared display chrome
- **THEN** the updated page keeps the hero-first visual hierarchy and distance-readable focus order
- **AND** the change does not silently replace the hero region with generic management boards or dashboard widgets

### Requirement: Treat FHD witness pairs as the canonical comparison source

The implementation SHALL use an explicit witness pair for playback visual review: the page-level reference image under `docs/reference/FHD/` and the corresponding structured prototype artifact under `docs/reference/kuozui-green-fhd-html-prototype/`. Playback visual review SHALL NOT rely only on local taste or implementation convenience.

#### Scenario: Playback visual review names the witness pair

- **WHEN** a change modifies playback visuals or shared display chrome
- **THEN** the review artifact names the corresponding FHD witness image and prototype witness document for each affected page
- **AND** any intentional deviation records why the witness was not followed exactly

##### Example: Solar page review cites both witnesses

- **GIVEN** a change updates `/solar`
- **WHEN** the author prepares the review evidence
- **THEN** the evidence references `docs/reference/FHD/02-2.Solar (大).png`
- **AND** it also references the corresponding `docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/02-solar-spec.md` or equivalent structured witness

### Requirement: Prevent management-surface drift inside playback focus regions

The implementation SHALL NOT introduce management-surface primitives, generic dashboard card language, table-first control groupings, or toolbar-style icon treatment into playback focus regions unless the change documents a page-specific exception and explains why the playback visual canonical cannot be preserved.

#### Scenario: Shared primitive reuse does not override playback composition

- **WHEN** a change reuses a shared primitive inside a playback page
- **THEN** the reused primitive does not replace the page's protected hero, KPI, media, or focus composition with management-surface presentation
- **AND** the change documents any exception where playback-specific composition cannot reuse the primitive directly

##### Example: Shared board reuse is rejected for a hero region

- **GIVEN** a shared management board already exists in the repo
- **WHEN** a developer evaluates using that board as the primary visual container for an Overview hero or Solar focus region
- **THEN** the change is treated as management-surface drift unless it documents a page-specific exception
- **AND** the default expectation remains playback-specific composition rather than dashboard-style reuse
