# production-dependency-advisory-remediation Specification

## Purpose

TBD - created by archiving change 'remediate-production-dependency-advisories'. Update Purpose after archive.

## Requirements

### Requirement: Production dependency graph is free of known advisories

The repository SHALL resolve every production dependency to versions for which the production audit reports zero known advisories.

#### Scenario: Production audit passes after remediation

- **WHEN** the production dependency audit runs against the committed lockfile
- **THEN** it exits with status zero
- **AND** it reports no low, moderate, high, or critical advisory


<!-- @trace
source: remediate-production-dependency-advisories
updated: 2026-07-14
code:
  - apps/server/src/services/imageContentValidation.ts
  - apps/server/src/routes/images.ts
  - apps/server/package.json
  - README.md
tests:
  - apps/server/src/routes/images.test.ts
  - apps/server/src/services/imageContentValidation.test.ts
-->

---
### Requirement: Patched transitive resolutions are inspectable

The repository SHALL provide dependency graph evidence that every ws and react-router resolution used by production packages is outside the vulnerable ranges reported by the audit database.

#### Scenario: Operator inspects advisory-related packages

- **WHEN** the operator inspects recursive dependency reasons for ws and react-router
- **THEN** every production resolution is a patched version
- **AND** no unrelated major upgrade is required to explain the remediation


<!-- @trace
source: remediate-production-dependency-advisories
updated: 2026-07-14
code:
  - apps/server/src/services/imageContentValidation.ts
  - apps/server/src/routes/images.ts
  - apps/server/package.json
  - README.md
tests:
  - apps/server/src/routes/images.test.ts
  - apps/server/src/services/imageContentValidation.test.ts
-->

---
### Requirement: Advisory remediation preserves runtime integration behavior

The remediation SHALL preserve MQTT connect and publish behavior, Socket.IO connect and reconnect behavior, browser route loading, and the existing production build.

#### Scenario: Targeted and repository verification pass

- **WHEN** the MQTT, Socket.IO, and router targeted tests run followed by the repository verification entrypoint
- **THEN** every command exits with status zero
- **AND** the production build completes without a dependency-resolution regression

<!-- @trace
source: remediate-production-dependency-advisories
updated: 2026-07-14
code:
  - apps/server/src/services/imageContentValidation.ts
  - apps/server/src/routes/images.ts
  - apps/server/package.json
  - README.md
tests:
  - apps/server/src/routes/images.test.ts
  - apps/server/src/services/imageContentValidation.test.ts
-->