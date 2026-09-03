## Why

Data Hub consolidation left three regressions against the current management-surface contracts: metric cards display hard-coded usage and health text instead of live usage/provenance data, collapsed Managed Solar cards still occupy more than one row, and the MQTT settings surface remains concentrated in two source files far above the documented 400-line modularity boundary. These regressions make operator diagnostics misleading and keep the consolidated surface difficult to review and maintain.

## What Changes

- Render metric usage and diagnostics from the existing usage/provenance models, including real playback consumers, freshness, evaluation state, and failure information; remove hard-coded healthy/usage copy.
- Make a collapsed Managed Solar adapter a true single-row summary and reveal secondary metadata and controls only when expanded.
- Split the oversized MQTT settings controller and content surface into named, focused modules while preserving routes, API calls, user-visible behavior, and stable test selectors.
- Add focused tests that lock the live metric-detail states, collapsed/expanded adapter geometry, and module-size boundary.

## Non-Goals

- No route, API, database, MQTT topic, or deployment changes.
- No redesign of Data Hub or MQTT settings visuals beyond restoring the existing contracts.
- No changes to playback configuration behavior or the unrelated kiosk recovery change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `data-hub-management-surface`: Clarify that metric detail content comes from live usage/provenance results and that collapsed Managed Solar adapters render as one summary row.
- `mqtt-settings-operations-surface`: Make the existing under-400-line modularity requirement verifiable for the refactored MQTT settings surface.

## Impact

- Modified: `apps/web/src/pages/DataHub/Metrics.tsx`, `apps/web/src/pages/DataHub/MetricsModel.ts`, `apps/web/src/pages/DataHub/SourceCards.tsx`, and focused Data Hub tests.
- Modified and split: `apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx`, `apps/web/src/pages/MqttSettings/index.tsx`, adjacent MQTT settings modules, and focused tests.
- Modified specs: `openspec/specs/data-hub-management-surface/spec.md` and `openspec/specs/mqtt-settings-operations-surface/spec.md` through delta specs in this change.
