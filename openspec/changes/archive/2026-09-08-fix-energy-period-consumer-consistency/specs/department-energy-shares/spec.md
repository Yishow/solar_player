## ADDED Requirements

### Requirement: Persisted share calculations use one effective period context

All department numerators and their common denominator SHALL use the same server-resolved effective profile revision, calendar window and as-of instant as the corresponding site period calculation. Selecting the latest active profile SHALL NOT bypass effective-date boundaries or reinterpret closed historical membership. Unproven cross-revision periods SHALL expose partial or unavailable shares and a named boundary reason, not exact percentages. Upstream quality and freshness SHALL survive aggregation.

#### Scenario: R5 membership changes during the requested month
- **WHEN** a site's accounting membership changes midway through a requested month and no reviewed continuity calculation covers both segments
- **THEN** site consumption and department shares identify the profile boundary, do not claim an exact full-month ratio, and retain the relevant revisions and effective dates

#### Scenario: R5 closed month retains historical membership
- **WHEN** a closed month is requested after a later profile assigns different department meters
- **THEN** the share result uses the profile effective for that closed period rather than reclassifying its readings using today's active profile

### Requirement: Custom denominator-only channels participate in period resolution

Share calculation SHALL resolve every required channel from the selected denominator, including channels belonging to neither the site-total set nor a department. Missing denominator evidence SHALL remain explicit and SHALL NOT trigger a fallback to another denominator. Shared channels SHALL be resolved once without changing numerator or denominator membership.

#### Scenario: R6 independent meter-set denominator
- **WHEN** the selected period has site total A=1000 kWh, department B=100 kWh and the explicit custom denominator C=400 kWh, with C used nowhere else
- **THEN** B's ratio is 25 percent using C, while the site total remains 1000 kWh

#### Scenario: R6 custom denominator lacks its baseline
- **WHEN** C is selected as the denominator but its period delta cannot be established
- **THEN** the ratio is null with the missing-evidence reason, not 10 percent from A and not a department-sum fallback
