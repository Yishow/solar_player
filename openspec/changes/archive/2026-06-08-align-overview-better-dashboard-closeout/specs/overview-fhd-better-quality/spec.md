## MODIFIED Requirements

### Requirement: Compose Overview hero, density row, and KPI row without overlap

The Overview layout SHALL position the hero media, the KPI card row, and the density widget row as three non-overlapping vertical bands that fill the canvas with even rhythm, arranged top-to-bottom as hero band, then KPI card row, then density widget row, matching the Better reference (`docs/reference/Better/01.Overivew (大).png`). The density widget row SHALL present four widgets — weather, three-phase power, generation trend, and alert notifications — so the alert notifications widget SHALL be visible by default rather than hidden.

#### Scenario: Three bands do not overlap

- **WHEN** the Overview layout is resolved at 1920x1080
- **THEN** the vertical extent of the KPI card row does not overlap the hero media band or the density widget row band

#### Scenario: KPI row sits above the density widget row

- **WHEN** the Overview layout is resolved at 1920x1080
- **THEN** the top of the density widget row band is greater than or equal to the bottom of the KPI card row band

#### Scenario: Density row presents four widgets including alert notifications

- **WHEN** `/overview` renders the density widget row with default configuration
- **THEN** the weather, three-phase power, generation trend, and alert notifications widgets are all visible

#### Scenario: Hero remains the primary visual

- **WHEN** the hero band renders
- **THEN** the hero media occupies the right-side primary visual area and the bilingual title group reads as the left-side secondary anchor

## ADDED Requirements

### Requirement: Render the Overview hero photo as a faded top band, not a full-page background

When the Overview background pool provides a photo, the Overview SHALL render that photo as a top band that occupies only the upper portion of the canvas and fades into the light page background toward its bottom edge, with a proportion approximating the Better reference (`docs/reference/Better/01.Overivew (大).png`). The photo SHALL NOT fill the entire page behind the KPI card row and the density widget row, so those cards sit on the light page background rather than on top of the photo.

#### Scenario: Hero photo does not bleed behind the cards

- **WHEN** `/overview` renders with a background-pool photo at 1920x1080
- **THEN** the photo is confined to an upper band that fades out before the KPI card row and density widget row, and those cards render over the light page background rather than over the photo

#### Scenario: Bilingual title reads against the hero band

- **WHEN** the hero band renders with the photo
- **THEN** the bilingual title and subtitle remain within the photo band and stay legible
