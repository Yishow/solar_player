## ADDED Requirements

### Requirement: Long-range history stays computable as evidence accumulates

Resolving consumption for a set of dates SHALL NOT cost work proportional to the number of dates multiplied by the site's whole accepted-sample history. A request that covers a long span SHALL remain answerable on a site whose accepted readings have accumulated over years, without the response time growing with that accumulation for every date it reports.

Making the calculation cheaper SHALL NOT change what it reports. For the same site, evidence, profile and as-of instant, every resolved value, quality, issue, boundary record and coverage figure SHALL be identical to the result the same inputs produced before, including for rollover, interval-energy, source-replacement, epoch-change and receive-time-estimated evidence.

#### Scenario: Adding dates does not re-read the whole history for each one

- **GIVEN** a site whose accepted readings span years and a request covering a year of dates
- **WHEN** the daily consumption points are resolved
- **THEN** the sample-level work grows with the evidence each date's own window contains, not with the whole history once per date

#### Scenario: Cheaper resolution reports exactly what it reported before

- **GIVEN** any set of accepted samples, meters, profile and as-of instant
- **WHEN** a day, month, year, week or accounting-span result is resolved
- **THEN** its value, quality, issues, boundary records, sample identifiers and coverage match the result the same inputs produced before the change

#### Scenario: Window boundaries keep their half-open meaning

- **GIVEN** samples that fall exactly on a window's start instant, exactly on its end instant, and one millisecond either side of each
- **WHEN** the window is resolved
- **THEN** the sample on the start instant is inside the window, the sample on the end instant is not, and the reported opening and closing evidence is unchanged
