## ADDED Requirements

### Requirement: Provide the shared FHD shell foundation before downstream page alignment

The implementation SHALL establish the shared FHD shell foundation before any downstream route-specific page alignment is treated as ready.

#### Scenario: Shell witness routes are reviewed

- **WHEN** the shell foundation is claimed complete
- **THEN** at least one playback route and one management route render through the new shell family
- **AND** later changes can rely on that shell contract instead of duplicating shell markup

##### Example:

- **GIVEN** `/overview` and `/settings/playback` are chosen as shell witnesses
- **WHEN** the shell foundation is reviewed
- **THEN** both routes show the same header, footer, page number, and content canvas family
- **AND** the evidence bundle records that witness review

### Requirement: Expose reusable shell primitives and density variants

The implementation SHALL expose reusable shell primitives and density variants that later page batches can compose without reimplementing shell structure.

#### Scenario: A later page batch needs shell elements

- **WHEN** a later page batch needs a title block, section wrapper, status pill, action cluster, media slot, or density rule
- **THEN** it consumes a shared primitive or density variant from the shell foundation
- **AND** it does not create a second independent shell system

##### Example:

- **GIVEN** a later playback batch needs a hero title block and a later settings batch needs an admin-density section wrapper
- **WHEN** those batches start
- **THEN** both reuse the shell foundation primitives
- **AND** neither batch invents its own shell contract
