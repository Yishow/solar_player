## 1. Scoped contracts and database migration

- [x] 1.1 Add shared `MetricScope = "cl" | "kn" | "global"` and scoped metric identity/snapshot DTOs while keeping Device `SiteScope = "cl" | "kn"`; add shared tests proving `global` is a data scope only and that identical semantic keys can coexist under CL and KN.
- [x] 1.2 Add red migration tests that start from representative legacy CL-only, KN-only, and mixed repository-known schemas/data and assert scoped keys for `topic_mappings`, `live_metric_values`, `metric_snapshots`, `daily_energy_summaries`, `cumulative_counters`, and `display_value_overrides`; verify ambiguous unscoped site data fails without explicit legacy scope.
- [x] 1.3 Implement the scope-aware SQLite migration and explicit repository-owned legacy alias map, including composite keys/indexes and the explicit legacy-site migration/import input; make task 1.2 green and verify migrated row counts, timestamps, quality/raw payload, override values, and indexes are preserved.
- [x] 1.4 Normalize repository-owned seed/migration metric keys so CL and KN share semantic keys and scope carries factory identity, including Factory Circuit and `factoryGeneration` aliases; verify migration/seed tests contain no newly seeded `guanyin`, `jungli`, `.cl.`, or `.kn.` site encoding used solely for uniqueness.

## 2. Scoped ingestion and resolver seam

- [x] 2.1 Extend MQTT topic mapping persistence and management validation with explicit `metricScope`, enforce one active `(metricScope, metricKey)` mapping, and verify route/service tests reject ambiguous site-dependent mappings while allowing CL and KN to use the same semantic key.
- [x] 2.2 Update MQTT ingestion/upsert so one subscribed topic can resolve all enabled scoped mappings and writes composite live identities without collisions; add a dual-site ingestion regression proving CL and KN `realTimePower` updates remain independent and existing value-path/transform behavior is unchanged.
- [x] 2.3 Introduce the server `MetricResolver`/scoped runtime seam for scoped live reads, freshness decoration, scoped provenance, explicit-global lookup, and scope-aware display overrides; add service tests proving there is no automatic CL→KN or site→global fallback.
- [x] 2.4 Migrate display override persistence/service and card diagnostics to `(metricScope, targetId)` resolution; verify separate CL and KN overrides can coexist for the same shared Overview target and clearing one does not affect the other.

## 3. Scoped history and aggregation

- [x] 3.1 Migrate snapshot writers/readers, MetricsAccumulator, DailySummary baselines, cumulative counters, restart restoration, and retention queries to explicit metric scope; verify same-day CL/KN histories accumulate independently and restore independently before a new MQTT message.
- [x] 3.2 Add scope to monitoring-history refresh events and consumers; verify a CL write identifies `cl`, KN-only consumers do not refetch solely for that event, and explicitly global history changes identify `global`.
- [x] 3.3 Update multi-factory generation aggregation to read explicit CL and KN source identities and persist the canonical complete-both-sites result under `global`; verify stale/missing KN cannot be satisfied by CL and the last complete global value behavior remains intact.

## 4. Trusted playback delivery

- [x] 4.1 Require Display Client Context for formal playback live-metric bootstrap and route all story/readiness/history/trend reads through the scoped resolver; add route tests proving client query/header scope claims are ignored and a CL response contains no KN site metrics.
- [x] 4.2 Replace global identified `liveMetrics:update` broadcast with authoritative inherited site-room routing (`site:cl` / `site:kn`) plus explicit global delivery, while preserving a least-data per-device/fine-grained delivery seam for later trusted cross-site bindings; test simultaneous CL/KN sockets, targeted device delivery that does not expose unrelated foreign-site metrics, context revision/reconnect, room changes, and fresh scoped bootstrap so stale other-site readings cannot survive reconnect.
- [x] 4.3 Update the web live metrics bootstrap/store contract to consume an already-scoped server snapshot while preserving selector-based render isolation; verify unrelated metric updates still avoid unnecessary renders and no client-side filter is required for site security.

## 5. Story and page consumers

- [x] 5.1 Refactor Display Story monitoring resolution so value, freshness, provenance, fallback, trend references, and override all come from one scoped resolver context; remove obsolete global-snapshot site projection branches and verify CL/KN story tests cover missing/stale values without cross-site fallback.
- [x] 5.2 Update Overview runtime trend resolution to read the same effective site as the displayed KPI; add tests where one site has valid current-day trend data and the other is empty, proving the empty site does not reuse the other trend.
- [x] 5.3 Update Factory Circuit slot resolution and card diagnostics so page instances/layout rules remain distinct while CL and KN use shared semantic slot metric keys plus scope; make existing Factory Circuit route/story/diagnostic tests pass without page/site names being required for metric uniqueness.

## 6. Verification and rollout safety

- [x] 6.1 Run the affected server/shared/web suites for MQTT settings/ingestion, live metrics, Display Story, Device Context, Socket.IO, history/retention/aggregation, Factory Circuit, card diagnostics, and Overview/Solar view models; fix all scoped-contract regressions and record the exact passing commands in the change notes or task completion log.
- [x] 6.2 Run `git diff --check` and `pnpm verify`; confirm no Pi MQTT selection, multi-broker abstraction, Go collector work, or page-local FHD visual hardcode entered the change, and produce migration/rollback operator notes stating that rollback requires restoring the pre-migration database with the previous binary.
