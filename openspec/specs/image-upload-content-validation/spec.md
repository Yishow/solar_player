# image-upload-content-validation Specification

## Purpose

TBD - created by archiving change 'harden-image-upload-content-validation'. Update Purpose after archive.

## Requirements

### Requirement: Uploaded image type is detected from bytes

The image upload route SHALL identify PNG, JPEG, and WebP from their required byte signatures and container structure before writing a file or database row.

#### Scenario: Text file is renamed as PNG

- **WHEN** a caller uploads text bytes with a .png filename and image/png declared MIME
- **THEN** the route returns a bounded 400 error
- **AND** no upload file or image_assets row is created


<!-- @trace
source: harden-image-upload-content-validation
updated: 2026-07-14
code:
  - README.md
  - apps/server/src/services/imageContentValidation.ts
  - apps/server/src/routes/images.ts
tests:
  - apps/server/src/services/imageContentValidation.test.ts
  - apps/server/src/routes/images.test.ts
-->

---
### Requirement: Filename extension, declared MIME, and detected type agree

The upload route SHALL require the normalized filename extension and declared multipart MIME to match the detected image type. The stored mime_type SHALL use the detected type.

#### Scenario: JPEG bytes use a PNG declaration

- **WHEN** JPEG bytes are uploaded with a .png filename or image/png declared MIME
- **THEN** the route returns a bounded 400 error
- **AND** the response does not expose a server path, buffer content, or stack


<!-- @trace
source: harden-image-upload-content-validation
updated: 2026-07-14
code:
  - README.md
  - apps/server/src/services/imageContentValidation.ts
  - apps/server/src/routes/images.ts
tests:
  - apps/server/src/services/imageContentValidation.test.ts
  - apps/server/src/routes/images.test.ts
-->

---
### Requirement: Image container is complete enough for safe playback

The validator SHALL reject truncated PNG, JPEG, and WebP containers by checking required header structures and format-specific terminal or declared-length boundaries.

#### Scenario: JPEG end marker is missing

- **WHEN** an uploaded JPEG has a valid start and dimension marker but no valid end marker
- **THEN** validation fails before file or database writes


<!-- @trace
source: harden-image-upload-content-validation
updated: 2026-07-14
code:
  - README.md
  - apps/server/src/services/imageContentValidation.ts
  - apps/server/src/routes/images.ts
tests:
  - apps/server/src/services/imageContentValidation.test.ts
  - apps/server/src/routes/images.test.ts
-->

---
### Requirement: Image dimensions stay within the playback budget

An uploaded image SHALL have width and height no greater than 8192 pixels and total decoded dimensions no greater than 33,177,600 pixels.

#### Scenario: Image exceeds total pixel budget

- **WHEN** a structurally valid image declares dimensions whose product exceeds 33,177,600
- **THEN** the route returns a bounded 400 error
- **AND** no upload file or image_assets row is created


<!-- @trace
source: harden-image-upload-content-validation
updated: 2026-07-14
code:
  - README.md
  - apps/server/src/services/imageContentValidation.ts
  - apps/server/src/routes/images.ts
tests:
  - apps/server/src/services/imageContentValidation.test.ts
  - apps/server/src/routes/images.test.ts
-->

---
### Requirement: Existing compressed-size and cleanup contracts remain active

Byte-level validation SHALL preserve the 10 MB compressed-size limit and SHALL retain cleanup when a later database or playlist operation fails.

#### Scenario: Valid image metadata insert fails

- **WHEN** a valid image passes content validation but metadata persistence fails
- **THEN** the written upload file is deleted
- **AND** the route returns the existing bounded server error

<!-- @trace
source: harden-image-upload-content-validation
updated: 2026-07-14
code:
  - README.md
  - apps/server/src/services/imageContentValidation.ts
  - apps/server/src/routes/images.ts
tests:
  - apps/server/src/services/imageContentValidation.test.ts
  - apps/server/src/routes/images.test.ts
-->

---
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


<!-- @trace
source: repair-freshness-upload-and-playback-runtime-defects
updated: 2026-08-07
code:
  - docs/ops/workflow.md
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/app.ts
  - apps/server/src/metrics/metricTimestamp.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - packages/shared/src/managementAccess.ts
  - apps/server/src/metrics/liveMetrics.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/sw.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/routes/images.ts
  - docs/ops/conventions.md
tests:
  - tests/browser/critical-journeys.spec.ts
  - apps/server/src/metrics/metricTimestamp.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/server/src/realtime/SocketService.broadcastGuardrails.test.ts
  - apps/web/src/sw.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/realtime/SocketService.test.ts
  - apps/server/src/routes/uploadsSecurityHeaders.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/server/src/metrics/liveMetrics.test.ts
-->

---
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

<!-- @trace
source: apply-server-error-envelope-to-every-route
updated: 2026-08-08
code:
  - apps/server/src/routes/images.ts
  - apps/server/src/routes/shell-decorations.ts
  - apps/server/src/routes/imagesSupport.ts
  - docs/ops/conventions.md
  - apps/server/src/routes/brand.ts
  - apps/server/src/app.ts
tests:
  - apps/server/src/routes/brand.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/server/src/app.test.ts
-->