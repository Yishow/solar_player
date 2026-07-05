# image-management-ui-ux-optimization Specification

## Purpose

TBD - created by archiving change 'optimize-image-management-ui-and-ux'. Update Purpose after archive.

## Requirements

### Requirement: Interactive visual styling alignment
The system SHALL apply sophisticated visual effects to the image management dashboard for a premium UI feel.

#### Scenario: Hovering image thumbnails
- **WHEN** the operator hovers over an image thumbnail `.im-thumb`
- **THEN** the thumbnail card SHALL translate upwards smoothly
- **AND** the preview image within it SHALL scale up by `1.03`
- **AND** a soft green shadow glow SHALL transition in

#### Scenario: HSL badge colors
- **WHEN** rendering "Cover" or "Active" badges on thumbnails
- **THEN** the badges SHALL use semi-transparent HSL border and background combinations


<!-- @trace
source: optimize-image-management-ui-and-ux
updated: 2026-07-06
code:
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
-->

---
### Requirement: Real-time client-side filter
The system SHALL support keyword search and state filtering for image thumbnails in the viewport.

#### Scenario: Filter by keyword and status
- **WHEN** the operator types a query in the filter search box
- **OR** selects a status (e.g. "Cover Only") from the filter dropdown
- **THEN** the thumbnail grid SHALL immediately update to show only matching assets
- **AND** no backend API request SHALL be triggered


<!-- @trace
source: optimize-image-management-ui-and-ux
updated: 2026-07-06
code:
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
-->

---
### Requirement: Improved focal point visual indicator
The system SHALL provide a direct focal point alignment helper without page redirection.

#### Scenario: Viewing selected asset details
- **WHEN** an asset with a configured focal point is selected
- **THEN** a semi-transparent target focal point crosshair SHALL overlay on the sidebar preview
- **AND** its coordinates MUST correspond to the asset's active focal point percentage


<!-- @trace
source: optimize-image-management-ui-and-ux
updated: 2026-07-06
code:
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
-->

---
### Requirement: Playlist Row quick toggle
The system SHALL enable direct control of image playback states in the Playlist Rows container.

#### Scenario: Clicking the quick switch on a row card
- **WHEN** an operator toggles the embedded switch directly on a Playlist Row card
- **THEN** the corresponding playlist entry enabled state SHALL toggle
- **AND** the draft changes state MUST be flagged as dirty

<!-- @trace
source: optimize-image-management-ui-and-ux
updated: 2026-07-06
code:
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
-->