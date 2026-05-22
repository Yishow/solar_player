## ADDED Requirements

### Requirement: Display canvas scales uniformly to preserve aspect ratio

The display canvas SHALL scale its fixed design surface by a single uniform factor equal to the smaller of the horizontal and vertical fit ratios, so the design aspect ratio is preserved on any viewport. The canvas SHALL NOT apply independent horizontal and vertical scale factors.

#### Scenario: Uniform scale chosen from the limiting dimension

- **WHEN** the canvas layout is computed for a viewport
- **THEN** the scale SHALL equal the smaller of (viewport width / design width) and (viewport height / design height)

##### Example: layout computation (design 1920x1080)

| Viewport (w x h) | scale  | offsetX | offsetY |
| ---------------- | ------ | ------- | ------- |
| 1920 x 1080      | 1.0    | 0       | 0       |
| 1280 x 720       | 0.6667 | 0       | 0       |
| 1920 x 1200      | 1.0    | 0       | 60      |
| 1080 x 1920      | 0.5625 | 0       | 656     |

### Requirement: Off-aspect viewports are letterboxed and centered

When the viewport aspect ratio does not match the design aspect ratio, the scaled canvas SHALL be centered within the viewport, leaving equal letterbox margins on the two opposite sides. The letterbox area SHALL use the stage background color.

#### Scenario: Centered with equal margins

- **WHEN** the viewport is taller (relative to width) than the design aspect ratio
- **THEN** the scaled canvas SHALL be centered vertically with equal top and bottom letterbox margins

##### Example: taller viewport centers the canvas with equal top and bottom margins

- **GIVEN** a viewport of `1920 x 1200` and a design surface of `1920 x 1080`
- **WHEN** the canvas layout is computed
- **THEN** the scale SHALL remain `1.0`
- **AND** the canvas SHALL be offset by `60px` from the top and `60px` from the bottom

#### Scenario: 16:9 viewport renders without letterbox

- **WHEN** the viewport aspect ratio equals the design aspect ratio (16:9)
- **THEN** both letterbox offsets SHALL be zero
- **AND** the rendered result SHALL be equivalent to a single uniform scale with no centering offset
