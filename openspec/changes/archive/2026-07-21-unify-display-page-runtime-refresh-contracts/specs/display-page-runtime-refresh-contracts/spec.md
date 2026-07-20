## ADDED Requirements

### Requirement: Bootstrap display page runtime through a shared lifecycle

The system SHALL bootstrap display page runtime data through a shared lifecycle instead of page-local fetch-once logic.

#### Scenario: Runtime page enters live mode

- **WHEN** a display page enters runtime mode with no injected editor preview config
- **THEN** the page SHALL resolve its display page config and page-specific runtime source through the shared lifecycle
- **AND** the page SHALL expose consistent loading and fallback state while bootstrap is in progress

##### Example: Overview bootstraps config and story together

- **GIVEN** `Overview` is opened as a playback route
- **WHEN** the page mounts in runtime mode
- **THEN** it loads live display page config and the display story payload through the shared lifecycle
- **AND** it uses the same loading contract as the other runtime pages

### Requirement: Refresh page-specific runtime sources through the registry

The system SHALL refresh page-specific runtime sources using an explicit page-to-source registry.

#### Scenario: Registry routes refresh to the correct source

- **WHEN** a relevant runtime refresh trigger occurs for a display page
- **THEN** the system SHALL use the registry to resolve the page's runtime source and refresh key
- **AND** the page MUST NOT refresh through ad-hoc page-local trigger rules

##### Example: Different pages resolve different runtime sources

| Page | Runtime source | Refresh key example |
| ---- | -------------- | ------------------- |
| `overview` | display story | page key only |
| `solar` | display story | page key only |
| `factory-circuit` | display story plus circuits snapshot | page key plus circuit dataset |
| `images` | image playlist | page key plus active index |
| `sustainability` | sustainability story | page key plus selected period |

### Requirement: Surface common stale and error semantics after runtime refresh failure

The system SHALL surface common stale, error, and fallback semantics after runtime refresh failure.

#### Scenario: Refresh failure preserves fallback-safe rendering

- **WHEN** a page-specific runtime refresh fails after the page has already rendered once
- **THEN** the page SHALL keep the last fallback-safe rendering contract instead of crashing
- **AND** the page SHALL expose a consistent error or fallback indicator for the failed refresh

##### Example: Sustainability keeps last resolved period after refresh failure

- **GIVEN** `Sustainability` already rendered the `year` period successfully
- **WHEN** the next period refresh fails because the story endpoint is unavailable
- **THEN** the page keeps the last fallback-safe `year` rendering contract
- **AND** the page exposes a consistent fallback or error indicator instead of blanking the surface
