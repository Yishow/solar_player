## ADDED Requirements

### Requirement: Create the 14-page prototype-to-runtime baseline mapping

The implementation SHALL create a baseline mapping for prototype pages `01-14` before downstream visual migration batches begin.

#### Scenario: An implementer checks downstream batch prerequisites

- **WHEN** an implementer prepares a later playback or management batch
- **THEN** they can find the prototype page, runtime route, page file, and major runtime data source for every page in `01-14`
- **AND** no page is left implicit or grouped under an unspecified placeholder

##### Example:

- **GIVEN** the implementer is preparing the MQTT settings batch
- **WHEN** they read the baseline mapping
- **THEN** they can trace `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html` to `/settings/mqtt` and `apps/web/src/pages/MqttSettings/index.tsx`
- **AND** they can see the major runtime data sources before editing the page

### Requirement: Classify mapping rows as runtime-bound, reference-only, or fallback-only

The implementation SHALL classify mapped regions so prototype sample values do not become accidental runtime requirements.

#### Scenario: A prototype region contains sample content

- **WHEN** a prototype region contains sample values, sample assets, or temporary copy
- **THEN** the mapping marks that region as runtime-bound, reference-only, or fallback-only
- **AND** downstream batches inherit that classification instead of guessing it again

##### Example:

- **GIVEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html` contains a sample media frame and `docs/reference/kuozui-green-fhd-html-prototype/html-pages/01-overview.html` contains sample KPI numbers
- **WHEN** the baseline mapping is written
- **THEN** those regions are classified explicitly
- **AND** later batches do not treat the sample content as a required backend contract

### Requirement: Publish the downstream verification matrix

The implementation SHALL publish the phase verification matrix that downstream batches must follow.

#### Scenario: A downstream batch is planned

- **WHEN** a later batch is selected for implementation
- **THEN** the artifacts identify the required build, test, and manual verification targets for that batch
- **AND** the batch can be gated on concrete evidence rather than ad hoc review

##### Example:

- **GIVEN** the monitoring pages batch will be implemented later
- **WHEN** the implementer checks the matrix
- **THEN** they find the required web tests, server tests, route walkthrough, and screenshot expectations for that batch
- **AND** they do not need to rediscover those verification targets from scratch
