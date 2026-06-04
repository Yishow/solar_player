## ADDED Requirements

### Requirement: Visual review checklist remains part of the AI-authored change workflow

The implementation SHALL integrate the display surface visual review checklist into the AI-authored frontend workflow for FHD-affecting changes. The checklist SHALL be referenced by the evidence bundle rather than remaining a detached optional document.

#### Scenario: Evidence bundle links back to the checklist

- **WHEN** an AI-authored change prepares visual review evidence
- **THEN** the evidence bundle references the display surface visual review checklist
- **AND** any skipped or exceptional checklist item is recorded explicitly

##### Example: Playback polish bundle records one skipped item

- **GIVEN** an AI-authored change updates `/solar` and `/overview`
- **WHEN** the author marks the photo fade checklist item as intentionally different on `/solar`
- **THEN** the evidence bundle links back to the checklist entry
- **AND** the skipped item is recorded with an explicit exception note instead of disappearing from review
