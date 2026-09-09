# Verification Record

## Baseline

- Date: 2026-09-09 (Asia/Taipei)
- Review baseline and implementation `HEAD`: `abd99ba846c25de35100229452e17e2442552a10`; no later commit is part of this uncommitted delivery.
- D4 remains applicable: `readGuidedMappingReception` reads only exact-identity rows from `meter_readings_accepted`, while reviewed power correctly updates only `live_metric_values`.
- Recorded reproduction: a production-handler power packet stored `12.5 kW` in live metrics, created zero accepted energy rows, yet reception returned `{ lastAcceptedAt: null, observed: false }`.
- Boundary: no public response field, SQLite schema, durable power history, broker connection, or power-ordering change. Power evidence is bounded to the current `MqttClientService` lifetime; a new service starts conservatively false.

## Acceptance boundary

- Required local evidence: source-bound producer-to-guided-replay regression through the production handler, isolation and rejection/restart coverage, focused server and web tests, final repository gate, strict Spectra validation, Standards review, and Spec review.
- Not claimed: live broker, browser acceptance, deployment, production, LAN, or field acceptance.

## Results

### TDD and focused verification

- RED: the new production-handler/guided-replay regression failed its `observed === true` assertion (`false !== true`) while the `12.5 kW` live row already existed and accepted energy, quarantine, and baseline counts remained zero. This isolated the evidence-reader defect rather than packet admission or live persistence.
- GREEN: `pnpm --filter @solar-display/server test src/routes/mqtt-guided-activation.test.ts src/mqtt/mqttPowerSelectorIngest.test.ts src/mqtt/mqttReviewedPowerOrdering.test.ts src/routes/mqtt-power-reception.test.ts src/mqtt/powerReceptionEvidence.test.ts src/mqtt/MqttClientService.test.ts src/mqtt/metricKeyIngestion.test.ts src/services/mqttMeterIngest.test.ts` — PASS, 81 tests, 0 failures.
- `pnpm --filter @solar-display/server build` — PASS, including the shared pretest build.
- `git diff --check` — PASS.

The final tests cover production-handler to identical guided replay, actual receipt time versus source time, full source-tuple isolation, generic old live rows, stale source cleanup and channel churn, repeated-packet boundedness, rollback/non-finite/late/conflict/duplicate rejection, reconnect and replacement-service lifecycle, and unchanged persisted energy reception. The guided response keys and replayed source/audit/receipt rows remain unchanged; reviewed power creates no accepted energy, quarantine, or baseline rows.

### Final closeout

- `pnpm --filter @solar-display/web test` — PASS, 1472 tests, 0 failures.
- Fresh Standards review — PASS after removing a redundant source-identity alias and ensuring cumulative-energy results carry no power-only identity; no remaining actionable P0-P3 finding.
- Fresh Spec review — PASS; evidence remains exact-source-bound, current-runtime-only, bounded, and is recorded only after a committed power live update.
- Post-review focused regression — PASS, 18 tests, 0 failures.
- Final `pnpm verify` — PASS. All stages passed: build, bundle-budget, shared (166/166), server (1064/1064), web (1472/1472), deploy (110 passed, 1 skipped), and server-runner (14/14).
- `openspec validate fix-reviewed-power-reception-evidence --strict` — PASS; final tasks and verification were read back after update.
- D4 closeout evidence and the current-runtime limitation are recorded in `docs/reviews/2026-09-09-source-runtime-followup-review.md`.

The change remains active and uncommitted. No browser, live broker, deployment, or production acceptance is claimed.
