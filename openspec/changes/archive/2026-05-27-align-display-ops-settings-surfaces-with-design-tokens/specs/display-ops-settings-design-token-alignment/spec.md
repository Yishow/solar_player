## ADDED Requirements

### Requirement: Align display-ops settings and preview surfaces to the same semantic token family

The system SHALL align `/settings/playback`, `/settings/images`, `/settings/mqtt`, `/settings/circuits`, and `/slideshow-preview` to the same semantic design-token family and shared management/reference surface primitives. These pages SHALL read as one display-operations product surface family rather than a mix of unrelated dashboard pages.

#### Scenario: Operator moves between playback settings and slideshow preview

- **WHEN** the operator navigates between `/settings/playback` and `/slideshow-preview`
- **THEN** the preview, status, and action surfaces share the same tokenized visual language
- **AND** the pages remain distinct in function without looking like unrelated products

##### Example: Preview surfaces stay visually coherent

- **GIVEN** the operator reviews playback order and then opens slideshow preview
- **WHEN** both pages render their live preview and summary sections
- **THEN** those sections use the same board, status, and action language
- **AND** only the page-specific information architecture differs

### Requirement: Reposition image management as governance and editor handoff after asset-library integration

The system SHALL position `/settings/images` as a governance and playback-management surface after asset-library integration. It SHALL emphasize playlist/runtime state, asset health, selection governance, and a clear handoff into `/display-pages/editor?workspace=assets` instead of duplicating the integrated asset-library role.

#### Scenario: Operator opens image management after asset-library integration

- **WHEN** the operator opens `/settings/images`
- **THEN** the page emphasizes playlist entries, runtime state, asset health, selected asset governance, and related operational actions
- **AND** it provides a clear entry into the integrated asset workspace for replacement or broader asset authoring

##### Example: Image management is no longer a hollow second asset library

- **GIVEN** the integrated asset library now lives inside `/display-pages/editor`
- **WHEN** the operator opens `/settings/images`
- **THEN** the page does not pretend to be the primary gallery surface
- **AND** it presents governance information plus a clear path to the integrated asset workspace

### Requirement: Preserve explicit high-risk settings state readability during token alignment

The system SHALL preserve explicit loading, disabled, success, error, broker status, topic mapping, circuit validation, and update feedback readability for `/settings/mqtt` and `/settings/circuits` while aligning those pages to the shared tokenized management surface family.

#### Scenario: High-risk settings page renders multiple runtime states

- **WHEN** `/settings/mqtt` or `/settings/circuits` renders loading, validation, broker, connection-test, save, or update states
- **THEN** the aligned UI keeps those states readable and actionable
- **AND** the token alignment does not collapse them into generic or ambiguous panels

##### Example: MQTT feedback stays explicit after visual alignment

- **GIVEN** `/settings/mqtt` has a recent connection test result and broker runtime status
- **WHEN** the aligned page renders those states
- **THEN** the user can still distinguish success, warning, error, and fallback conditions
- **AND** the page does not lose its explicit feedback hierarchy

### Requirement: Keep asset and shell authoring as editor handoffs rather than revived settings destinations

The system SHALL keep `/settings/assets` and `/shell-decorations/editor` as compatibility handoffs into `/display-pages/editor` workspaces while the display-ops settings family is aligned. The display-ops footer and route hierarchy SHALL NOT reintroduce those routes as first-class settings destinations.

#### Scenario: Operator navigates the display-ops settings family after workspace integration

- **WHEN** the operator moves through playback, image management, MQTT, circuits, and slideshow preview
- **THEN** the primary settings family focuses on operational governance and preview surfaces
- **AND** asset or shell authoring remains reachable through editor handoff flows rather than restored footer tabs

##### Example: Footer stays focused on display operations

- **GIVEN** asset and shell authoring now live inside `/display-pages/editor`
- **WHEN** the aligned management footer renders its first-class destinations
- **THEN** it keeps playback, images, MQTT, circuits, preview, and related ops surfaces visible
- **AND** it does not surface `/settings/assets` or `/shell-decorations/editor` as peer destinations again
