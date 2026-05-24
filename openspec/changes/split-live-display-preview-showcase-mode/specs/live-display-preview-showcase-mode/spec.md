## ADDED Requirements

### Requirement: Support editor and showcase presentation modes for live display previews

The implementation SHALL support distinct presentation modes for `LiveDisplayPagePreview` so editor contexts can keep diagnostic chrome while slideshow showcase contexts can render cleaner display miniatures.

#### Scenario: Existing callers keep editor behavior by default

- **WHEN** a caller renders `LiveDisplayPagePreview` without specifying a presentation mode
- **THEN** the preview uses editor presentation behavior
- **AND** read-only indication, detailed fallback text, border treatment, and diagnostic affordances remain available

#### Scenario: Showcase callers render a cleaner miniature

- **WHEN** a caller renders `LiveDisplayPagePreview` in showcase mode
- **THEN** the preview minimizes or removes read-only badge chrome
- **AND** it uses display-friendly surface and fallback styling
- **AND** it still renders the live page renderer when the state is ready

### Requirement: Slideshow preview cards use showcase mode

The implementation SHALL render `SlideshowPreview` carousel cards with showcase-mode live previews so the cards read as display-page miniatures rather than nested editor widgets.

#### Scenario: Carousel card avoids management chrome

- **WHEN** `/slideshow-preview` renders live preview cards
- **THEN** each card requests showcase mode for its embedded live display page preview
- **AND** the carousel card frame remains responsible for card selection, active glow, numbering, and footer label
- **AND** the embedded page preview does not add a competing management-style badge or heavy frame

### Requirement: Fallback states remain safe in both modes

The implementation SHALL keep non-ready live preview states readable and layout-safe in both editor and showcase presentation modes.

#### Scenario: Showcase fallback stays concise and stable

- **WHEN** a showcase preview receives `loading`, `unpublished`, `config-unavailable`, `runtime-unavailable`, `asset-unavailable`, or `renderer-unavailable`
- **THEN** it renders a concise display-friendly fallback surface
- **AND** the carousel card does not collapse or change dimensions
- **AND** detailed diagnostic text remains available in editor mode
