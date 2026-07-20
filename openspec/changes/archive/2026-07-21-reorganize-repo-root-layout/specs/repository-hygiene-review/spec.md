## ADDED Requirements

### Requirement: Repository ignore rules cover root runtime and build artifacts
The repository SHALL maintain a root `.gitignore` that covers standard dependency, build, environment, OS, log, database, and upload/runtime artifacts introduced by the product-first root layout. The ignore rules MUST still preserve tracked placeholders and required sample files.

#### Scenario: Local runtime artifacts are generated
- **WHEN** a developer installs dependencies, builds the project, creates a local `.env`, or runs the server with local data and uploads
- **THEN** common local runtime and build artifacts are ignored by git
- **AND** tracked placeholders or sample files remain visible to git

### Requirement: Repository working tree review confirms explainable reorganization state
Before the reorganization change is marked complete, the repository SHALL include a review of the current git working tree and recent commit history based on fresh git output. The review MUST confirm whether the current state is an explainable rename-heavy plus targeted-edit reorganization and MUST call out unexpected extra commits or missing tracked changes if present.

#### Scenario: Reviewer checks the current repository state
- **WHEN** the reorganization work is reviewed before completion
- **THEN** the review uses fresh `git status`, `git diff`, and `git log` output from the current repository state
- **AND** it states whether the working tree and recent commits look normal for the reorganization
- **AND** it explicitly notes any unexpected extra commits or missing tracked changes if they exist
