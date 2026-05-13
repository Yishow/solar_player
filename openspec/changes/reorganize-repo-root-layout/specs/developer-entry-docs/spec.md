## ADDED Requirements

### Requirement: Root README is the single developer entry document
The repository SHALL provide a root `README.md` that identifies the runnable product at the repository root, summarizes the main directories, lists prerequisites, and names the authoritative root commands for development, build, test, and database workflows. The README SHALL also point readers to environment setup, runtime data locations, deployment entrypoints, Spectra workflow materials, and relocated reference documents.

#### Scenario: New contributor reads the root README
- **WHEN** a developer reads the root `README.md`
- **THEN** the document identifies the repository root as the runnable product entrypoint
- **AND** it summarizes the main product directories and prerequisites
- **AND** it lists the root commands needed for development, build, test, and database workflows
- **AND** it points to environment setup, deployment assets, Spectra materials, and relocated reference documentation

### Requirement: Root workflow instructions match the reorganized repository
The repository SHALL keep root `AGENTS.md` and root `CLAUDE.md` as active workflow instructions. Those files MUST describe the repository root as the product working directory, retain Spectra as the formal workflow where applicable, and document repo-specific engineering rules for the reorganized repository.

#### Scenario: Agent instructions reference the new structure
- **WHEN** an agent or developer reads root `AGENTS.md` or root `CLAUDE.md`
- **THEN** the instructions describe the repository root as the product working directory
- **AND** they retain Spectra as the formal workflow where applicable
- **AND** they do not present legacy prompt-package structure as the main operating model
- **AND** they include repo-specific engineering rules instead of only generic guidance

### Requirement: Developer entry documents reflect observed implementation conventions
The repository SHALL derive `README.md`, `AGENTS.md`, and `CLAUDE.md` guidance from the current codebase behavior instead of generic policy text. The documents MUST only state conventions that can be cross-checked against the current root scripts, server and web entrypoints, test entrypoints, naming and import patterns, runtime directories, deployment assets, or current error-handling and security behavior.

#### Scenario: Documentation is checked against the codebase
- **WHEN** the developer entry documents are updated for the reorganized repository
- **THEN** each repo-specific rule can be traced to the current codebase or workflow files
- **AND** the documents mention the actual build/test/dev commands and runtime directories used by the repository
- **AND** the documents do not invent unsupported lint, security, or testing policies

##### Example: Commands and runtime paths are verified against current files
- **GIVEN** root `package.json` defines `dev`, `build`, `test`, `db:migrate`, and `db:seed`
- **AND** root `.env.example` defines `DATA_DIR`, `DATABASE_PATH`, and `LOG_DIR`
- **WHEN** the developer entry documents describe setup and runtime behavior
- **THEN** they name those same commands and runtime directories instead of introducing unsupported alternatives

### Requirement: Historical reference material is organized under docs
The repository SHALL preserve non-runtime historical material as documentation under `docs/` instead of leaving it mixed with the root product entrypoint. Documentation indexes MUST make the relocated material discoverable.

#### Scenario: Developer needs legacy reference material
- **WHEN** a developer looks for historical prompts, UI references, or supplementary materials after the reorganization
- **THEN** the material is available under `docs/`
- **AND** the root README or a docs index identifies where that material now lives
