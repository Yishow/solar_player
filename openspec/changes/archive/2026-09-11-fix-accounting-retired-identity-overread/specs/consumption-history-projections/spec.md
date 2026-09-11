## ADDED Requirements

### Requirement: Irrelevant retired identities do not expand calculation materialization

The accounting calculation evidence selector SHALL derive backward opening-anchor expansion from identities eligible to supply requested closing observations, including the latest eligible pre-span closing fallback and equal-instant ties. Historical identities that cannot affect requested closing, opening, or continuity evidence SHALL NOT widen the materialized calculation interval. The selector SHALL retain all intervening cross-identity evidence required by the full-load resolver, and SHALL preserve the separate projection-fingerprint selection contract. Calculation eligibility SHALL use accepted readings with a valid source instant or an explicitly receive-time-estimated instant. Candidate identities SHALL be the meterId/sourceRevision/epochId tuples from eligible rows in [fromMs, throughMs], union all eligible identities tied at each channel's greatest instant before fromMs. The selector SHALL NOT infer retirement from current source configuration or require a new retired field. Existing full-load fallback for untrustworthy bounds or unparseable evidence instants SHALL remain unchanged.

#### Scenario: Fixed September evidence excludes unrelated February growth

- **GIVEN** one channel contains a retired January identity, a current-identity August 31 opening reading of 100 kWh, and September readings of 150 and 175 kWh whose reference result is 75 kWh
- **WHEN** 10,000 and then 100,000 unrelated February readings are added without changing the requested September evidence closure
- **THEN** the bounded selector's materialized row identities and count SHALL remain unchanged from the no-growth fixture
- **AND** its complete calculation result SHALL deeply equal the full-load resolver result at each size
- **AND** the calculation path SHALL NOT fall back to loading the entire channel history

#### Scenario: Necessary old anchors and intervening identities remain available

- **GIVEN** a requested closing reading requires an old opening anchor and the interval between them contains meter replacements, source revisions, epochs, resets, or equal-instant ties
- **WHEN** bounded calculation evidence is selected
- **THEN** the required old anchor and all intervening evidence that affects continuity SHALL be retained
- **AND** the full result, including unavailable reasons and diagnostics, SHALL equal the full-load result
- **AND** the selector SHALL NOT substitute a fixed lookback duration, row limit, or current-configured-identity filter for that evidence

#### Scenario: Missing in-span observations preserve fallback diagnostics

- **WHEN** a requested span has no eligible in-span reading, or the channel has no readings
- **THEN** the selector SHALL preserve the full-load resolver's latest eligible pre-span closing fallback, ties, freshness, and unavailable behavior
- **AND** it SHALL NOT manufacture zero consumption

#### Scenario: Supported periods and time semantics remain equivalent

- **WHEN** day, month, year, week, total, or multi-date calculations use cumulative or interval-energy readings, late arrivals, receive-time-estimated readings, or transaction-time visibility boundaries
- **THEN** bounded selection SHALL produce the same complete results as the full-load resolver for every requested bucket
- **AND** interval overlap and cross-identity continuity semantics SHALL remain unchanged

#### Scenario: Calculation narrowing leaves fingerprint invalidation intact

- **WHEN** calculation materialization excludes irrelevant retired-identity history
- **THEN** projection fingerprint selection and its transaction-time invalidation behavior SHALL remain unchanged
- **AND** selection SHALL remain read-only and use the established indexed lookup paths without a schema migration
