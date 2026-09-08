## ADDED Requirements

### Requirement: Daily history overlays preserve requested range semantics

Adding canonical consumption data to a daily-summary response SHALL preserve the requested day, week, month, year or total range, its established date-selection semantics, and non-consumption fields. A current-month consumption curve SHALL NOT replace every range with the current month's date keys. Site scope SHALL continue to come from the authorized request context. Missing consumption evidence SHALL remain null rather than an unrelated value or a fabricated zero.

#### Scenario: R7 year includes an earlier month
- **WHEN** a year-range request includes summary dates in January and September and the site has an active energy profile
- **THEN** the response retains the eligible January and September records and their generation, carbon and other summary fields instead of returning only September

#### Scenario: R7 day and week remain bounded
- **WHEN** day and week requests are made at a month boundary with an active profile
- **THEN** their date sets follow the requested ranges, including eligible previous-month dates for the week, without adding an entire current month

#### Scenario: R7 month and total remain compatible
- **WHEN** month and total responses are compared before and after enabling a structurally valid profile
- **THEN** enabling the profile does not truncate either requested range or remove non-consumption data; consumption additions identify missing evidence honestly
