# display-publish-preflight Specification

## Purpose

TBD - created by archiving change 'unify-display-publish-preflight'. Update Purpose after archive.

## Requirements

### Requirement: Publish review starts from a saved identified draft
<!-- requirement-id: U5-R1 -->

The publish action SHALL save or require saving the current draft before checking an exact draft version. It SHALL show the changes, affected scope and findings in one review surface. Entering review SHALL not publish automatically.

#### Scenario: Dirty draft
<!-- scenario-id: U5-R1-S01 -->

- **GIVEN** the operator has unsaved changes and opens publish review
- **WHEN** saving succeeds
- **THEN** the checked version is exactly the saved draft and a separate confirmation is required

#### Scenario: Draft save fails
<!-- scenario-id: U5-R1-S02 -->

- **GIVEN** save returns a validation or conflict error
- **WHEN** publish review was requested
- **THEN** publication does not occur and local edits remain recoverable


<!-- @trace
source: unify-display-publish-preflight
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->

---
### Requirement: The server revalidates the reviewed version at publication
<!-- requirement-id: U5-R2 -->

Publication SHALL require the expected draft version and a valid preflight token tied to structural dependency revisions. The server SHALL reject stale reviews and recheck current readiness before writing live state. Browser-only checks SHALL not authorize publication.

#### Scenario: Concurrent draft mutation
<!-- scenario-id: U5-R2-S01 -->

- **GIVEN** a preflight reviewed version 8 and another operator creates version 9
- **WHEN** version 8 is submitted for publication
- **THEN** the request is rejected with a recheck/conflict result and version 9 is not silently published

#### Scenario: Dependency changes
<!-- scenario-id: U5-R2-S02 -->

- **GIVEN** an asset or metric definition changes after review
- **WHEN** publication is attempted
- **THEN** the stale review is rejected; live sensor updates alone do not invalidate unrelated structural revisions


<!-- @trace
source: unify-display-publish-preflight
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->

---
### Requirement: Findings are actionable and policy based
<!-- requirement-id: U5-R3 -->

Each finding SHALL expose severity, human-readable explanation, stable page/item/field identifiers and a remediation action. Blocking versus warning classification SHALL follow source/asset validity and the configured fallback policy. Fixing an item SHALL invalidate the previous review.

#### Scenario: Missing asset
<!-- scenario-id: U5-R3-S01 -->

- **GIVEN** a card references a removed image
- **WHEN** preflight runs
- **THEN** a blocking finding names the card and opens asset replacement at that item

#### Scenario: Stale data allowed by fallback
<!-- scenario-id: U5-R3-S02 -->

- **GIVEN** a card allows labeled stale fallback
- **WHEN** preflight observes stale data
- **THEN** the finding explains the warning and formal fallback, rather than silently passing as fresh


<!-- @trace
source: unify-display-publish-preflight
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->

---
### Requirement: Shared-setting impact and page publication stay distinct
<!-- requirement-id: U5-R4 -->

Review SHALL distinguish page-only draft changes from shared shell, asset or source changes. Impact SHALL include known draft/live/derived consumers and expose unknown coverage. Page publication SHALL not imply delayed application of a shared source setting already saved.

#### Scenario: Shared source already applied
<!-- scenario-id: U5-R4-S01 -->

- **GIVEN** a broker/source edit was saved through its own apply action
- **WHEN** a page draft is still unpublished
- **THEN** the UI does not claim the shared edit waits for page publication

#### Scenario: Unknown consumers
<!-- scenario-id: U5-R4-S02 -->

- **GIVEN** a dependency-impact lookup fails
- **WHEN** a destructive change is reviewed
- **THEN** impact is unknown and required safety review blocks instead of showing zero affected pages


<!-- @trace
source: unify-display-publish-preflight
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->

---
### Requirement: Saved published and applied states require different evidence
<!-- requirement-id: U5-R5 -->

The UI SHALL distinguish draft-saved, server-published and device-applied. Device-applied SHALL require an actual matching page/version acknowledgment. Online state, message emission or HTTP publication success SHALL not be sufficient evidence.

#### Scenario: Online without acknowledgment
<!-- scenario-id: U5-R5-S01 -->

- **GIVEN** the server publishes version 12 and a device is online
- **WHEN** no matching page/version acknowledgment exists
- **THEN** the UI shows published with pending/unknown application, not applied

#### Scenario: Matching acknowledgment
<!-- scenario-id: U5-R5-S02 -->

- **GIVEN** a device reports applying that page version 12
- **WHEN** the report is validated
- **THEN** only that device is marked applied with acknowledgment time


<!-- @trace
source: unify-display-publish-preflight
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->

---
### Requirement: Failure and retries preserve formal playback
<!-- requirement-id: U5-R6 -->

Failed publication SHALL leave the previous live version intact. Retry SHALL be idempotent for the same operation and reviewed version. Navigation and revision conflicts SHALL preserve the local draft and offer an explicit recovery path.

#### Scenario: Publication failure
<!-- scenario-id: U5-R6-S01 -->

- **GIVEN** version 11 is live and publishing 12 fails
- **WHEN** runtime reads live configuration
- **THEN** version 11 remains active and the draft is not lost

#### Scenario: Double click
<!-- scenario-id: U5-R6-S02 -->

- **GIVEN** the same confirmed publish operation is submitted twice
- **WHEN** the server processes both
- **THEN** one logical publication occurs and the responses identify the same published version


<!-- @trace
source: unify-display-publish-preflight
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->

---
### Requirement: Profile activation and page publication expose separate effects
<!-- requirement-id: U5-R7 -->

Publish preflight SHALL identify site-profile references and whether source changes have already become active. U6 profile activation SHALL never be mislabeled as page publication, and an unpublished page draft SHALL not be claimed to protect live profile-following consumers from a shared accounting change. Unknown impacts and conflicting versions SHALL require resolution.

#### Scenario: Profile changes before page publish
<!-- scenario-id: U5-R7-S01 -->

- **GIVEN** a page draft is still unpublished and U6 changes its shared accounting profile
- **WHEN** the operator reviews apply and later page preflight
- **THEN** both show the actual shared-data effect; page publication remains a distinct confirmation

#### Scenario: Custom pinned binding
<!-- scenario-id: U5-R7-S02 -->

- **GIVEN** a page does not follow the active site profile
- **WHEN** preflight is requested
- **THEN** the exception is identified with an explicit migration action, not silently overwritten

<!-- @trace
source: unify-display-publish-preflight
updated: 2026-09-08
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
-->