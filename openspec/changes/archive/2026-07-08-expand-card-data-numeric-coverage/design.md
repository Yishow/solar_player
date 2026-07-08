## Context

Card Data Management currently reads monitoring rows from `readDisplayStory({ applyDisplayOverrides: false })` and household rows from `readSustainabilityStory(undefined, { applyDisplayOverrides: false })`. This misses numeric Sustainability period cards and Factory Circuit engineering slot power values. The UI already supports rows with dependencies, source topics, publish actions, and display-only override actions, so the narrowest fix is to add more diagnostic row producers rather than introduce another management surface.

## Goals / Non-Goals

Goals:

- Include all requested playback numeric card values in Card Data Management.
- Include Factory Circuit engineering slot power values as card-data rows.
- Keep the UI input prefixes horizontal inside Card Data Management action rows.

Non-goals:

- Images data, static text, weather/header, editor style/layout, and non-card data.
- Changes to playback visuals.
- Changes to MQTT ingestion, raw history, or editor persistence.

## Design

### Sustainability Numeric Rows

The diagnostics service will add rows for numeric values in the selected Sustainability story period:

- `accumulatedGenerationGwh`
- `accumulatedCarbonReductionTons`
- `annualEnergySavingPercent`
- `plantedTreeEquivalent`

Each row will use the existing Sustainability story provenance for source classification, aggregate source, last update, and readiness. The row will support display-only override. Rows with no numeric display value remain visible as `waiting-aggregate`.

### Factory Circuit Slot Rows

The diagnostics service will add rows for each `factoryCircuit.slots[]` entry. Each row will use:

- `cardId`: `factory-circuit.slot.<slotKey>`
- `metricKey`: derived from the existing slot-to-metric mapping
- `label`: slot display label
- `displayValue`: current `livePowerKw` formatted as `kW` or `--`
- `dependencies`: the slot metric and source topic state
- `status`: `ready`, `missing-topic`, `idle-topic`, or `waiting-aggregate`

Slot rows support existing publish-test-value/configure-topic actions through their metric key and display-only override through the existing override path.

### Input Prefix CSS

Limit the fix to Card Data Management action rows. The prefix text will be forced onto a single horizontal line with a stable min-width, preventing Chinese labels from breaking into vertical text while preserving the current card layout.

## Implementation Contract

- `/api/display-card-data` SHALL include Sustainability numeric card rows for the selected period big-number values.
- `/api/display-card-data` SHALL include Factory Circuit engineering slot rows for live power values.
- Factory slot rows SHALL expose source topic/dependency status and use existing publish/configure topic actions.
- Display-only overrides SHALL continue to work for new numeric rows without writing true data tables.
- The Card Data Management input prefix labels SHALL render horizontally and SHALL NOT require changing the surrounding Topic workspace layout.

## Verification

- Server route tests cover Sustainability numeric rows and Factory slot rows.
- Web component/CSS tests cover input prefix horizontal rendering selectors.
- Focused tests and `pnpm run build` pass.
