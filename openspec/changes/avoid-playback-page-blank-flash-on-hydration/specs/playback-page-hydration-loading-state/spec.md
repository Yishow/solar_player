## ADDED Requirements

### Requirement: Playback pages show a loading state instead of blank during cold hydration

Each live playback page SHALL render a shared loading state component during the cold first-paint hydration window instead of rendering nothing. The existing defer decision SHALL be preserved (the page SHALL still avoid building its live view model until hydration finishes), but the deferred output SHALL be a visible loading placeholder rather than empty content.

#### Scenario: Cold hydration renders the loading state

- **WHEN** a live playback page is in its cold first-paint defer window (runtime hydration enabled, live stage, loading, no loaded envelope yet)
- **THEN** the page SHALL render the shared loading state component
- **AND** it SHALL NOT render empty/null content for the content area

##### Example:

- **GIVEN** runtime hydration is enabled, the page is in `live`, `isLoading=true`, and `lastLoadedEnvelope=null`
- **WHEN** the page evaluates the shared defer helper
- **THEN** it renders `DisplayPageLoadingState`
- **AND** the defer branch does not return `null`

#### Scenario: Defer still precedes view model construction

- **WHEN** a live playback page evaluates its defer guard
- **THEN** the guard SHALL be evaluated before the page builds its runtime view model

##### Example:

- **GIVEN** a playback page source file with a shared runtime hydration guard and a page-specific view model builder
- **WHEN** the defer branch is read from top to bottom
- **THEN** the shared defer helper appears before the view model builder call

### Requirement: Loading state is accessible and respects reduced motion

The shared loading state SHALL expose an accessible status role and SHALL NOT play motion when the user agent requests reduced motion.

#### Scenario: Loading state exposes a status role

- **WHEN** the loading state renders
- **THEN** it SHALL expose `role="status"` with a polite live region

##### Example:

- **GIVEN** the shared loading state component renders
- **WHEN** assistive technology inspects the root node
- **THEN** it finds `role="status"` and `aria-live="polite"`

#### Scenario: Reduced motion disables animation

- **WHEN** the user agent reports `prefers-reduced-motion: reduce`
- **THEN** the loading state SHALL NOT play its animation

##### Example:

- **GIVEN** the loading state pulse animation is defined
- **WHEN** the browser matches `prefers-reduced-motion: reduce`
- **THEN** the pulse animation is disabled with `animation: none`
