## ADDED Requirements

### Requirement: Playback footer left ornament provides geometric sun badge

The playback footer left ornament SHALL render a minimalist geometric sun badge using clean lines instead of the hand-drawn mini leaf ornament. 

#### Scenario: Left sun badge rendering
- **WHEN** the footer navigation renders in playback mode
- **THEN** it renders the geometric sun badge instead of the leaf ornament

### Requirement: Playback footer right ornament provides dynamic energy pulse line

The playback footer right ornament SHALL render a horizontal energy pulse line with a glowing dot animating from left to right instead of the hand-drawn sway branch ornament.

#### Scenario: Right energy pulse line rendering
- **WHEN** the footer navigation renders in playback mode
- **THEN** it renders the dynamic energy pulse line and its animation

### Requirement: Playback footer navigation route icons render with enhanced contrast and pulse fade

The playback footer navigation icons SHALL render with a stroke width of 2.0 to improve visibility on remote signage screens. The active route icon and text SHALL render in bright green with a gold underline, and SHALL feature a subtle breathing opacity pulse effect.

#### Scenario: Active icon contrast and pulse enhancement
- **WHEN** a playback route is active
- **THEN** its icon stroke width is 2.0 and it displays the bright green styling with gold underline and breathing opacity pulse
