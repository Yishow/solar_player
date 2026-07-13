# critical-api-contract-documentation Specification

## Purpose

TBD - created by archiving change 'align-critical-openapi-runtime-contracts'. Update Purpose after archive.

## Requirements

### Requirement: API documentation declares its coverage boundary

The served OpenAPI document SHALL identify itself as the authoritative critical-operation subset and SHALL list the route domains that remain outside that subset.

#### Scenario: Operator opens API documentation

- **WHEN** an operator opens /docs
- **THEN** the document does not claim complete route coverage
- **AND** it identifies playback, display publishing, MQTT settings, images, readiness, and device status as the covered critical domains


<!-- @trace
source: align-critical-openapi-runtime-contracts
updated: 2026-07-14
code:
  - docs/openapi.yaml
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - README.md
  - scripts/check-web-bundle-budget.mjs
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.ts
  - apps/web/src/app/router.tsx
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/routes/openapi-contract.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
-->

---
### Requirement: Critical operation inventory matches runtime paths and methods

The OpenAPI document SHALL include the runtime path and method pairs for playback settings, playback pages, playback rotation plan, display page registry, display draft read/write, live read, validate, publish, MQTT settings read/write, image list/upload, display readiness, and device status.

#### Scenario: Contract coverage test compares the inventory

- **WHEN** the contract coverage test reads the served OpenAPI JSON
- **THEN** every required critical path and method is present
- **AND** no documented critical operation uses a path or method absent from the runtime router


<!-- @trace
source: align-critical-openapi-runtime-contracts
updated: 2026-07-14
code:
  - docs/openapi.yaml
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - README.md
  - scripts/check-web-bundle-budget.mjs
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.ts
  - apps/web/src/app/router.tsx
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/routes/openapi-contract.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
-->

---
### Requirement: Critical schemas preserve existing response contracts

The OpenAPI document SHALL describe each critical operation using its current success shape and SHALL document applicable validation, conflict, access-denied, not-found, and internal-error responses without introducing a shared envelope that runtime routes do not return.

#### Scenario: Draft save conflict is documented

- **WHEN** the display draft write operation is inspected
- **THEN** its 409 response includes the management draft conflict code, latest envelope, error, success flag, and timestamp
- **AND** its success response remains the existing config envelope shape


<!-- @trace
source: align-critical-openapi-runtime-contracts
updated: 2026-07-14
code:
  - docs/openapi.yaml
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - README.md
  - scripts/check-web-bundle-budget.mjs
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.ts
  - apps/web/src/app/router.tsx
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/routes/openapi-contract.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
-->

---
### Requirement: Critical management authorization is visible

Each documented critical operation SHALL state whether it is playback-safe, trusted-management read, or trusted-management mutation according to current runtime behavior.

#### Scenario: Operator compares public and protected operations

- **WHEN** the operator inspects playback reads and MQTT settings mutations
- **THEN** playback read operations are identified as playback-safe
- **AND** MQTT settings mutations are identified as trusted-management operations


<!-- @trace
source: align-critical-openapi-runtime-contracts
updated: 2026-07-14
code:
  - docs/openapi.yaml
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - README.md
  - scripts/check-web-bundle-budget.mjs
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.ts
  - apps/web/src/app/router.tsx
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/routes/openapi-contract.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
-->

---
### Requirement: Runtime examples remain executable

The contract coverage test SHALL issue representative app requests for the covered domains and SHALL verify that status codes and top-level response fields match the OpenAPI schemas.

#### Scenario: Representative contract test runs

- **WHEN** the server contract test executes with an isolated database
- **THEN** representative success and error responses validate against the documented top-level shapes
- **AND** a contract drift causes the test to fail

<!-- @trace
source: align-critical-openapi-runtime-contracts
updated: 2026-07-14
code:
  - docs/openapi.yaml
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - README.md
  - scripts/check-web-bundle-budget.mjs
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.ts
  - apps/web/src/app/router.tsx
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/displayPageTemplateLoaders.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/routes/openapi-contract.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
-->