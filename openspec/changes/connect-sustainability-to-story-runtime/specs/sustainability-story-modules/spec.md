## ADDED Requirements

### Requirement: Drive Sustainability story modules from the shared runtime payload

The implementation SHALL make the `/sustainability` playback route render story modules from `/api/sustainability-story` instead of composing the module area only from page-local fallback content.

#### Scenario: Runtime story modules are available

- **WHEN** the shared sustainability story payload includes one or more modules
- **THEN** the playback page renders those modules in the configured story area
- **AND** missing optional module content falls back safely without collapsing the page

##### Example: Runtime module content replaces mock-only content

- **GIVEN** `/api/sustainability-story` returns a milestone module and an ESG summary module
- **WHEN** `/sustainability` renders the story area
- **THEN** those runtime modules appear in the page's configured story slots
- **AND** if one optional bullet is absent, the module still renders safely instead of blanking the entire story section
