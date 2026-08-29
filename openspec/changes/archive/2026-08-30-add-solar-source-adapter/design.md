## Context

See `proposal.md` for motivation. The collector already publishes a stable multi-site MQTT hierarchy from one broker: factory summaries at `solar/{SITE}/summary`, whole-zone payloads at `solar/{SITE}/zone/{zoneId}`, scalar compatibility topics, and operational status/heartbeat topics. Solar Player currently models the factory summaries as generic exact topic mappings, so the known collector contract is duplicated in the database and dynamic zones are not naturally discoverable.

This design assumes `scope-live-metrics-by-site` has introduced `MetricScope`, scoped metric persistence, and the central MetricResolver. The adapter must reuse the existing single application MQTT connection rather than creating a second client or broker abstraction.

## Goals / Non-Goals

**Goals:**

- Treat the standard Solar collector hierarchy as a managed source with a typed parser and explicit metric projection.
- Use retained summary/zone whole payloads as the canonical ingest path and preserve source timestamps/provenance.
- Discover new zone ids at runtime without creating exact mapping rows for every zone metric.
- Keep generic topic mapping available for unrelated/custom MQTT sources while preventing competing writers for adapter-owned metric identities.
- Keep the collector language and implementation opaque to Solar Player.

**Non-Goals:**

- No collector Python or Go code changes.
- No second MQTT client, multi-broker manager, broker bridge, or Pi-side MQTT connection.
- No Data Hub visual redesign; this change only exposes source diagnostics/contracts needed by that later UI.
- No arbitrary wildcard mapping engine for generic operator mappings.
- No Formula Builder or Widget Data Binding.

## Decisions

### Register source adapters on the existing MQTT connection

Extend the MQTT layer with a small source-adapter dispatch seam. An adapter contributes MQTT subscription filters and receives messages that match its filters; generic `topic_mappings` continue to contribute exact topics and use the existing value-path/transform path.

Conceptually:

```text
MqttClientService
  subscriptions = generic exact topics ∪ managed adapter filters
  onMessage(topic, payload)
    -> matching managed adapter(s)
    -> matching generic exact mappings
```

The Solar adapter contributes at least:

```text
solar/+/summary
solar/+/zone/+
solar/+/status
solar/+/heartbeat
solar/+/alert
```

It intentionally does not subscribe to the scalar compatibility topic family for canonical metric ingestion. If another feature needs those scalar topics for diagnostics, it must not write adapter-owned canonical identities.

Alternative: create a separate Solar MQTT client. Rejected because the deployment has one broker and the application already has reconnection/subscription lifecycle logic; a second connection would duplicate broker status, credentials, reconnect behavior, and testing.

### Keep source-semantic metrics at collector units

The adapter projects whole-summary data to scoped source metrics:

```text
factoryGeneration.powerKw   <- total_power_kw : kW
factoryGeneration.todayMwh  <- today_mwh      : MWh
factoryGeneration.monthMwh  <- month_mwh      : MWh
factoryGeneration.totalMwh  <- total_mwh      : MWh
```

These are source-boundary metrics, not display-format values. Existing or later resolver/derived logic may expose `todayGeneration` in kWh or other presentation units, but it must derive that value explicitly. This separates the collector's wire contract from page formatting and prevents accidental double conversion.

Alternative: have the adapter write `todayGeneration` directly in kWh. Rejected because global aggregation currently uses MWh and the source's field/unit naming is already explicit; mixing source conversion with ingestion makes provenance harder to audit.

### Use scoped dynamic zone metric keys

A zone is a resource within a site, so the site remains the separate `MetricScope` and the stable zone id is allowed in the semantic resource key:

```text
cl / solarZone.12.powerKw
kn / solarZone.12.powerKw
```

Zone metadata (`zoneId`, display name, last observed fields/source topic) is held in an adapter-owned source catalog that management diagnostics can read. It is not encoded into page config automatically.

The whole-zone payload is parsed once and can update all finite fields atomically with one source timestamp. Missing/invalid individual optional fields do not become zero; the last valid value for that field remains until freshness marks it stale. Topic `zoneId` is authoritative for routing, and a payload `zone_id` must match when present.

Alternative: generate six generic mapping rows per zone. Rejected because zone ids are dynamic and this would recreate the manual mapping burden the adapter removes.

### Validate site and timestamp before canonical writes

