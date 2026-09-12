## ADDED Requirements

### Requirement: Asset selection rerenders only cards with changed observable props

AssetLibrary SHALL preserve stable card callbacks and unchanged asset object references during selection-only updates so that memoized cards with identical observable props do not rerender. Callback handling SHALL use the current asset and reference state. Existing rendered output, lazy thumbnails, filtering, batch limits, deletion guards, and asset return behavior SHALL remain unchanged.

#### Scenario: Single selection updates only old and new cards

- **WHEN** a mounted library of 1000 assets changes single selection from A to B with all other card props unchanged
- **THEN** at most the A and B cards SHALL rerender
- **AND** the final DOM, classes, styles, text, category counts, and selected asset SHALL match the baseline

#### Scenario: One batch checkbox updates one card

- **WHEN** an operator toggles one asset's batch selection with batch mode, assets, and other card props unchanged
- **THEN** only that card SHALL rerender
- **AND** the batch count and delete eligibility SHALL follow the existing rules

#### Scenario: Stable callback still checks current deletion state

- **WHEN** an asset reference or version changes after initial rendering and the operator opens deletion through the card
- **THEN** the deletion flow SHALL use the latest asset/reference state and existing protection checks
- **AND** callback memoization SHALL NOT permit stale reference or version data to bypass those checks
