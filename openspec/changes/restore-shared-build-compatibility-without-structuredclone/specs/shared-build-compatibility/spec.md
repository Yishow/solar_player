## ADDED Requirements

### Requirement: Shared package builds without structuredClone-only globals

The system SHALL allow `@solar-display/shared` to build under its declared `ES2022` TypeScript/runtime contract without depending on globals that are absent from that contract, including `structuredClone`.

#### Scenario: Shared package build succeeds under its declared contract

- **WHEN** the repository runs `pnpm --filter @solar-display/shared build`
- **THEN** the package build succeeds
- **AND** the compiler does not fail on `displayPageCardRail` because of `structuredClone`

##### Example: Root build no longer stops in the shared package

- **GIVEN** the root build starts with `pnpm run build:shared`
- **WHEN** the shared package compiles `src/displayPageCardRail.ts`
- **THEN** the build proceeds past the shared package stage without `Cannot find name 'structuredClone'`

#### Scenario: Card rail helpers preserve detached clone semantics

- **GIVEN** a caller passes a frame or legacy metric item into the shared card rail helpers
- **WHEN** the helper returns the normalized card rail payload
- **THEN** later mutations to the original input SHALL NOT mutate the returned helper output
- **AND** the helper return shape remains compatible with the existing card rail schema
