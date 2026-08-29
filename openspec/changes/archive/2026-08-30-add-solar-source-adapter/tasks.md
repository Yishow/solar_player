## 1. Adapter contract and MQTT dispatch

- [x] 1.1 Add red parser/contract tests using representative CL/KN retained summary, incomplete `total_mwh`, whole-zone, status, heartbeat, mismatched `factory`, unknown site, invalid timestamp, and stale retained payload fixtures; verify tests fail before adapter implementation and assert exact semantic keys/units/source timestamps from the specs.
- [x] 1.2 Add a managed-source adapter dispatch interface to the existing MQTT client so adapter wildcard filters and generic exact mappings share one broker connection and reconnect lifecycle; verify tests prove reconnect subscribes `solar/+/summary`, `solar/+/zone/+`, `solar/+/status`, `solar/+/heartbeat`, and `solar/+/alert` without creating a second MQTT client.

## 2. Solar summary and zone ingestion

- [x] 2.1 Implement Solar topic/site/payload validation and summary projection to scoped `factoryGeneration.powerKw`, `factoryGeneration.todayMwh`, `factoryGeneration.monthMwh`, and optional `factoryGeneration.totalMwh`; verify MWh/kW units and payload source timestamps are preserved and malformed payloads leave last-good values unchanged.
- [x] 2.2 Implement dynamic whole-zone discovery and projection for `solarZone.{zoneId}.powerKw|todayKwh|monthMwh|totalMwh|capacityKwp|todayHours`, including mutable zone display metadata; verify the same zone id can coexist under CL and KN scopes and a newly observed zone requires no generic mapping rows.
- [x] 2.3 Add Solar adapter source-health diagnostics for retained status, heartbeat liveness, alert/parse errors, last-good summary timestamp, and discovered-zone count; verify these diagnostics do not create numeric playback metrics.

## 3. Canonical source ownership and aggregation

- [x] 3.1 Reserve adapter-owned `factoryGeneration.*` and `solarZone.*` identities for CL/KN and update generic mapping validation to reject competing enabled mappings while allowing unrelated/custom topics; verify settings route/service tests return a stable conflict error.
- [x] 3.2 Migrate multi-factory generation aggregation to the adapter-managed CL/KN MWh source identities and keep complete-both-sites, older-source timestamp, stale-source, cumulative-regression, and last-complete global rules green in `factoryGenerationAggregateService` tests.
- [x] 3.3 Remove or disable repository-seeded generic CL/KN summary mappings that duplicate adapter ownership only after task 3.2 is green; verify database migration/seed tests no longer require those rows and scalar compatibility topics cannot overwrite adapter readings.

## 4. Diagnostics and verification

- [x] 4.1 Expose a trusted management DTO/service/API for Solar source and zone discovery suitable for the later Data Hub, including scope, source topic, source timestamp, health, zone metadata, and adapter ownership; verify management authorization and CL/KN diagnostic separation in route tests.
- [x] 4.2 Run affected MQTT, settings, aggregation, readiness, Display Story, and source-diagnostics tests plus `git diff --check` and `pnpm verify`; confirm no `solar_mqtt` Python files, Go collector code, second broker connection, Pi MQTT behavior, or Data Hub visual redesign is included in this change.
