## ADDED Requirements

### Requirement: Editor check and publish action automatically persists pending draft changes

The display editor toolbar SHALL allow the operator to invoke "檢查並發布" even when local draft changes are unsaved (`dirty === true`). Invoking the action SHALL automatically persist the current draft before opening the publishing review drawer, eliminating manual two-step save friction and preventing false unsaved-binding blockers during review.

#### Scenario: Check and publish with unsaved changes
- **WHEN** an operator modifies display page properties resulting in unsaved changes and clicks "檢查並發布"
- **THEN** the system SHALL automatically save the draft to the server
- **AND** upon successful save it SHALL open the publish review drawer without reporting unsaved binding blockers

#### Scenario: Check and publish when clean
- **WHEN** an operator clicks "檢查並發布" with no unsaved changes (`dirty === false`)
- **THEN** the system SHALL directly open the publish review drawer and run preflight verification
