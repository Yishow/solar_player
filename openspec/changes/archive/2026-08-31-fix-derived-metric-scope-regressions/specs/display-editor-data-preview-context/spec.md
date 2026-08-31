## ADDED Requirements

### Requirement: Cached preview binding plans invalidate on derived metric registry changes

A cached preview binding plan SHALL be reused only while the derived metric registry it was compiled against is unchanged. When a derived metric definition is saved, enabled, or disabled, a subsequent preview for an otherwise unchanged page configuration and context SHALL recompile the plan.

#### Scenario: Enabling a derived metric refreshes the preview plan

- **WHEN** a preview is taken for a page and context, a derived metric definition bound on that page is then enabled, and the same preview is taken again with the page configuration unchanged
- **THEN** the second preview reports the source class and dependency identities produced by the updated registry
- **AND** the stale plan is not reused

#### Scenario: Unchanged registry still serves the cached plan

- **WHEN** the same preview is requested twice with no configuration change and no derived metric registry change
- **THEN** the second request reuses the cached binding plan

### Requirement: Preview binding plan cache is bounded

The preview binding plan cache SHALL have a fixed upper bound on retained entries. When the bound is reached, the cache SHALL evict the least recently inserted entry rather than growing without limit. Eviction SHALL affect latency only and MUST NOT change preview results.

#### Scenario: Repeated draft saves do not grow the cache without limit

- **WHEN** an editing session produces more distinct page configuration and context combinations than the cache bound
- **THEN** the number of retained cache entries does not exceed the bound
- **AND** a preview whose entry was evicted returns the same result by recompiling the plan
