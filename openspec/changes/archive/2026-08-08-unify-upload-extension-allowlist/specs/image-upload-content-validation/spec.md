## MODIFIED Requirements

### Requirement: Upload rejection messages match the accepted extension list

The system SHALL ensure that the message returned when an upload is rejected for an unsupported extension enumerates exactly the extensions that route accepts. This SHALL hold for every route that accepts an uploaded file, not only the image library route.

The extension allowlist SHALL exist in exactly one place. A route whose accepted extensions are the same as another route's SHALL reference that one list rather than declaring its own copy, so that changing the accepted set cannot be applied to one route and missed on another. Limits a route deliberately applies more strictly than another — a declared-type check, a smaller size ceiling — MAY remain that route's own.

#### Scenario: An unsupported extension is rejected

- **WHEN** an upload is rejected because its filename extension is not accepted
- **THEN** the returned message SHALL enumerate every accepted extension
- **AND** it SHALL NOT enumerate an extension the route rejects
- **AND** it SHALL NOT omit an extension the route accepts

#### Scenario: Every upload route reports its own accepted extensions

- **WHEN** any route that accepts an uploaded file rejects one for an unsupported extension
- **THEN** the returned message SHALL enumerate exactly the extensions that route accepts
- **AND** the enumeration SHALL be derived from the list the route checks against

##### Example: Brand logo upload rejects an unsupported extension

- **GIVEN** the brand logo route accepts the same extensions as the image library route
- **WHEN** a file whose extension is outside that set is uploaded to the brand logo route
- **THEN** the rejection message enumerates that same set
- **AND** the message is not a separately written string that could drift from it
