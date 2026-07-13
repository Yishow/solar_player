# repository-verification-entrypoint Specification

## Purpose

TBD - created by archiving change 'close-test-entrypoint-coverage'. Update Purpose after archive.

## Requirements

### Requirement: Server test discovery includes top-level and nested tests

The server test runner SHALL discover every src test file matching the repository test naming convention regardless of directory depth, and SHALL execute the discovered files with test concurrency one.

#### Scenario: Top-level server tests are discovered

- **WHEN** the server test runner enumerates tests
- **THEN** config.test.ts, env.test.ts, logger.test.ts, server-startup.test.ts, and serverRuntimeGuard.test.ts are included
- **AND** nested route, service, database, MQTT, and plugin tests remain included


<!-- @trace
source: close-test-entrypoint-coverage
updated: 2026-07-14
code:
  - apps/server/package.json
  - docs/ops/conventions.md
  - scripts/verify.test.mjs
  - package.json
  - scripts/verify.mjs
  - apps/server/scripts/run-tests.test.mjs
  - apps/server/scripts/run-tests.mjs
-->

---
### Requirement: Root verification covers build and all existing test suites

The root verification entrypoint SHALL run the production build, the complete server suite, the complete web suite, the deploy suite, and the test-discovery runner tests.

#### Scenario: Repository verification runs the audited baseline

- **WHEN** the root verification entrypoint runs on the 2026-07-13 baseline plus this change
- **THEN** it executes at least the 377 existing server tests
- **AND** it executes at least the 809 existing web tests
- **AND** it executes at least the 37 existing deploy tests
- **AND** it executes the new test-discovery runner tests


<!-- @trace
source: close-test-entrypoint-coverage
updated: 2026-07-14
code:
  - apps/server/package.json
  - docs/ops/conventions.md
  - scripts/verify.test.mjs
  - package.json
  - scripts/verify.mjs
  - apps/server/scripts/run-tests.test.mjs
  - apps/server/scripts/run-tests.mjs
-->

---
### Requirement: Verification failures propagate to the caller

The server runner and root verification entrypoint MUST exit nonzero when discovery fails, a child command fails, or any discovered test fails.

#### Scenario: A top-level server test fails

- **WHEN** a discovered top-level server test exits with a failure
- **THEN** the server runner exits nonzero
- **AND** the root verification entrypoint stops with a nonzero status


<!-- @trace
source: close-test-entrypoint-coverage
updated: 2026-07-14
code:
  - apps/server/package.json
  - docs/ops/conventions.md
  - scripts/verify.test.mjs
  - package.json
  - scripts/verify.mjs
  - apps/server/scripts/run-tests.test.mjs
  - apps/server/scripts/run-tests.mjs
-->

---
### Requirement: Verification output identifies executed scopes

The root verification entrypoint SHALL print distinct build, server, web, deploy, and runner-test stages so an operator can identify which scope failed.

#### Scenario: A deploy test fails

- **WHEN** the deploy stage returns nonzero
- **THEN** the output identifies the deploy stage as failed
- **AND** later stages do not hide or replace the original failure status

<!-- @trace
source: close-test-entrypoint-coverage
updated: 2026-07-14
code:
  - apps/server/package.json
  - docs/ops/conventions.md
  - scripts/verify.test.mjs
  - package.json
  - scripts/verify.mjs
  - apps/server/scripts/run-tests.test.mjs
  - apps/server/scripts/run-tests.mjs
-->