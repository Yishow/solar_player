# deployment-release-identity Specification

## Purpose

TBD - created by archiving change 'align-device-log-source-and-release-identity'. Update Purpose after archive.

## Requirements

### Requirement: Deployment produces an immutable release manifest

Every production bundle SHALL contain a release manifest with releaseId, commit, builtAt, packageVersion, schemaVersion, and sourceDirty fields.

#### Scenario: Clean production bundle is built

- **WHEN** a production bundle is created from a clean commit
- **THEN** commit contains the full source commit identifier
- **AND** builtAt is an ISO 8601 timestamp
- **AND** packageVersion matches the server package version
- **AND** schemaVersion matches the highest bundled database migration
- **AND** sourceDirty is false


<!-- @trace
source: align-device-log-source-and-release-identity
updated: 2026-07-14
code:
  - apps/server/src/services/deviceLogService.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - deploy.md
  - scripts/generate-release-manifest.mjs
  - deploy.sh
  - deploy/install-kiosk.sh
  - apps/web/src/services/api.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/routes/device.ts
  - deploy/read-solar-display-journal.sh
  - apps/server/src/services/releaseIdentityService.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/DeviceStatus/index.tsx
  - deploy/deploy.sh
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
tests:
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/releaseIdentityService.test.ts
  - apps/server/src/services/deviceLogService.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/services/api.test.ts
-->

---
### Requirement: Runtime reports release identity without deep health work

The trusted device status response SHALL include the loaded release manifest or an explicit unavailable reason. The health endpoint SHALL NOT read or validate the manifest.

#### Scenario: Device Status reads a deployed manifest

- **WHEN** a trusted caller requests device status on a deployed bundle
- **THEN** the response release object matches the installed manifest
- **AND** the Device Status surface renders releaseId, commit, build time, package version, and schema version

#### Scenario: Manifest is missing

- **WHEN** the runtime cannot read a valid release manifest
- **THEN** device status reports release identity as unavailable with a bounded reason
- **AND** the server remains healthy

<!-- @trace
source: align-device-log-source-and-release-identity
updated: 2026-07-14
code:
  - apps/server/src/services/deviceLogService.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - deploy.md
  - scripts/generate-release-manifest.mjs
  - deploy.sh
  - deploy/install-kiosk.sh
  - apps/web/src/services/api.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/routes/device.ts
  - deploy/read-solar-display-journal.sh
  - apps/server/src/services/releaseIdentityService.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/DeviceStatus/index.tsx
  - deploy/deploy.sh
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
tests:
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/releaseIdentityService.test.ts
  - apps/server/src/services/deviceLogService.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/services/api.test.ts
-->