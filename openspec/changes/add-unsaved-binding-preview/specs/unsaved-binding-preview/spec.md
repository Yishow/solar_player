## ADDED Requirements

### Requirement: Ephemeral preview validates the unsaved draft without writes
<!-- requirement-id: U4-R1 -->

The preview API SHALL validate the supplied unsaved draft against the same page schema, authorized catalog and binding compiler as save/publish. It SHALL execute no configuration, live-metric, history, device-context or MQTT writes and SHALL identify the result as preview-only.

#### Scenario: Unsaved binding change
<!-- scenario-id: U4-R1-S01 -->

- **GIVEN** a saved card uses metric A and an unsaved draft chooses compatible metric B
- **WHEN** ephemeral preview is requested
- **THEN** B is previewed while saved draft, live page, history and publish counts remain unchanged

#### Scenario: Unsupported metric semantics
<!-- scenario-id: U4-R1-S02 -->

- **GIVEN** a period-energy widget is offered a lifetime register
- **WHEN** preview is requested
- **THEN** the server rejects the incompatible binding with the stable item identity

### Requirement: Preview responses are scoped bounded and versioned
<!-- requirement-id: U4-R2 -->

Requests SHALL require management authorization, a valid concrete preview context, a supported page schema and a payload not exceeding 256 KiB. Responses SHALL include client edit revision, context, catalog revision and a draft fingerprint. Caches SHALL be bounded and isolated by authorization and context.

#### Scenario: Oversized request
<!-- scenario-id: U4-R2-S01 -->

- **GIVEN** a body exceeds 256 KiB
- **WHEN** preview is called
- **THEN** the server rejects it without compiling or persisting it

#### Scenario: Unauthorized preview
<!-- scenario-id: U4-R2-S02 -->

- **GIVEN** a caller cannot manage a page/site
- **WHEN** they request that page/site preview
- **THEN** authorization rejects the request without leaking data

### Requirement: Outdated previews cannot overwrite current edits
<!-- requirement-id: U4-R3 -->

The editor SHALL discard responses whose edit revision, page or preview context no longer matches the current draft. Editing SHALL mark prior values as pending until a matching result arrives. Failed preview SHALL preserve the draft and show an actionable error.

#### Scenario: Out of order results
<!-- scenario-id: U4-R3-S01 -->

- **GIVEN** A is requested before B but A completes last
- **WHEN** the editor receives both results
- **THEN** only B is applied to the current card

#### Scenario: Network error
<!-- scenario-id: U4-R3-S02 -->

- **GIVEN** an unsaved binding is valid locally
- **WHEN** preview fails over the network
- **THEN** the unsaved change remains and the UI shows retry rather than reverting to the saved binding

### Requirement: Preview context never mutates binding scope
<!-- requirement-id: U4-R4 -->

Site/group/device preview context SHALL affect only temporary resolution. Inherited bindings SHALL follow that context; explicitly fixed bindings SHALL remain fixed and state that distinction. No device identity or site assignment SHALL be changed.

#### Scenario: Fixed CL binding
<!-- scenario-id: U4-R4-S01 -->

- **GIVEN** a card explicitly binds CL and preview context changes to KN
- **WHEN** the result is displayed
- **THEN** the card remains CL and explains its fixed scope

#### Scenario: Inherited binding
<!-- scenario-id: U4-R4-S02 -->

- **GIVEN** the card uses inherit-device
- **WHEN** authorized preview context changes from CL to KN
- **THEN** KN is previewed without saving any binding or device setting

### Requirement: Metric selection exposes compatibility and data quality
<!-- requirement-id: U4-R5 -->

The metric picker SHALL expose human label, site, measurement meaning, unit, latest value and freshness/coverage, while enforcing the effective catalog. It SHALL offer an explanation for incompatible or unavailable metrics rather than silently allowing them.

#### Scenario: Waiting for baseline
<!-- scenario-id: U4-R5-S01 -->

- **GIVEN** a new cumulative meter has no month-start evidence
- **WHEN** the month-energy option is inspected
- **THEN** its missing-baseline status is visible and the register is not shown as the month result

#### Scenario: Catalog pending
<!-- scenario-id: U4-R5-S02 -->

- **GIVEN** a source exists but has not entered the effective supported catalog
- **WHEN** the handoff attempts to select it
- **THEN** a precise catalog/compatibility explanation appears rather than an invalid saved binding

### Requirement: DataHub handoff is contextual and reversible
<!-- requirement-id: U4-R6 -->

A source-to-display handoff SHALL preserve saved metric identity and site, offer only compatible target pages/items, require an explicit target selection, and write only an editor draft. Returning SHALL restore originating DataHub filters and unsaved context without leaking secrets into URLs.

#### Scenario: Choose target
<!-- scenario-id: U4-R6-S01 -->

- **GIVEN** U2 hands off a KN period-energy metric
- **WHEN** the operator chooses a compatible card
- **THEN** that card draft uses the KN identity; published pages remain unchanged

#### Scenario: Cancel handoff
<!-- scenario-id: U4-R6-S02 -->

- **GIVEN** target selection is canceled
- **WHEN** the operator returns to DataHub
- **THEN** the original scope/filter/selection is restored without adding a binding

### Requirement: Unsaved and formal previews are visibly distinct
<!-- requirement-id: U4-R7 -->

The editor SHALL label unsaved draft preview, saved draft and formal comparison states distinctly. Missing, estimated or stale values SHALL carry their quality indicators. Sample-only test data SHALL never be presented as measured formal data.

#### Scenario: Unpublished edit
<!-- scenario-id: U4-R7-S01 -->

- **GIVEN** an unsaved B binding is previewed alongside formal A
- **WHEN** the user compares the two
- **THEN** each view names its stage and formal A is not represented as already changed

#### Scenario: Sample-only source
<!-- scenario-id: U4-R7-S02 -->

- **GIVEN** an operator used a sample payload but no measured data exists
- **WHEN** the card preview opens
- **THEN** sample-only/waiting-data is explicit and no measured value is fabricated

### Requirement: Page previews use explicit profile revisions without duplicating accounting definitions
<!-- requirement-id: U4-R8 -->

Energy-related data selection and unsaved page previews SHALL identify their site-profile revision, department and period. Draft profile previews SHALL be explicitly labeled, evaluated without activation, and never silently replace live profile inputs. U6 return SHALL preserve page draft, selection and source context.

#### Scenario: Page draft stays intact
<!-- scenario-id: U4-R8-S01 -->

- **GIVEN** a user has unsaved text and position edits
- **WHEN** they open U6 and return after reviewing energy sources
- **THEN** the page draft and selected item remain, and the chosen preview revision is shown

#### Scenario: No second denominator
<!-- scenario-id: U4-R8-S02 -->

- **GIVEN** a page changes its period to month
- **WHEN** the data inspector saves a page draft
- **THEN** it saves the period/profile reference, not a copied set of site meter IDs
