# deployment-install-root-consistency Specification

## Purpose

TBD - created by archiving change 'repair-deploy-install-root-contract'. Update Purpose after archive.

## Requirements

### Requirement: Default deployment uses the canonical runtime root

The production deploy installer SHALL use /data/solar-display as its default install root, and the installed systemd unit SHALL resolve every runtime path from that same root.

#### Scenario: Operator deploys without an explicit install root

- **WHEN** the operator runs the production deploy installer without an install-root argument
- **THEN** application files are installed under /data/solar-display
- **AND** WorkingDirectory, EnvironmentFile, DATA_DIR, LOG_DIR, and every ReadWritePaths entry use /data/solar-display


<!-- @trace
source: repair-deploy-install-root-contract
updated: 2026-07-14
code:
  - docs/ops/conventions.md
  - deploy/deploy.sh
  - README.md
  - scripts/deploy.test.mjs
-->

---
### Requirement: Explicit install root propagates to the installed unit

The production deploy installer SHALL propagate an explicit absolute install root to every path-sensitive field in the installed systemd unit.

#### Scenario: Operator deploys under a custom root

- **WHEN** the operator selects /srv/solar-display as the install root
- **THEN** WorkingDirectory equals /srv/solar-display
- **AND** EnvironmentFile, DATA_DIR, LOG_DIR, and every ReadWritePaths entry are rooted under /srv/solar-display
- **AND** the installed unit contains no stale /opt/solar-display or /data/solar-display path


<!-- @trace
source: repair-deploy-install-root-contract
updated: 2026-07-14
code:
  - docs/ops/conventions.md
  - deploy/deploy.sh
  - README.md
  - scripts/deploy.test.mjs
-->

---
### Requirement: Deployment preserves mutable runtime state

An update deployment SHALL NOT overwrite or delete an existing .env file, data directory, logs directory, or uploads directory.

#### Scenario: Existing runtime state is present

- **WHEN** the installer updates an install root containing .env, data, logs, and uploads
- **THEN** the content and ownership of those mutable paths remain unchanged
- **AND** application bundle files are refreshed independently


<!-- @trace
source: repair-deploy-install-root-contract
updated: 2026-07-14
code:
  - docs/ops/conventions.md
  - deploy/deploy.sh
  - README.md
  - scripts/deploy.test.mjs
-->

---
### Requirement: Install-root rendering preserves service hardening

Install-root rendering SHALL retain NoNewPrivileges, ProtectSystem, restart policy, journal output, and bounded writable paths.

#### Scenario: Rendered unit is verified

- **WHEN** the rendered unit is inspected in a temp-root test and verified on a Linux host
- **THEN** its security directives match the canonical service template
- **AND** systemd verification accepts the unit

<!-- @trace
source: repair-deploy-install-root-contract
updated: 2026-07-14
code:
  - docs/ops/conventions.md
  - deploy/deploy.sh
  - README.md
  - scripts/deploy.test.mjs
-->