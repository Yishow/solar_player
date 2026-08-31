## MODIFIED Requirements

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

## ADDED Requirements

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
