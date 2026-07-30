## ADDED Requirements

### Requirement: Recover an offline restart from the last-known-good App Shell

When network recovery cannot reach the Server, playback shell recovery SHALL attempt the validated cached App Shell and structured playback snapshot before presenting an offline unavailable state. It SHALL NOT count a successful cache recovery as a crash reload attempt.

#### Scenario: Dynamic import fails while Server is offline

- **WHEN** the active shell chunk cannot load from the network and a matching cached release exists
- **THEN** recovery loads the cached release
- **AND** it preserves the reload budget for actual failed recovery attempts

##### Example: Cached chunk recovery succeeds

- **GIVEN** release `r10` is the validated active cache
- **WHEN** `/assets/runtime.js` fails from the network while the Server is offline
- **THEN** one cached-shell recovery occurs without consuming the bounded network reload budget
