## Context

See `proposal.md` for motivation. The existing server has one MQTT client and already subscribes all enabled exact topic mappings, but `topic_mappings` is unique by `metric_key`, `live_metric_values` is keyed only by `metric_key`, monitoring history is not site-partitioned, Socket.IO broadcasts one global live snapshot to identified clients, and display overrides do not include site scope. Device/Group/Playback already has a trusted `SiteScope = cl | kn`; that existing identity path is the correct playback boundary and must be reused rather than adding MQTT selection to Pi clients.

The current code also contains mixed site naming conventions (`cl`/`kn`, `jungli`/`guanyin`, and site names embedded in metric keys). The target architecture must normalize runtime identity without forcing CL and KN Factory Circuit page instances to share one visual layout.

## Goals / Non-Goals

**Goals:**

- Make metric scope a first-class data dimension across ingestion, live storage, history, story/readiness, overrides, REST, and Socket.IO.
- Preserve one Solar Player server and one central Mosquitto connection; no per-site application server or per-Pi MQTT client.
- Create a deep `Scoped Metric Runtime` seam that hides site selection, semantic metric lookup, freshness, provenance, history, and override resolution from pages.
- Preserve trusted Device → Group → SiteScope → Playback Profile as the formal playback authority.
- Keep semantic metric names independent of site and migrate repository-known legacy names deterministically.
- Keep playback page geometry and FHD visual layout unchanged unless a later editor capability change explicitly modifies it.

**Non-Goals:**

- No Python→Go collector implementation.
- No multi-broker manager or Mosquitto bridge; the deployment uses one local central broker.
- No Pi MQTT subscription/topic-selection UI.
- No arbitrary Data Profile abstraction in this change.
- No Formula Builder or authorable Widget Data Binding; those are separate changes.
- No forced merge of `factory-circuit` and `factory-circuit-guanyin` page instances.

## Decisions

### Separate device SiteScope from data MetricScope

Keep `SiteScope = "cl" | "kn"` for Device/Group identity and add `MetricScope = SiteScope | "global"` for data. `global` is an explicit stored value, not `NULL` and not an implicit fallback.

This avoids expanding Device identity with a meaningless `global` device site while still allowing canonical CL+KN aggregates and other truly global data. Alternative: reuse `SiteScope` and encode global in metric keys. Rejected because that recreates the same identity leak this change removes.

### Use `(metric_scope, metric_key)` as the authoritative metric identity

The persistence model will be migrated so site-dependent source mappings and runtime values use the composite identity. One active mapping per `(metric_scope, metric_key)` remains the default invariant; multiple raw topics may still feed different semantic metrics from the same payload via `value_path`.

Target schema shape:

```text
topic_mappings
  id
  metric_scope       cl | kn | global
  metric_key
  topic
  unit / value_path / transform / enabled
  UNIQUE(metric_scope, metric_key)

live_metric_values
  metric_scope
  metric_key
  value / unit / timestamp / quality / raw_payload
  PRIMARY KEY(metric_scope, metric_key)

metric_snapshots
  id
  metric_scope
  ... existing snapshot values ...
  captured_at
  INDEX(metric_scope, captured_at)

daily_energy_summaries
  metric_scope
  date
  ... totals ...
  PRIMARY KEY(metric_scope, date)

cumulative_counters
  metric_scope
  metric_key
  total_value / last_updated / reset_count
  PRIMARY KEY(metric_scope, metric_key)

display_value_overrides
  metric_scope
  target_id
  ... existing target/value fields ...
  UNIQUE(metric_scope, target_id)
```

Alternative: keep global metric keys and prefix them with site. Rejected because page contracts, formulas, diagnostics, and future widgets would all need to understand naming conventions instead of one typed dimension.

### Put one MetricResolver between persistence and playback/story consumers

Introduce a shared server-side resolver contract conceptually equivalent to:

```text
resolveMetric({ metricKey, scope })
resolveSnapshot({ siteScope, metricKeys, includeGlobal })
resolveHistory({ scope, range })
```

The resolver owns scoped lookup, freshness decoration, provenance lookup, and display override application. Display Story, live bootstrap, readiness/history helpers, and management diagnostics consume it rather than reading `live_metric_values` independently.

This is intentionally a deep architectural seam. Deletion test: removing it would break trusted site resolution, scoped story values, scoped freshness/provenance, history selection, and override isolation. It must not become a thin pass-through wrapper around old global helpers.

Alternative: add `siteScope` conditionals in each page/service. Rejected because the current special-case `projectSiteGenerationSnapshot` path already demonstrates how value, freshness, and provenance can diverge.

### Formal playback scope comes only from Display Client Context

`/api/metrics/live`, page-scoped story routes, playback history/trend reads, and Socket.IO playback sessions use the authenticated Device Context as the default scope authority. Client-provided `site`, `scope`, headers, or local state are ignored. A later trusted server-authored published page binding may explicitly request a different metric scope for a specific value; that is configuration authority held by the server, not authority delegated to the Pi.

Management APIs may accept an explicit scope selector only after management authorization. Management “all” is a query/view mode, not a stored `MetricScope` value.

Alternative: let Pi choose CL/KN or MQTT topics at startup. Rejected because it leaks infrastructure into the playback client and weakens the existing trusted pairing model.

### Route live updates by site rooms, not global identified broadcast

On Socket.IO connection, an authenticated playback session joins exactly one inherited `site:cl` or `site:kn` room derived from its Device Context. Site metric changes are emitted to that room by default. Explicit `global` metric changes may be emitted to both site rooms when those metrics are part of the playback contract. The delivery layer SHALL retain a narrow extension point for future trusted cross-site widget bindings: such a session can receive the specifically bound foreign-scope metric through a per-device or fine-grained metric subscription, but it must not join the other site's full room solely because one binding crosses scope. Management sessions remain on their existing authorized management channel and may receive broader diagnostics.