The topic parser accepts only uppercase `CL` and `KN` in the standard collector hierarchy and normalizes them to `cl`/`kn`. If a payload contains `factory`, it must match the topic. Summary/zone payloads require a parseable source timestamp for canonical writes.

The source timestamp is stored as the metric timestamp. Broker receipt time is captured only as diagnostics if useful; it must not silently make a delayed retained payload look fresh.

Malformed JSON, unsupported site, mismatched factory/zone identity, invalid timestamp, or non-finite required values produce a structured adapter diagnostic and leave last-good canonical readings untouched.

### Make summary and whole-zone payloads the only adapter canonical writers

The adapter owns factory-generation source identities and `solarZone.*` identities. Repository-seeded generic mappings that currently read `solar/CL/summary` or `solar/KN/summary` into site-encoded factory keys are removed/disabled as part of rollout after the scoped migration exists.

Scalar topics remain a collector backward-compatibility surface, not a second Player ingest path. Generic mapping validation prevents an enabled mapping from claiming an identity reserved by an enabled managed adapter. For the first implementation, the Solar adapter reserves `factoryGeneration.*` and `solarZone.*` metric families for CL/KN scopes.

Alternative: allow last-writer-wins between adapter and generic mapping. Rejected because retained scalar and summary messages can arrive in nondeterministic order and produce inconsistent timestamps/provenance.

### Keep aggregate evaluation downstream of the adapter

The Solar adapter writes CL/KN source metrics only. The existing multi-factory aggregation domain consumes those scoped MWh metrics and remains responsible for complete-both-sites rules, stale handling, older-source timestamp selection, cumulative regression protection, and global canonical output.

This keeps source parsing independent from business aggregation and makes the later Derived Metric Registry migration straightforward.

### Track source health separately from numeric metrics

Status, heartbeat, alert, parse errors, last-good summary time, and discovered zone count are represented as adapter diagnostics/source state. They are not inserted into numeric `live_metric_values` unless a future explicit metric contract asks for them.

Source health can initially be held by the server adapter service and exposed through a management diagnostic DTO. `status` is retained by the collector, while heartbeat can refresh liveness after startup. Persistence of diagnostic history is not required by this change.

## Risks / Trade-offs

- [Risk] MQTT wildcard and generic exact subscriptions can both match one message → dispatch is explicit, and adapter-owned metric identities are reserved so a generic mapping cannot become a competing writer.
- [Risk] Retained messages with old source timestamps appear immediately on startup → preserve payload timestamp so freshness correctly reports stale instead of receipt-time fresh.
- [Risk] Collector payload evolves with new fields → ignore unknown fields, keep strict validation for known identity/timestamp/metric fields, and add fields only through a contract change.
- [Risk] Zone ids are reused or renamed → site + zone id remains technical identity; display name is mutable metadata, so renaming a zone does not create a new metric identity.
- [Risk] Removing seeded generic summary mappings breaks aggregate input → migrate aggregate readers and adapter in the same apply sequence, with regression tests comparing pre/post aggregate output before deleting obsolete mappings.
- [Trade-off] Managed Solar metrics are less freely remappable than generic sources → accepted because the collector is repository-controlled and predictable; custom/non-standard sources keep generic mappings.

## Migration Plan

1. Add adapter contracts/parser tests using captured representative CL/KN summary, incomplete cumulative summary, zone, status, heartbeat, mismatch, and stale retained fixtures.
2. Add the managed-adapter subscription/dispatch seam to the existing MQTT connection and verify reconnect re-subscribes both generic exact topics and Solar wildcard filters.
3. Implement Solar summary/zone projection and source diagnostics against the scoped metric persistence from the foundation change.
4. Migrate multi-factory aggregation to `cl|kn/factoryGeneration.*` source metrics and verify all existing completeness/regression rules remain green.
5. Remove or disable repository-seeded generic factory-generation mappings that duplicate adapter ownership; add validation preventing new competing mappings.
6. Expose adapter source/zone diagnostics through a management service/API suitable for the later Data Hub without changing the current playback UI.
7. Run focused MQTT/aggregation/readiness/story tests, `git diff --check`, and `pnpm verify`. No collector binary or Go source is modified by this change.

Rollback requires restoring the previous application version and, if adapter rollout removed seeded mapping rows, restoring those mapping rows from the pre-change database backup or rollback migration.
