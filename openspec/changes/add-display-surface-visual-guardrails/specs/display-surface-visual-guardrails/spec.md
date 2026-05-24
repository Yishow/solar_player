## ADDED Requirements

### Requirement: Provide a display surface visual review checklist

The implementation SHALL provide a repeatable visual review checklist for playback display pages so future changes can preserve the shared display-wall visual family while allowing content variation.

#### Scenario: Display page visual changes are reviewed consistently

- **WHEN** a change modifies playback page visuals, shared display chrome, card family styling, live preview presentation, or FHD geometry
- **THEN** the change references or follows the display surface visual review checklist
- **AND** the checklist covers hero typography, photo fade, card family, ornament consistency, preview mode, FHD geometry, and distance readability
- **AND** any intentional deviation from shared primitives is documented

### Requirement: Guard shared primitive adoption with lightweight tests or assertions

The implementation SHALL use lightweight tests or assertions to guard core shared primitive contracts for display playback pages without requiring a heavy screenshot-diff service.

#### Scenario: Tests catch common display-surface drift

- **WHEN** shared display primitives, live preview presentation, runtime page definitions, or seed geometry are changed
- **THEN** targeted tests or assertions cover the relevant contract
- **AND** the tests can run in the existing web test/typecheck workflow
- **AND** the guardrails do not require an external visual snapshot service

##### Example: Showcase preview mode stays explicit

- **GIVEN** slideshow preview cards embed live display page previews
- **WHEN** tests inspect the slideshow preview card renderer
- **THEN** the embedded preview requests showcase presentation mode
- **AND** editor-mode default behavior remains covered separately

### Requirement: Protect FHD geometry from accidental style refactors

The implementation SHALL treat playback page FHD geometry as a protected contract so visual cleanup work does not accidentally move display regions.

#### Scenario: Geometry movement is intentional and reviewable

- **WHEN** a change modifies `left`, `top`, `width`, or `height` values in display page layouts, seed configs, or runtime config defaults
- **THEN** the change identifies the geometry movement as intentional
- **AND** tests, fixtures, or manual checklist review confirm the movement is expected
- **AND** style-only refactors do not silently change FHD geometry

### Requirement: Guard semantic token usage for shared display chrome roles

The implementation SHALL guard semantic token usage for common display chrome roles while allowing documented exceptions for cases that cannot be cleanly tokenized.

#### Scenario: Shared chrome roles avoid new raw color drift

- **WHEN** a change adds or edits CSS for shared display chrome roles such as hero title, emphasis, card surface, photo fade, or ornaments
- **THEN** those roles use display semantic tokens where a token exists
- **AND** raw literal exceptions are documented when needed for data URI SVGs, masks, or specialized gradients
