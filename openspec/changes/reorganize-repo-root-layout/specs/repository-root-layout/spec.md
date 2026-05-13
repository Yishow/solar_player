## ADDED Requirements

### Requirement: Product workspace lives at the repository root
The repository SHALL expose the production monorepo from the repository root rather than requiring `solar-display/` as the primary working directory. The root layout MUST contain the workspace manifests, application packages, and shared packages needed to develop the product.

#### Scenario: Root directory is the primary project entrypoint
- **WHEN** a developer opens the repository root
- **THEN** the root directory contains the pnpm workspace entry files and the top-level product directories required to build and run the system
- **AND** `solar-display/` is not described as the primary product root anymore

### Requirement: Root commands execute the product workflow
The repository SHALL support the product development workflow from the repository root. The root package scripts MUST provide install, development, build, test, and database commands equivalent to the pre-move workspace behavior.

#### Scenario: Development commands run from root
- **WHEN** an operator runs the documented pnpm commands from the repository root
- **THEN** the web, server, build, test, and database workflows execute without requiring a manual change into `solar-display/`

##### Example: root command set
| Command | Expected outcome | Notes |
| ----- | --------------- | ----- |
| `pnpm run dev` | Starts the existing web and server development workflow | Root entrypoint |
| `pnpm run build` | Builds shared, web, and server packages | Equivalent behavior |
| `pnpm run test` | Runs server and web tests | Equivalent behavior |
| `pnpm run db:migrate` | Runs server migrations | Root entrypoint |
| `pnpm run db:seed` | Runs server seed logic | Root entrypoint |

### Requirement: Path-sensitive configuration is updated to the new root layout
The system SHALL update path-sensitive configuration after the move. Environment loading, runtime asset paths, and workspace-relative configuration MUST resolve correctly from the new repository root without compatibility shims.

#### Scenario: Runtime configuration uses the new root layout
- **WHEN** the server or web tooling resolves environment files, asset directories, or workspace-relative paths after the reorganization
- **THEN** those paths resolve successfully from the new repository root
- **AND** no wrapper path that depends on a preserved `solar-display/` prefix is required
