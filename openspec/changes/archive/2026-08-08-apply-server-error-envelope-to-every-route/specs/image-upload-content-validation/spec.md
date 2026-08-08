## MODIFIED Requirements

### Requirement: Upload rejection messages match the accepted extension list

The system SHALL ensure that the message returned when an upload is rejected for an unsupported extension enumerates exactly the extensions that route accepts. This SHALL hold for every route that accepts an uploaded file, not only the image library route.

The extension allowlist SHALL exist in exactly one place. A route whose accepted extensions are the same as another route's SHALL reference that one list rather than declaring its own copy, so that changing the accepted set cannot be applied to one route and missed on another. Limits a route deliberately applies more strictly than another — a declared-type check, a smaller size ceiling — MAY remain that route's own.

An upload that exceeds a route's size ceiling SHALL be rejected with the payload-too-large status, answered through the server's standard error envelope, and SHALL state the ceiling that route actually enforces, derived from that ceiling rather than written out separately. The rejection SHALL be produced where the ceiling is enforced, so that no unreachable size check is left behind as a false safeguard.

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

#### Scenario: An oversized upload is rejected through the standard envelope

- **WHEN** an upload exceeds the size ceiling the route enforces
- **THEN** the response status SHALL be the payload-too-large status
- **AND** the body SHALL be the server's standard error envelope
- **AND** the error string SHALL state that route's enforced ceiling

##### Example: Two routes state two different ceilings

- **GIVEN** the brand logo route enforces a smaller ceiling than the image library route
- **WHEN** an oversized file is uploaded to each
- **THEN** each rejection states that route's own ceiling
- **AND** neither response carries the upload library's own default error fields
