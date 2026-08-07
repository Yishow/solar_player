# metrics-aggregate-fidelity Specification

## Purpose

TBD - created by archiving change 'repair-freshness-upload-and-playback-runtime-defects'. Update Purpose after archive.

## Requirements

### Requirement: Distinguish a measured zero from an absent aggregate

The system SHALL report a measured aggregate power value of zero as the number `0`, and SHALL report `null` only when no observation source is available for that aggregate.

#### Scenario: All contributing circuits report zero power

- **WHEN** the live metrics snapshot contains contributing power readings whose values sum to zero
- **THEN** the aggregate snapshot SHALL report the consumption power as `0`
- **AND** it SHALL NOT report `null`

#### Scenario: No observation source is available

- **WHEN** the aggregate is built without any live metrics observation
- **THEN** the aggregate snapshot SHALL report the consumption power as `null`

##### Example: zero versus absent

| Contributing readings | Reported consumption power | Notes |
| --------------------- | -------------------------- | ----- |
| 0 kW, 0 kW | 0 | measured zero, plant idle |
| 12 kW, 8 kW | 20 | normal case |
| (no observation) | null | source unavailable |


<!-- @trace
source: repair-freshness-upload-and-playback-runtime-defects
updated: 2026-08-07
code:
  - docs/ops/workflow.md
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/app.ts
  - apps/server/src/metrics/metricTimestamp.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - packages/shared/src/managementAccess.ts
  - apps/server/src/metrics/liveMetrics.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/sw.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/routes/images.ts
  - docs/ops/conventions.md
tests:
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/metrics/metricTimestamp.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/server/src/realtime/SocketService.broadcastGuardrails.test.ts
  - apps/web/src/sw.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/uploadsSecurityHeaders.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/server/src/metrics/liveMetrics.test.ts
-->

---
### Requirement: Match power units without case sensitivity

The system SHALL treat power unit labels as case-insensitive when selecting readings for aggregation, so that readings are not silently excluded because of unit letter casing.

#### Scenario: Mixed-case unit labels contribute to the aggregate

- **WHEN** contributing readings carry power unit labels that differ only in letter casing
- **THEN** every such reading SHALL be included in the aggregate sum

##### Example: casing variants

| Unit label on reading | Included in aggregate |
| --------------------- | --------------------- |
| kW | yes |
| kw | yes |
| KW | yes |
| kWh | no — not a power unit |

<!-- @trace
source: repair-freshness-upload-and-playback-runtime-defects
updated: 2026-08-07
code:
  - docs/ops/workflow.md
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/app.ts
  - apps/server/src/metrics/metricTimestamp.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - packages/shared/src/managementAccess.ts
  - apps/server/src/metrics/liveMetrics.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/sw.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/routes/images.ts
  - docs/ops/conventions.md
tests:
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/metrics/metricTimestamp.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/server/src/realtime/SocketService.broadcastGuardrails.test.ts
  - apps/web/src/sw.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/uploadsSecurityHeaders.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/server/src/metrics/liveMetrics.test.ts
-->