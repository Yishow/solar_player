## ADDED Requirements

### Requirement: Playback footer left ornament provides digital status gauge

The playback footer left ornament SHALL render a dynamic geometric circular status gauge instead of the hand-drawn mini leaf ornament. The gauge SHALL consist of a rotating outer circle representing the system loop and an inner pulsing dot representing live telemetry status.

#### Scenario: Left status gauge rendering
- **WHEN** the footer navigation renders in playback mode
- **THEN** it renders the geometric circular gauge instead of the leaf ornament

### Requirement: Playback footer right ornament provides data stream wave decoration

The playback footer right ornament SHALL render a geometric data wave path and a system status text label (containing `SYS ACTIVE // RPI-5`) instead of the hand-drawn sway branch ornament.

#### Scenario: Right data wave rendering
- **WHEN** the footer navigation renders in playback mode
- **THEN** it renders the geometric data wave path and the status text label

### Requirement: Playback footer navigation route icons render with enhanced contrast and glow

The playback footer navigation icons SHALL render with a stroke width of 2.0 to improve visibility on remote signage screens. The active route icon and text SHALL render in a high-contrast duotone style (using gold/green accents) with a subtle drop-shadow glow effect.

#### Scenario: Active icon contrast enhancement
- **WHEN** a playback route is active
- **THEN** its icon stroke width is 2.0 and it displays the duotone styling with a glow effect
