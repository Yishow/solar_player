# playback-card-configuring-status Specification

## Purpose

TBD - created by archiving change 'playback-card-status'. Update Purpose after archive.

## Requirements

### Requirement: Playback data cards support a per-card configuring status

The system SHALL support a per-card `status` field with the values `normal` and `configuring` on playback data cards (cards that display a value and a title) across the five playback pages: overview, solar, factory-circuit, images, and sustainability. When a card's `status` is `configuring`, the playback runtime SHALL replace the card's value position with the placeholder text "設置中" while preserving the card's title and styling. When `status` is `normal` or absent, the playback runtime SHALL render the card's real value. A card configuration that omits `status` SHALL be treated as `normal`, so existing drafts without the field render unchanged.

#### Scenario: Configuring card shows placeholder instead of value

- **WHEN** a playback data card's `status` is set to `configuring`
- **THEN** the playback runtime renders "設置中" in the card's value position
- **AND** the card's title and styling are unchanged

#### Scenario: Normal or absent status renders the real value

- **WHEN** a playback data card's `status` is `normal` or the field is absent
- **THEN** the playback runtime renders the card's real value

##### Example: status defaults across two cards

| Card status | Rendered value position |
|-------------|-------------------------|
| configuring | 設置中 |
| normal | real value |
| (field absent) | real value |


<!-- @trace
source: playback-card-status
updated: 2026-06-29
code:
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
-->

---
### Requirement: Configuring status is display-only and does not alter data

When a card's `status` is `configuring`, the system SHALL NOT disable, skip, or otherwise alter the card's underlying data binding, metric computation, or upstream source. The configuring status SHALL affect only the rendered value position of that card.

#### Scenario: Underlying binding keeps running while configuring

- **WHEN** a card with an active data binding is set to `status` `configuring`
- **THEN** the playback runtime still resolves the binding and computation as usual
- **AND** only the rendered value position is replaced with "設置中"


<!-- @trace
source: playback-card-status
updated: 2026-06-29
code:
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
-->

---
### Requirement: Hidden takes precedence over configuring

When a playback data card is both hidden (`visible` is `false`) and `configuring`, the playback runtime SHALL NOT render the card, so the "設置中" placeholder does not appear for a hidden card.

#### Scenario: Hidden configuring card is not rendered

- **WHEN** a card has `visible` set to `false` and `status` set to `configuring`
- **THEN** the playback runtime does not render the card
- **AND** no "設置中" placeholder is shown


<!-- @trace
source: playback-card-status
updated: 2026-06-29
code:
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
-->

---
### Requirement: Editor exposes a configuring status control that persists through draft and live publishing

The editor SHALL expose a status control offering `正常` (normal) and `設置中` (configuring) for playback data cards, bound to each card's `status` configuration path. Selecting a status SHALL update the page draft, and the draft value SHALL propagate to live through the existing draft and live publishing flow. The status control SHALL be available for data cards on all five playback pages and for card rail cards (metric-highlight and household-equivalent).

#### Scenario: Operator sets configuring and publishes

- **WHEN** the operator sets a card's status control to `設置中` in the editor and publishes the draft
- **THEN** the page draft records that card's `status` as `configuring`
- **AND** publishing propagates the configuring state to the live display
- **AND** the playback runtime renders "設置中" in that card's value position

##### Example: Sustainability household card set to configuring

- **GIVEN** the Sustainability `household-today` card status is `正常`
- **WHEN** the operator switches its status to `設置中` and publishes
- **THEN** the draft and live configuration record the card's `status` as `configuring`
- **AND** the playback runtime renders "設置中" in the card's value position while keeping its title

<!-- @trace
source: playback-card-status
updated: 2026-06-29
code:
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
-->