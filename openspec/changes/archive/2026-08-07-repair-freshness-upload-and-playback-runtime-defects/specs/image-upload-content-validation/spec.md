## ADDED Requirements

### Requirement: Served upload responses cannot execute script

The system SHALL serve every file under the uploads path with response headers that prevent the response from executing script in the application origin, including formats that bypass byte-level content validation.

Uploaded formats that carry no byte-level content validation, such as SVG, remain accepted. Their script execution risk SHALL be neutralized at serving time rather than by rejecting the format.

#### Scenario: An uploaded SVG is opened directly in a browser

- **WHEN** a client navigates directly to an uploaded SVG asset under the uploads path
- **THEN** the response SHALL carry a content type options header set to `nosniff`
- **AND** the response SHALL carry a content security policy header containing the `sandbox` directive without `allow-scripts`
- **AND** script embedded in that SVG SHALL NOT execute

#### Scenario: An uploaded asset is embedded as an image

- **WHEN** a page embeds an uploaded asset through an image element
- **THEN** the asset SHALL render normally

#### Scenario: Previously uploaded assets are covered

- **WHEN** an asset that was uploaded before this requirement took effect is served
- **THEN** it SHALL carry the same protective headers as a newly uploaded asset

### Requirement: Upload rejection messages match the accepted extension list

The system SHALL ensure that the message returned when an upload is rejected for an unsupported extension enumerates exactly the extensions the route accepts.

#### Scenario: An unsupported extension is rejected

- **WHEN** an upload is rejected because its filename extension is not accepted
- **THEN** the returned message SHALL enumerate every accepted extension
- **AND** it SHALL NOT enumerate an extension the route rejects
- **AND** it SHALL NOT omit an extension the route accepts
