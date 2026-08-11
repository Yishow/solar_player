## ADDED Requirements

### Requirement: Runtime playlist reads reuse persisted asset content hashes

The runtime image playlist SHALL obtain content hashes from asset metadata that was computed when asset bytes were created, imported, or explicitly revalidated, and SHALL NOT re-read every unchanged image file body solely to recompute the same hash on each runtime request.

#### Scenario: Unchanged playlist is read repeatedly

- **GIVEN** all referenced image assets have valid persisted content hashes
- **WHEN** the runtime playlist is read repeatedly without any asset byte changes
- **THEN** each resolved entry SHALL expose the same content hash
- **AND** the number of full image-file reads for hashing SHALL NOT grow with the number of runtime reads

#### Scenario: Asset bytes are replaced through a supported operation

- **WHEN** an image asset is uploaded, restored, or otherwise replaced through a supported operation
- **THEN** the asset hash metadata SHALL be computed or invalidated before the new bytes are advertised as cache-ready
- **AND** subsequent runtime manifests SHALL use the hash of the replacement bytes
