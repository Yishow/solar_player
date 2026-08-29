## ADDED Requirements

### Requirement: Page-scoped story runtime uses effective widget binding plans

For a page with explicit widget data bindings, the page-scoped story runtime SHALL resolve an effective binding plan from the published page configuration, trusted playback/preview context, and shared metric contract before building story values. The story payload MUST NOT keep a hidden page-local static metric list as a second source of truth.

#### Scenario: Shared page is rendered by two sites
- **WHEN** one published Overview page uses inherited bindings and is requested by CL and KN playback contexts
- **THEN** the CL story resolves those bindings against CL
- **AND** the KN story resolves those bindings against KN
- **AND** both responses are derived from the same page configuration

#### Scenario: Page includes a trusted cross-site binding
- **WHEN** a published page rendered by CL contains one widget explicitly bound to KN
- **THEN** the story resolves that widget from the KN-scoped metric identity
- **AND** other inherited widgets continue to resolve from CL
- **AND** each story metric retains its own effective scope, freshness, and provenance
