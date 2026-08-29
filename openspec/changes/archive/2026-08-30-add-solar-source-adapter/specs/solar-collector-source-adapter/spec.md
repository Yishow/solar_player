## Purpose

Defines the managed Solar collector source contract so Solar Player can consume standard CL/KN factory and zone MQTT data automatically, preserve source provenance, and expose scoped semantic metrics without requiring per-topic manual mappings.

## ADDED Requirements

### Requirement: The Solar adapter consumes the standard factory summary contract

Solar Player SHALL consume retained messages matching `solar/{SITE}/summary` for `SITE = CL | KN` through the existing central MQTT connection. A valid summary SHALL be projected into source-semantic scoped metrics without requiring generic topic-mapping rows.

The factory summary projection SHALL expose the following semantic source metrics in the matching `cl` or `kn` metric scope:

- `factoryGeneration.powerKw` from `total_power_kw`, unit `kW`.
- `factoryGeneration.todayMwh` from `today_mwh`, unit `MWh`.
- `factoryGeneration.monthMwh` from `month_mwh`, unit `MWh`.
- `factoryGeneration.totalMwh` from `total_mwh`, unit `MWh` when the field is present.

#### Scenario: Retained CL summary arrives after server startup
- **WHEN** the central broker delivers a retained `solar/CL/summary` message with finite summary fields and a valid source timestamp
- **THEN** the adapter writes the corresponding source metrics under `metricScope = cl`
- **AND** each reading records `solar/CL/summary` as source provenance
- **AND** no manual generic mapping is required for those metrics

#### Scenario: KN summary omits an incomplete cumulative total
- **WHEN** `solar/KN/summary` contains valid power/daily/monthly fields but omits `total_mwh`
- **THEN** the adapter updates the valid KN source metrics
- **AND** it does not overwrite the last valid `kn/factoryGeneration.totalMwh` with a fabricated zero or null reading

### Requirement: Topic site and payload site must agree

The adapter SHALL normalize topic site `CL` to `cl` and `KN` to `kn`. When a Solar payload contains a `factory` field, that field MUST agree with the topic site after normalization; unknown sites or mismatched site identity MUST be rejected from canonical ingestion.

#### Scenario: Payload factory disagrees with the topic
- **WHEN** a message arrives on `solar/CL/summary` with payload field `factory = KN`
- **THEN** the adapter rejects the message as a source-contract error
- **AND** no CL or KN canonical source metric is updated from that payload

#### Scenario: Unknown site appears under the Solar prefix
- **WHEN** a message arrives on `solar/XX/summary`
- **THEN** the adapter does not infer CL or KN
- **AND** diagnostics identify the unsupported site/topic

### Requirement: Source timestamps govern Solar freshness

A canonical Solar summary or zone payload SHALL contain a valid source timestamp. The adapter SHALL preserve that source timestamp for metric freshness rather than replacing it with broker receipt time. Invalid or missing required timestamps SHALL leave the last valid reading unchanged and surface a diagnosable source error.

#### Scenario: Delayed retained summary is received
- **WHEN** a retained summary is received now but its valid source timestamp is older than the configured freshness threshold
- **THEN** the projected readings keep the older source timestamp
- **AND** downstream freshness can classify them as stale

#### Scenario: Summary timestamp cannot be parsed
- **WHEN** a summary contains finite values but an invalid timestamp
- **THEN** the adapter does not publish those values as fresh canonical readings
- **AND** the previous valid readings remain available with their original timestamps

### Requirement: The Solar adapter discovers zones from whole-zone payloads

Solar Player SHALL consume `solar/{SITE}/zone/{zoneId}` whole-zone payloads and dynamically expose zone metadata and scoped zone metrics without requiring preconfigured zone ids. For a valid numeric/string-stable `zoneId`, the canonical zone metric family SHALL use site-independent keys derived from that zone id:

- `solarZone.{zoneId}.powerKw` from `power_kw`, unit `kW`.
- `solarZone.{zoneId}.todayKwh` from `today_kwh`, unit `kWh`.
- `solarZone.{zoneId}.monthMwh` from `month_mwh`, unit `MWh`.
- `solarZone.{zoneId}.totalMwh` from `total_mwh`, unit `MWh`.
- `solarZone.{zoneId}.capacityKwp` from `capacity_kwp`, unit `kWp`.
- `solarZone.{zoneId}.todayHours` from `today_hours`, unit `h`.

The adapter SHALL retain available zone name/metadata for management discovery separately from the metric key.

#### Scenario: Same zone id exists at both sites
- **WHEN** CL and KN both publish a valid `zone/12` payload
- **THEN** both sites MAY use semantic key `solarZone.12.powerKw`
- **AND** the readings remain distinct because one has scope `cl` and the other has scope `kn`

#### Scenario: A new zone appears without configuration
- **WHEN** a valid retained `solar/CL/zone/27` payload is first observed
- **THEN** the adapter exposes zone 27 metadata and its valid metrics under CL scope
- **AND** an operator is not required to create six exact MQTT mappings before the zone can be diagnosed or selected later

### Requirement: Whole payloads are the canonical Solar ingest path

For standard Solar data, factory-level canonical source metrics SHALL be derived from `summary` and zone-level canonical source metrics SHALL be derived from whole `zone/{zoneId}` payloads. Scalar compatibility topics such as `solar/{SITE}/today_mwh` or `solar/{SITE}/zone/{zoneId}/power_kw` MUST NOT compete with or overwrite the adapter-managed canonical readings.

#### Scenario: Scalar topic publishes after summary
- **WHEN** a scalar `solar/CL/today_mwh` message arrives after a valid `solar/CL/summary`
- **THEN** the adapter-managed `cl/factoryGeneration.todayMwh` reading remains sourced from the summary payload
- **AND** the scalar message does not create a competing canonical writer

### Requirement: Generic mappings cannot compete with adapter-managed metric identities

When the Solar adapter manages a canonical metric identity, generic MQTT mappings MUST NOT be enabled to write that same `(metricScope, metricKey)` identity. Generic mappings MAY continue to manage non-standard Solar topics or unrelated MQTT sources using other metric identities.

#### Scenario: Operator maps a custom topic to an adapter-owned metric
- **WHEN** an operator attempts to enable a generic CL mapping whose metric key is `factoryGeneration.todayMwh` while the Solar adapter owns that CL identity
- **THEN** the system rejects the competing mapping with a stable validation error
- **AND** the adapter remains the sole canonical source for that identity

### Requirement: Solar source health is diagnosable without becoming a playback metric

The adapter SHALL observe standard `solar/{SITE}/status`, `solar/{SITE}/heartbeat`, and source-contract errors for management diagnostics. Collector health metadata SHALL remain source diagnostics and MUST NOT be injected as numeric playback metrics unless a separate metric contract explicitly defines one.

#### Scenario: KN heartbeat stops while its last summary remains stored
- **WHEN** the last KN heartbeat exceeds the configured health interval
- **THEN** management diagnostics can identify the KN Solar source as unhealthy or stale
- **AND** stored metric freshness continues to be determined by each reading's source timestamp
