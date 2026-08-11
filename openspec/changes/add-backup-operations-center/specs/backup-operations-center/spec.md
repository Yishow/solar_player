## Purpose

把既有 verified runtime backup 與 non-destructive restore drill 能力安全投影到管理介面，讓 operator 看得到最後備份、checksum、release、大小與 drill 各階段結果，並只能透過固定受控 helper 觸發操作而不暴露 secrets 或一鍵覆寫 production。

## ADDED Requirements

### Requirement: Backup Operations Center shows verified backup metadata without exposing archive secrets

The management surface SHALL show safe metadata for discovered runtime backups including creation time, source release, archive size, verification status, supported manifest/schema information, and whether the archive contains secrets. It SHALL NOT expose `.env` contents or archive secret payloads.

#### Scenario: Latest verified backup contains an environment file

- **WHEN** the latest backup manifest marks the archive as containing secrets
- **THEN** the Backup Operations Center SHALL show that warning and the verified archive metadata
- **AND** it SHALL NOT render or return the environment-file contents

### Requirement: Trusted operators can trigger a verified backup through a fixed operation boundary

- **WHEN** a trusted operator starts a backup operation
- **THEN** the server SHALL invoke only the fixed approved backup helper/workflow
- **AND** success SHALL require the resulting archive, manifest, and checksum verification to complete
- **AND** arbitrary shell commands or caller-supplied filesystem paths SHALL NOT be accepted

### Requirement: Trusted operators can run a non-destructive restore drill

- **WHEN** a trusted operator starts a drill for a registered verified backup
- **THEN** the operation SHALL use the documented temporary restore-drill workflow
- **AND** it SHALL report checksum, database integrity, migration, and bounded health-smoke stage results
- **AND** the drill SHALL NOT overwrite production runtime state or mutate the production service

### Requirement: Production overwrite restore remains an explicit out-of-band recovery action

- **WHEN** an operator reviews a backup from the management surface
- **THEN** the UI MAY provide safe restore handoff/runbook information
- **AND** it SHALL NOT provide a one-click HTTP action that performs production overwrite restore
