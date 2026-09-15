## MODIFIED Requirements

### Requirement: The workspace remains usable with keyboard and smaller desktops
<!-- requirement-id: U1-R6 -->

Task navigation, lists, drawers and critical actions SHALL be keyboard operable, have visible focus and textual status, and remain usable at 1366x768, 1440x900 and 1920x1080. No status SHALL depend on color alone. Opening, typing, input composition, saving and live updates SHALL preserve logical focus. Required dialog actions SHALL be inside the dialog. Background interaction and scrolling SHALL be isolated while modal, and restored when it closes. Non-excepted content SHALL remain usable at a 320 CSS pixel width.

#### Scenario: Keyboard drawer use
<!-- scenario-id: U1-R6-S01 -->

- **GIVEN** the operator uses Tab and Enter only
- **WHEN** a source is opened, edited and closed
- **THEN** focus order is logical and returns to the initiating row

#### Scenario: Smaller desktop
<!-- scenario-id: U1-R6-S02 -->

- **GIVEN** the viewport is 1366x768
- **WHEN** an error and save action are displayed
- **THEN** neither required input nor save/discard action is clipped or unreachable

#### Scenario: Typing and live updates preserve focus
<!-- scenario-id: U1-R6-S03 -->

- **GIVEN** the caret is within a source name and an IME composition may be active
- **WHEN** the parent rerenders and new observations arrive
- **THEN** the same input, caret and composition remain active without reopening or resetting focus

#### Scenario: Hidden fields are not tab stops
<!-- scenario-id: U1-R6-S04 -->

- **GIVEN** an advanced section is collapsed
- **WHEN** Tab or Shift+Tab traverses the modal
- **THEN** only visible enabled controls participate and focus does not enter background content

#### Scenario: Closed row no longer exists
<!-- scenario-id: U1-R6-S05 -->

- **GIVEN** the initiating source is deleted or filtered out
- **WHEN** the inspector closes
- **THEN** focus returns once to a documented logical list fallback rather than document body

## ADDED Requirements

### Requirement: Source inspection has one task-oriented information hierarchy
<!-- requirement-id: DHI-R1 -->

The inspector SHALL expose the selected source identity, site, ownership, configuration state and observation provenance before technical detail. Overview, mapping, bounded received samples and usage SHALL be distinct sections. An already selected managed source SHALL not require another generic expand action to reveal its primary details.

#### Scenario: Open a managed source
<!-- scenario-id: DHI-R1-S01 -->

- **GIVEN** a Solar managed source has several resources
- **WHEN** its row is selected
- **THEN** the overview shows managed ownership, resource summary and a read-only explanation without pretending it has one missing generic value

#### Scenario: Usage request fails
<!-- scenario-id: DHI-R1-S02 -->

- **GIVEN** the operator opens usage and the request fails
- **WHEN** usage renders
- **THEN** the state is unknown with retry, not zero consumers or safe-to-delete

#### Scenario: No historical API
<!-- scenario-id: DHI-R1-S03 -->

- **GIVEN** only bounded current capture samples are available
- **WHEN** sample detail opens
- **THEN** the interface describes samples and their coverage rather than implying a complete history

### Requirement: Inspector fields adapt to the actual container
<!-- requirement-id: DHI-R2 -->

The inspector SHALL arrange readable fields from its actual available content width, provide full-width long technical values, and keep field labels, errors and actions reachable without page-level horizontal scrolling. Visual density SHALL distinguish headings, supporting metadata and primary actions.

#### Scenario: Large viewport narrow inspector
<!-- scenario-id: DHI-R2-S01 -->

- **GIVEN** the viewport is 1920 pixels wide but inspector content is narrower than 640 pixels
- **WHEN** mapping fields render
- **THEN** fields use one column rather than the desktop 12-column layout

#### Scenario: Long topic and translated labels
<!-- scenario-id: DHI-R2-S02 -->

- **GIVEN** a topic is very long and labels wrap
- **WHEN** the inspector renders at 390 CSS pixels
- **THEN** values can be inspected and copied completely while the page does not overflow horizontally

### Requirement: Inspector expansion preserves the same draft and evidence
<!-- requirement-id: DHI-R3 -->

The inspector SHALL allow a complex editing task to expand into a full workspace without losing its draft, selected sample revision, errors or return context. Presentation mode SHALL not create a second independently saveable copy. Only one coherent primary persistence action SHALL be presented for its actual transaction scope.

#### Scenario: Expand while dirty
<!-- scenario-id: DHI-R3-S01 -->

- **GIVEN** the source draft contains unsaved name and selector changes
- **WHEN** the operator expands and later returns to the inspector
- **THEN** the same changes and selected evidence remain and no write occurred

#### Scenario: Save within the modal
<!-- scenario-id: DHI-R3-S02 -->

- **GIVEN** a valid single-source edit is ready and E transaction support is enabled
- **WHEN** the operator saves from the footer
- **THEN** only the named source transaction is submitted and feedback remains visible inside the inspector

#### Scenario: Legacy save still active
<!-- scenario-id: DHI-R3-S03 -->

- **GIVEN** only the previous full-list save is available
- **WHEN** the transitional inspector offers persistence
- **THEN** it clearly labels the full change count and never claims to save one row

### Requirement: Inspector identifies publisher and source family without offering upstream mutation
<!-- requirement-id: DHI-R4 -->

The inspector SHALL distinguish the upstream publisher from the Player production subscriber and the temporary discovery subscriber. It SHALL show whether a source is managed Solar, an individually reviewed power channel, a publisher-calculated aggregate, or diagnostic-only evidence. A publisher-declared ID SHALL remain a claim unless authenticated metadata proves it. Publisher configuration SHALL remain outside receiver edit controls.

#### Scenario: Managed Solar selection
<!-- scenario-id: DHI-R4-S01 -->

- **GIVEN** a standard Solar summary or whole-zone source is selected
- **WHEN** the inspector opens
- **THEN** the source is already managed, its canonical metrics are reusable, and there is no generic remapping or upstream broker-edit action

#### Scenario: Virtual power aggregate
<!-- scenario-id: DHI-R4-S02 -->

- **GIVEN** a publisher emits a sum of several raw counters
- **WHEN** its detail opens
- **THEN** the formula membership and calculation-only status are shown rather than counting it as another physical meter

#### Scenario: DDE timing limitation
<!-- scenario-id: DHI-R4-S03 -->

- **GIVEN** a successful DDE numeric read has no source event timestamp or device quality
- **WHEN** its sample is inspected
- **THEN** read time, publish time, receiver time and unknown source quality remain separately labeled; a green connection does not imply a fresh device measurement
