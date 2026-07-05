# asset-library-enhancements Specification

## Purpose

TBD - created by archiving change 'optimize-asset-library'. Update Purpose after archive.

## Requirements

### Requirement: Interactive Glassmorphism UI and Micro-animations
The Asset Library SHALL utilize a refined visual system including glassmorphism layouts, subtle gradients, and smooth transition animations for all interactive cards.

#### Scenario: Asset card hover transitions
- **WHEN** the operator hovers the mouse pointer over any image asset card
- **THEN** the card SHALL animate with a smooth scale transformation
- **AND** the shadow depth SHALL increase to provide elevation feedback
- **AND** the border style SHALL transition smoothly to an accent highlight color


<!-- @trace
source: optimize-asset-library
updated: 2026-07-06
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Skeleton Loading Indicators
The Asset Library SHALL display skeleton loading layouts matching the selected thumbnail density when assets are loading or synchronizing.

#### Scenario: Visual load feedback during synchronization
- **WHEN** the asset list is loading or syncing from the backend
- **THEN** the system SHALL display flashing skeleton cards instead of a blank panel
- **AND** the number of skeleton cards displayed SHALL correspond to the current grid layout density


<!-- @trace
source: optimize-asset-library
updated: 2026-07-06
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Unified Control Bar with Search Clear Action
The Asset Library SHALL provide a unified glassmorphism control panel containing search and filter options with helper utilities and keyboard hotkeys.

#### Scenario: Clearing search input
- **WHEN** the operator types a non-empty string in the search input
- **THEN** a clear button (X icon) SHALL appear inline inside the search input box
- **AND** clicking the clear button SHALL reset the query to empty and refresh the filtered list immediately

#### Scenario: Keyboard shortcuts for search query
- **WHEN** the operator presses the "/" key outside any input field
- **THEN** the search input box SHALL automatically gain focus
- **AND** when the operator presses the "Escape" key while search input is focused, the input SHALL clear and blur


<!-- @trace
source: optimize-asset-library
updated: 2026-07-06
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Drag and Drop File Upload
The Asset Library SHALL support dragging and dropping local files directly onto the container to trigger the upload flow with realtime progress indicators.

#### Scenario: Dragging files over the library board
- **WHEN** the user drags one or more local image files over the Asset Library workspace panel
- **THEN** a visual drag-and-drop overlay with a dashed highlight border SHALL be displayed
- **AND** dropping the files SHALL trigger the upload workflow with the currently selected upload category and usage scope


<!-- @trace
source: optimize-asset-library
updated: 2026-07-06
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Lightbox Modal and Hover Details
The Asset Library SHALL support fullscreen image viewing via a lightbox modal with zoom controls and reveal dimension details on metadata hover.

#### Scenario: Launching image lightbox
- **WHEN** the operator clicks the image preview inside the right details panel
- **THEN** the system SHALL open a fullscreen lightbox modal overlay displaying the image
- **AND** pressing the "Escape" key or clicking the background overlay SHALL dismiss the lightbox modal

#### Scenario: Detailed metadata tooltip
- **WHEN** the operator hovers over the image size badge or details card
- **THEN** the page SHALL show a tooltip with the image width, height, and file size in bytes


<!-- @trace
source: optimize-asset-library
updated: 2026-07-06
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Color-Coded Health and Reference Badging with Actionable Redirects
The Asset Library SHALL present asset health and usage reference states using visually distinct color-coded badges, and provide actionable redirection for referenced pages.

#### Scenario: Displaying reference stage status with links
- **WHEN** an asset's usage references are loaded
- **THEN** the system SHALL display Live and Draft references using distinct, high-contrast badges (e.g. green for Live, blue for Draft)
- **AND** each reference item SHALL render as an active hyperlink that opens the corresponding display page editor in a new tab

#### Scenario: Blocker warnings
- **WHEN** deletion is blocked by active references
- **THEN** a warning container with a high-visibility outline SHALL display the issues preventing deletion


<!-- @trace
source: optimize-asset-library
updated: 2026-07-06
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Batch Action Mode with Preventative Disabling
The Asset Library SHALL support selecting multiple assets to perform batch actions, while proactively disabling selection for referenced assets.

#### Scenario: Proactive checkbox disabling in batch mode
- **WHEN** the operator enables multi-select mode
- **THEN** any asset card that has a reference count greater than zero SHALL have its selection checkbox disabled
- **AND** a lock icon SHALL be displayed in place of the active checkbox to prevent selection errors before execution


<!-- @trace
source: optimize-asset-library
updated: 2026-07-06
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Double-Click Quick Apply
The Asset Library SHALL support double-clicking asset cards for immediate selection and workflow return.

#### Scenario: Double click asset card in embedded mode
- **WHEN** the asset library is rendered in embedded mode (embedded is true) and the user double-clicks an asset card
- **THEN** the system SHALL immediately execute the apply selection handler and return to the editor workspace
- **AND** this shortcut SHALL be disabled when batch selection mode is active


<!-- @trace
source: optimize-asset-library
updated: 2026-07-06
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Inline Metadata and Attribute Editing
The Asset Library SHALL support editing asset metadata inline within the details panel and synchronize changes to the backend.

#### Scenario: Editing asset title and description inline
- **WHEN** the operator clicks the title text inside the right details panel
- **THEN** it SHALL switch to an active input field
- **AND** blurring the input field or pressing "Enter" SHALL trigger the updateImageAsset API to persist the changes to the database

#### Scenario: Modifying asset category and usage scope
- **WHEN** the operator changes the category or usage scope select dropdowns in the details panel
- **THEN** the system SHALL immediately update the database via the API and trigger asset synchronization


<!-- @trace
source: optimize-asset-library
updated: 2026-07-06
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Smart Category Auto-Detection
The Asset Library SHALL automatically predict the upload category based on image specifications and filename pattern.

#### Scenario: Pre-detecting category by dimensions
- **WHEN** a file is selected for upload and its dimensions are less than 256x256 pixels
- **THEN** the system SHALL set the default upload category to "icon"
- **AND** if the width is greater than 800 pixels with a landscape ratio, it SHALL default to "background"


<!-- @trace
source: optimize-asset-library
updated: 2026-07-06
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Empty State Upload Trigger
The Asset Library SHALL provide an upload trigger block when no assets match the current filter or search criteria.

#### Scenario: Triggering upload from empty board
- **WHEN** the filtered assets list is empty
- **THEN** the empty state board SHALL render as an active upload trigger box
- **AND** clicking the empty state board SHALL launch the file selector dialog


<!-- @trace
source: optimize-asset-library
updated: 2026-07-06
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Scroll Overlay Protection and Unified Button Aesthetics
The Asset Library SHALL keep functional headers sticky-safe with an opaque backdrop blur to prevent scroll content overlap, and buttons SHALL utilize premium hover and active scaling states.

#### Scenario: Action bar sticky opacity
- **WHEN** the Asset Library is scrolled downward
- **THEN** the top action bar SHALL remain sticky on top
- **AND** it SHALL have an opaque blur backdrop to cover ascending grid cards

#### Scenario: Button hover dynamics
- **WHEN** the operator hovers over primary or secondary control buttons
- **THEN** the button SHALL transition smoothly with depth shadows and micro translations

<!-- @trace
source: optimize-asset-library
updated: 2026-07-06
code:
  - apps/web/src/services/api.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->