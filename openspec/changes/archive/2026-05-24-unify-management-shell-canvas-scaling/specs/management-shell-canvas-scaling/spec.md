## ADDED Requirements

### Requirement: Management routes share a single whole-page canvas shell

The system SHALL render every management route inside the same whole-page management shell, where the shell header, route content, and shell footer are composed inside one fixed design canvas before viewport scaling is applied. The system SHALL NOT branch between fixed-frame and non-fixed-frame shell models for different management routes.

#### Scenario: Previously split management routes use the same shell model

- **WHEN** a user navigates to any management route
- **THEN** the route SHALL render inside the same management shell contract as every other management route
- **AND** the shell SHALL NOT require route metadata flags to decide whether chrome is inside or outside the scaled canvas

##### Example: management route coverage

| Route | Expected shell model |
| ----- | -------------------- |
| /brand | Whole-page management canvas |
| /display-pages/editor | Whole-page management canvas |
| /settings/playback | Whole-page management canvas |
| /device-status | Whole-page management canvas |

### Requirement: Management shell uses playback-aligned canvas geometry and scaling

The management shell SHALL use a fixed 1920x1080 design canvas, with the shell header, content slot, and shell footer laid out inside that canvas. The shell SHALL compute a single uniform scale from the limiting viewport dimension using the same layout semantics as playback canvas scaling, and it SHALL allow scale values greater than 1 when the viewport is larger than the design canvas.

#### Scenario: Management shell scales from the limiting viewport dimension

- **WHEN** the management shell computes layout for a viewport
- **THEN** it SHALL apply one uniform scale to the full management canvas
- **AND** it SHALL center the scaled canvas within the viewport
- **AND** it SHALL NOT clamp the scale to 1

##### Example: uniform management shell scaling

| Viewport (w x h) | Expected scale |
| ---------------- | -------------- |
| 1280 x 720 | min(1280/1920, 720/1080) |
| 2560 x 1440 | min(2560/1920, 1440/1080) |

### Requirement: Management shell preserves canvas behavior when chrome is hidden or content overflows

The management shell SHALL keep the same canvas contract when shell chrome is hidden or when route content exceeds the content slot height. When chrome is hidden, the content area SHALL take the full canvas height. When content overflows, the content area SHALL provide scrolling without moving the shell header or shell footer outside the canvas contract.

#### Scenario: Edit mode hides chrome without leaving the canvas model

- **WHEN** a management route requests hideChrome behavior
- **THEN** the management shell SHALL continue to render a management canvas
- **AND** it SHALL omit the shell header and shell footer from that canvas state
- **AND** it SHALL assign the full canvas height to the content area

#### Scenario: Tall management content scrolls inside the canvas content area

- **WHEN** route content exceeds the management content slot height
- **THEN** the management shell SHALL expose scrolling inside the content area
- **AND** it SHALL keep the shell header and shell footer anchored to the same scaled canvas
