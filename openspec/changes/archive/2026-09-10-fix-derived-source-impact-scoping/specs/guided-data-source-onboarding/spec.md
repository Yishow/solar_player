## ADDED Requirements

### Requirement: Derived source dependencies match their effective input scopes

A source-impact query SHALL identify a derived metric dependency by the input metric key and its effective input scope, not by key alone. Explicit `cl`, `kn`, and `global` selectors SHALL match only their corresponding concrete scope. An `output-site` input SHALL match the owning definition's declared site scopes; an omitted site declaration SHALL retain the existing CL-and-KN default. An all-scope query SHALL include every matching derived input regardless of its effective scope. This filtering SHALL preserve the existing policy for configured inputs of disabled definitions and SHALL NOT change destination-identity reservation rules.

Direct source management and a first guided apply SHALL use the same resulting dependency decision for disabling or renaming a source. Actual same-scope dependencies SHALL remain blocking. Neither a preview token nor a client acknowledgement SHALL bypass the commit-time check. Existing draft, live-widget and structural-expectation classification SHALL remain unchanged.

#### Scenario: Explicit KN input does not hold an unrelated CL source

- **GIVEN** a valid derived definition explicitly reads a KN metric key, CL has an identically named source, and no other dependency uses the CL source
- **WHEN** the CL source is queried for impact and an otherwise valid disable or destination rename is submitted through either source-management path
- **THEN** the KN input is not reported as a CL dependency and does not reject that mutation
- **AND** querying or destructively changing the KN source still reports and protects the derived dependency

#### Scenario: Output-site input follows a narrowed site declaration

- **GIVEN** a site-output definition declares only KN and reads a metric using `output-site`
- **WHEN** source impact is queried for CL, KN, global and all
- **THEN** that input is excluded for CL and global and included for KN and all

#### Scenario: Omitted site declaration preserves the supported default

- **GIVEN** a site-output definition omits its site declaration and has an `output-site` input
- **WHEN** a same-key source is queried for impact in CL or KN
- **THEN** the derived input remains a dependency in each site and is not silently treated as unscoped or global

#### Scenario: Explicit global input does not inherit its output site

- **GIVEN** a valid definition reads a metric explicitly scoped to global
- **WHEN** same-key source impact is queried for CL, KN, global and all
- **THEN** the input is included only for global and all, regardless of which sites the definition outputs

#### Scenario: A dependency added after preview is still protected

- **GIVEN** a destructive guided change was previewed before a same-scope derived input was added or its effective scope was changed to include the source
- **WHEN** the first apply is attempted with the unchanged valid preview request
- **THEN** the current dependency rejects apply with `E1_SOURCE_IN_USE` and no source, mapping, audit, receipt or runtime subscription mutation occurs

### Requirement: Unreadable derived dependency scopes remain unknown

When interpreting a matching derived input requires scope evidence that cannot be read or validated, source impact SHALL report unknown and SHALL NOT infer an empty effective scope set. This includes an absent owning definition, an unsupported selector, and an invalid site declaration needed to expand `output-site`. Direct and guided destructive mutations SHALL retain the existing `E1_SOURCE_IMPACT_UNKNOWN` rejection and zero-write behavior. Valid configurations with no matching derived input SHALL remain known-empty.

#### Scenario: Damaged site evidence cannot authorize a destructive write

- **GIVEN** a matching `output-site` input has unreadable or invalid owning site-scope evidence
- **WHEN** a source-impact query or destructive source mutation needs that evidence
- **THEN** impact is unknown, mutation is rejected without configuration or subscription changes, and the original stored evidence is preserved

#### Scenario: A valid absence of derived inputs is not corruption

- **GIVEN** the dependency data is readable and no derived input refers to the queried key
- **WHEN** source impact is queried
- **THEN** derived dependencies are known-empty and the remaining draft, live and structural-expectation rules decide the result
