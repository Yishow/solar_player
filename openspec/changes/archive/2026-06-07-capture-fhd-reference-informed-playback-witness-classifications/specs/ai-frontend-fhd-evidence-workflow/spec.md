## ADDED Requirements

### Requirement: Store five-page boundary classification inside the evidence workflow

The FHD evidence workflow SHALL store the five-page boundary classification as a durable evidence artifact before downstream playback polish changes are applied. The artifact SHALL identify its witness batch, affected routes, classification table, blockers, and follow-up changes.

#### Scenario: Page closeout changes can cite one classification artifact

- **WHEN** a downstream playback polish change starts
- **THEN** it can cite the five-page boundary classification artifact for protected choices, quality targets, and actual gaps
- **AND** it does not rely on chat-only notes for accepted reference differences

##### Example: Overview/Solar polish cites one dated artifact

| Downstream change | Cited artifact | Required cited tokens |
| ----- | ----- | ----- |
| `polish-overview-solar-reference-quality-targets` | `docs/reference-match/fhd-playback-boundary-classification-2026-06-05.md` | `protected-product-choice`, `reference-quality-target`, `actual-gap` |
