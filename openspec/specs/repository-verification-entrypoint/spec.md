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

The root verification entrypoint SHALL run the production build, the complete shared-package suite, the complete server suite, the complete web suite, the deploy suite, and the test-runner tests of every package that owns a test runner.

A suite counts as complete only when every test file in it is executed. A test file that exists in a covered package but is never executed — because a discovery pattern does not match its name, or because the package has no stage at all — is a coverage gap and MUST be treated as a verification defect, not as an absent test.

Each suite SHALL run as its own labelled stage so that a failure identifies the package it came from.

#### Scenario: Repository verification runs the audited baseline

- **WHEN** the root verification entrypoint runs on the 2026-07-13 baseline plus this change
- **THEN** it executes at least the 377 existing server tests
- **AND** it executes at least the 809 existing web tests
- **AND** it executes at least the 37 existing deploy tests
- **AND** it executes the test-discovery runner tests

#### Scenario: Every test file in a covered package is executed

- **WHEN** the root verification entrypoint runs
- **THEN** every test file under the web package is executed regardless of whether it is named with a TypeScript or a TypeScript-with-JSX extension
- **AND** every test file in the shared package is executed, in both its source and its test directory
- **AND** the test-runner tests of the web package are executed alongside those of the server package

##### Example: coverage of the file-name forms actually used

| Package | Test file form | Executed by root verification |
| ------- | -------------- | ----------------------------- |
| web | `src/**/*.test.ts` | yes |
| web | `src/**/*.test.tsx` | yes |
| web | `scripts/run-tests.test.mjs` | yes |
| shared | `src/**/*.test.ts` | yes |
| shared | `test/**/*.test.ts` | yes |
| server | any `*.test.ts` at any depth under src | yes |

#### Scenario: A failing test in a newly covered file fails the run

- **WHEN** a test file that root verification did not previously execute is failing
- **THEN** the root verification entrypoint exits with a non-zero status
- **AND** the output identifies the stage the failure came from


<!-- @trace
source: close-verification-coverage-gap
updated: 2026-08-31
code:
  - apps/server/src/app.ts
  - apps/web/scripts/run-tests.test.mjs
  - packages/shared/scripts/run-tests.mjs
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - pnpm-workspace.yaml
  - scripts/check-web-bundle-budget.mjs
  - apps/web/scripts/run-tests.mjs
  - packages/shared/package.json
  - apps/web/tsconfig.json
  - apps/web/src/pages/ImageManagement/index.tsx
  - scripts/verify.mjs
  - scripts/verify.test.mjs
tests:
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - packages/shared/src/freshnessPolicy.test.ts
-->

---
### Requirement: Assertion failures surface as failures, not as timeouts

A test assertion SHALL produce its failure message in bounded time. An assertion that compares a whole source file against a pattern MUST NOT be written so that its failure message requires diffing the entire file contents, because that turns a failing test into a hung process and reports as a timeout instead of a failure.

#### Scenario: A source-content assertion fails quickly

- **WHEN** a test asserts on the content of a source file and that assertion does not hold
- **THEN** the test reports a failure with a message naming what was expected
- **AND** the test process completes rather than stalling

##### Example: forms of a source-content assertion

| Assertion form | Failure behaviour |
| -------------- | ----------------- |
| pattern match against the whole file contents | failure message requires a full-file diff; reports as a timeout |
| boolean check on a substring, with an explanatory message | failure message is the explanatory message; reports as a failure |


<!-- @trace
source: close-verification-coverage-gap
updated: 2026-08-31
code:
  - apps/server/src/app.ts
  - apps/web/scripts/run-tests.test.mjs
  - packages/shared/scripts/run-tests.mjs
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - pnpm-workspace.yaml
  - scripts/check-web-bundle-budget.mjs
  - apps/web/scripts/run-tests.mjs
  - packages/shared/package.json
  - apps/web/tsconfig.json
  - apps/web/src/pages/ImageManagement/index.tsx
  - scripts/verify.mjs
  - scripts/verify.test.mjs
tests:
  - apps/web/src/pages/Overview/configRender.test.tsx
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - packages/shared/src/freshnessPolicy.test.ts
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