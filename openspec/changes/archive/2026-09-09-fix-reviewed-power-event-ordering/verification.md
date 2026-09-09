# Verification Record

## Apply baseline (2026-09-09)

- GitHub `main`: `26c5598e590c05d993833b3b890149657ede13ab`
- Local `HEAD`: `26c5598e590c05d993833b3b890149657ede13ab`
- Branch: `main` tracking `origin/main`
- F2 confirmed present: the reviewed-meter callback still uses an unconditional `live_metric_values` upsert after `ingestMappedMeterReading` reports `liveUpdated=true`.
- Existing unrelated WIP preserved: `apps/server/src/routes/meter-sources.ts`, `apps/server/src/routes/mqtt-guided-activation.test.ts`, `apps/server/src/services/guidedMqttMappingService.test.ts`, `apps/server/src/services/guidedMqttMappingService.ts`, `apps/server/src/services/sourceImpactService.ts`, `docs/reviews/2026-09-08-mqtt-runtime-safety-review.md`, and `openspec/changes/fix-guided-source-mutation-guards/`.

## Test and review evidence

### TDD regression

- RED: `rtk pnpm --filter @solar-display/server test src/mqtt/mqttPowerSelectorIngest.test.ts`
  - Result: **FAIL**, 6 passed / 1 failed.
  - `F2 a late reviewed power packet cannot rewind the production live measurement` observed the intended defect: the later-delivered 5 kW / 10:01 observation replaced the persisted 20 kW / 10:02 value, timestamp and raw payload.
- Unit-collision mutation check: temporarily removed unit equality from the replay decision and reran the callback suite.
  - Result: **FAIL**, 12 passed / 1 failed.
  - `reviewed power equal instants preserve the row and diagnose a value conflict` rejected the mutation because the same value with `W` instead of persisted `kW` was no longer diagnosed as a conflict. The correct comparison was restored.
- Additional regression mutation checks all failed for the intended reason and were restored before final verification:
  - bypassing invalid timestamp admission wrote an invalid live row;
  - bypassing E1 exact-replay dedupe reached the uniqueness failure path;
  - forcing a late E1 event to advance the baseline rewound persisted energy state;
  - removing the legacy indexed `value_path` left the array mapping without a live value.

### Focused verification

- `rtk pnpm --filter @solar-display/server test src/mqtt/mqttPowerSelectorIngest.test.ts src/services/mqttMeterIngest.test.ts`
  - Result on the final split layout: **PASS**, 16/16 tests.
- `rtk pnpm --filter @solar-display/server test src/mqtt/mqttReviewedPowerOrdering.test.ts src/mqtt/mqttPowerSelectorIngest.test.ts src/services/mqttMeterIngest.test.ts src/services/meterReadingService.test.ts src/mqtt/metricKeyIngestion.test.ts src/mqtt/MqttClientService.test.ts`
  - Result on the split final test layout: **PASS**, 69/69 tests.
  - New callback regressions cover F2 late arrival, equal-instant replay/value and unit conflicts, equivalent offsets, destination isolation, restart/source revision, receive-time estimation and unsafe evidence rejection, invalid/zone-less persisted timestamps, dependent-derived non-recalculation, reviewed energy, and legacy scalar/tag behavior.

### Two-axis review

- Standards review found one P2 duplicated-source-lookup smell: `MqttClientService` queried `meter_sources` again after `ingestMappedMeterReading` had already resolved the reviewed source. The ingest result now carries the internal `measurementKind`, and the callback reuses it without a second query or public API change.
- P2 TDD check: adding the result-contract assertion first produced **FAIL**, 8/9 passed; after the refactor the focused `mqttMeterIngest.test.ts` target produced **PASS**, 9/9.
- Standards follow-up: **PASS**, no remaining findings after removing the duplicate lookup, splitting the callback ordering suite, removing the unused database override and deriving the logger test type from `MqttClientServiceOptions`.
- Spec follow-up: source behavior and callback coverage satisfy the reviewed ordering contract; the final 69-test command above includes the dedicated ordering suite plus energy and legacy compatibility regressions.

### Review and delivery gate

- Standards review: **PASS**, no remaining findings.
- Spec review: **PASS**, no remaining findings or scope creep.
- Audit discipline: no public API/configuration changes; ordering is keyed by persisted destination, invalid evidence remains rejected, and diagnostics omit raw payloads and credentials.
- `rtk pnpm verify`
  - Result: **PASS**; build, bundle-budget, shared, server, web, deploy and server-runner stages all passed.
  - Deploy tests reported 110 passed / 1 skipped / 0 failed; the skipped real-`flock` witness is an existing platform-gated test, not a failure.
- `rtk openspec validate fix-reviewed-power-event-ordering --strict`
  - Result: **PASS** — `Change 'fix-reviewed-power-event-ordering' is valid`.
- Browser, live broker, deployment and field acceptance: **NOT RUN**; this change used fake MQTT clients and temporary SQLite databases and does not claim those external witnesses.

### Final scope check

- `rtk git diff --check`: **PASS**.
- Implementation/test scope:
  - `apps/server/src/mqtt/MqttClientService.ts`
  - `apps/server/src/mqtt/reviewedPowerObservationOrdering.ts`
  - `apps/server/src/mqtt/mqttPowerIngest.test-support.ts`
  - `apps/server/src/mqtt/mqttReviewedPowerOrdering.test.ts`
  - `apps/server/src/mqtt/mqttPowerSelectorIngest.test.ts`
  - `apps/server/src/services/mqttMeterIngest.ts`
  - `apps/server/src/services/mqttMeterIngest.test.ts`
- Change artifacts are limited to `openspec/changes/fix-reviewed-power-event-ordering/` (`.openspec.yaml`, proposal, design, delta spec, tasks and this verification record).
- No schema/migration, production database, web/shared, package, deployment or runtime configuration files were changed for this change.
- The pre-existing guided-source mutation WIP listed in the baseline remains outside this change. Its tracked and untracked files are still present and were not reverted, staged or attributed to this change's Spectra touched-file cache.
- Archive and commit were not performed. Per repo workflow, archive is the next separate action; any later commit requires explicit user confirmation and exact-file staging.
