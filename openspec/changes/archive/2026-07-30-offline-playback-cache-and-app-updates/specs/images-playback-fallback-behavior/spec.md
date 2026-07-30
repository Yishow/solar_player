## ADDED Requirements

### Requirement: Use only verified cached Images assets during offline playback

Offline Images playback SHALL select assets present in the validated Cache Storage manifest for the Applied Version. Missing or corrupt assets SHALL follow the configured Images fallback policy and SHALL NOT trigger a request to an unavailable unrelated source.

#### Scenario: One cached slide asset is missing

- **WHEN** offline rotation reaches a slide whose required asset is absent from the validated cache
- **THEN** Images applies its explicit skip or placeholder fallback
- **AND** the remaining validated slides continue to rotate

##### Example: Missing second slide uses placeholder

- **GIVEN** slide 2 uses `display-placeholder` and is absent from the verified URL set
- **WHEN** offline rotation reaches slide 2
- **THEN** its placeholder renders without requesting the missing URL and slide 3 remains playable