The client live store remains selector-based for render performance, but selector isolation is not relied on for security or site separation.

Alternative: broadcast a multi-scope snapshot and filter in React. Rejected because it exposes the other site's data and allows stale/incorrect merge behavior.

### Story value, freshness, provenance, trend, and override share one resolved scope

`displayStoryService` and related readers stop constructing a global snapshot then deleting/re-adding a subset for a site. They request the scoped snapshot once, and all derived story facets use that same context. Topic/provenance maps are keyed by scope plus semantic key. A global dependency stays labeled `global`.

This removes the current failure mode where a site-scoped story value can be paired with freshness from the global live snapshot.

### History is scoped at storage time, not filtered after aggregation

Snapshot writers, cumulative accumulator, Daily Summary baselines, restart restoration, retention reads, and history refresh events become scope-aware. CL and KN rows are stored separately when written. Global aggregate history is written explicitly under `global` when the aggregate is produced.

Filtering only at read time is rejected because current `daily_energy_summaries` and `cumulative_counters` can already collapse two sites into one row before a reader has a chance to filter.

### Normalize known site-encoded metric keys with an explicit migration map

Use a repository-owned migration mapping for known legacy keys, for example:

```text
factoryCircuit.guanyin.stampingPower -> (kn, factoryCircuit.stampingPower)
factoryStampingPower                 -> (cl, factoryCircuit.stampingPower)
factoryGeneration.cl.todayMwh        -> (cl, factoryGeneration.todayMwh)
factoryGeneration.kn.todayMwh        -> (kn, factoryGeneration.todayMwh)
```

Equivalent mappings cover the remaining known Factory Circuit and factory-generation keys. The migration code must enumerate these aliases; it must not parse arbitrary strings looking for words like `guanyin`.

For legacy site-dependent rows whose site cannot be determined from a repository-known alias, first-run migration/import requires an explicit legacy site input (for example a deployment/import option resolved before database migration). If ambiguous rows exist and no explicit legacy scope is available, migration fails with a diagnostic instead of defaulting to CL, KN, or global.

Fresh installations create the scoped schema directly and do not need legacy-site input. Importing the second old site database, if required operationally, must be performed with an explicit source site; automatic two-database merge is outside this change.

### Preserve page-instance routing while removing page identity from metric identity

`factory-circuit` remains the CL page instance and `factory-circuit-guanyin` remains the KN page instance for the current rollout because their visible slot/layout behavior differs. The page instance determines allowed slots and layout; Device SiteScope determines data scope; each slot maps to a shared semantic metric key.

This lets a future change unify templates without requiring another metric migration.

### Scope display overrides at resolution time

Persist overrides with `metric_scope` and match on `(metric_scope, target_id)`. The original source metric is never mutated. A CL override and a KN override for the same shared page/card can coexist. Global targets use global overrides.

Alternative: include site in `target_id`. Rejected because target IDs are presentation identity and should remain stable across data contexts.

## Risks / Trade-offs

- [Risk] SQLite table rebuild migrations affect several high-use tables → create migration tests from representative pre-change schemas/data and verify row counts, indexes, timestamps, and rollback backup guidance before rollout.
- [Risk] Ambiguous legacy unscoped rows can block migration → fail loudly with a list/count of ambiguous identities and require explicit legacy site input; never silently classify them.
- [Risk] Existing tests/fixtures assume `metric_key` alone is unique → introduce scoped test helpers first, then migrate suites systematically so passing tests cannot hide global reads.
- [Risk] Global aggregate values may accidentally become fallback for site metrics → resolver requires explicit scope selection; there is no automatic site→global fallback.
- [Risk] Socket room delivery can miss updates during context revision changes → reconnect/context refresh must leave the old room, join the new authoritative room, and perform a fresh scoped bootstrap before accepting deltas.
- [Risk] Management diagnostics become more verbose because the same semantic key appears twice → every management row includes scope and UI grouping is handled by the later Data Hub change.
- [Trade-off] Scope columns increase schema/query complexity → accepted because the alternative is semantic ambiguity and cross-site data corruption.

## Migration Plan

1. Add shared `MetricScope` types and scoped test fixtures without changing production reads.
2. Add a database migration that rebuilds affected tables with scope-aware keys/indexes and an explicit legacy mapping/input path. Validate migration on representative CL-only, KN-only, and mixed known-key databases.
3. Update MQTT mapping persistence/ingestion to write `(scope, metricKey)` and remove site names from repository-owned semantic key seeds.
4. Introduce the MetricResolver and migrate authoritative live snapshot reads, provenance/freshness decoration, display overrides, and formal playback REST reads to it.
5. Migrate history writers/readers, Daily Summary baselines, accumulators, retention queries, and refresh signals to scope-aware storage.
6. Change Socket.IO playback delivery to site rooms and update web bootstrap/store merge behavior to assume already-scoped snapshots.
7. Migrate Display Story/Overview trend/Factory Circuit consumers and remove obsolete page-local site projection branches and site-encoded key aliases once compatibility tests are green.
8. Run server/web focused tests, migration tests, browser smoke where applicable, `git diff --check`, and `pnpm verify`. FHD visual witness is required only if implementation changes visible geometry/styles; this data change must otherwise preserve published visual config.

Rollback requires restoring the pre-migration database backup and the previous application together; a scoped database is not backward-compatible with binaries that expect global `metric_key` primary keys.
