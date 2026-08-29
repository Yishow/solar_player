## ADDED Requirements

### Requirement: Overview runtime trend uses the same effective site scope as its KPI

An Overview KPI trend series SHALL be read from the same effective metric scope as the KPI value it accompanies. A site-specific Overview MUST NOT display a trend assembled from another site or from a global aggregate unless that KPI binding explicitly targets global data.

#### Scenario: CL Overview renders generation power and trend
- **WHEN** a CL display renders a generation KPI with a runtime trend series
- **THEN** both the current KPI value and every trend point are resolved from CL-scoped monitoring data
- **AND** KN or global generation points are excluded from that CL trend

#### Scenario: Selected site has no current-day trend
- **WHEN** KN has no current-day trend points but CL has valid points
- **THEN** the KN Overview uses the existing empty or degraded trend presentation
- **AND** it SHALL NOT reuse the CL trend as a fallback
