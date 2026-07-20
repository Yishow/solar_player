## ADDED Requirements

### Requirement: Align playback settings and image management as the low-risk settings batch

The implementation SHALL align `/settings/playback` and `/settings/images` as the low-risk settings batch.

#### Scenario: The first management settings batch starts

- **WHEN** this management batch begins
- **THEN** it is limited to `/settings/playback` and `/settings/images`
- **AND** `/settings/mqtt` and `/settings/circuits` remain out of scope

##### Example:

- **GIVEN** the shell foundation and playback batches already exist
- **WHEN** this change is applied
- **THEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/07-playback-settings.html` maps to `/settings/playback` and `docs/reference/kuozui-green-fhd-html-prototype/html-pages/08-image-management.html` maps to `/settings/images`
- **AND** the change does not include MQTT topic mapping or circuit CRUD

### Requirement: Preserve playback scheduling and image-management interactions

The implementation SHALL preserve playback scheduling, page reordering, enable toggles, image-state readability, and current operation semantics.

#### Scenario: The operator saves settings or reviews image rows

- **WHEN** the operator edits playback settings or reviews image-management state
- **THEN** the route keeps the existing save and list semantics
- **AND** the new layout does not reduce action visibility or row readability

##### Example:

- **GIVEN** the operator reorders playback pages and opens the image-management page
- **WHEN** the updated routes are used
- **THEN** the reorder/save behavior still works and image rows remain readable at FHD scale
- **AND** the UI still presents success or failure feedback in a usable way
