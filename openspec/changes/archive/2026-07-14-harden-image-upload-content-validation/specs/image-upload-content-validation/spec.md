## ADDED Requirements

### Requirement: Uploaded image type is detected from bytes

The image upload route SHALL identify PNG, JPEG, and WebP from their required byte signatures and container structure before writing a file or database row.

#### Scenario: Text file is renamed as PNG

- **WHEN** a caller uploads text bytes with a .png filename and image/png declared MIME
- **THEN** the route returns a bounded 400 error
- **AND** no upload file or image_assets row is created

### Requirement: Filename extension, declared MIME, and detected type agree

The upload route SHALL require the normalized filename extension and declared multipart MIME to match the detected image type. The stored mime_type SHALL use the detected type.

#### Scenario: JPEG bytes use a PNG declaration

- **WHEN** JPEG bytes are uploaded with a .png filename or image/png declared MIME
- **THEN** the route returns a bounded 400 error
- **AND** the response does not expose a server path, buffer content, or stack

### Requirement: Image container is complete enough for safe playback

The validator SHALL reject truncated PNG, JPEG, and WebP containers by checking required header structures and format-specific terminal or declared-length boundaries.

#### Scenario: JPEG end marker is missing

- **WHEN** an uploaded JPEG has a valid start and dimension marker but no valid end marker
- **THEN** validation fails before file or database writes

### Requirement: Image dimensions stay within the playback budget

An uploaded image SHALL have width and height no greater than 8192 pixels and total decoded dimensions no greater than 33,177,600 pixels.

#### Scenario: Image exceeds total pixel budget

- **WHEN** a structurally valid image declares dimensions whose product exceeds 33,177,600
- **THEN** the route returns a bounded 400 error
- **AND** no upload file or image_assets row is created

### Requirement: Existing compressed-size and cleanup contracts remain active

Byte-level validation SHALL preserve the 10 MB compressed-size limit and SHALL retain cleanup when a later database or playlist operation fails.

#### Scenario: Valid image metadata insert fails

- **WHEN** a valid image passes content validation but metadata persistence fails
- **THEN** the written upload file is deleted
- **AND** the route returns the existing bounded server error
