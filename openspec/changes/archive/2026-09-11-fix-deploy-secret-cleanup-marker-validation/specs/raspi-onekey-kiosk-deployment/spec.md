## ADDED Requirements

### Requirement: Receiver cleanup preserves paths when ownership validation fails

The one-key deployment secret receiver SHALL delete transient parent, payload, and marker paths only after the complete owner, mode, marker-content binding, regular/non-symlink type, containment, and readability validation succeeds. A failed full validation SHALL NOT enable a weaker cleanup path. The receiver SHALL distinguish a parent it actually created from an assigned candidate path. Descriptor closure SHALL proceed independently of filesystem cleanup.

#### Scenario: Invalid marker blocks all cleanup deletion

- **GIVEN** this receiver invocation created transient secret material, the invalid path state is present before validation, and no actor replaces paths between validation and cleanup
- **WHEN** marker mode, owner, magic, owner/file binding, type, containment, or readability validation fails
- **THEN** receiver cleanup SHALL preserve the candidate marker, payload, and parent without deleting them
- **AND** it SHALL report cleanup: unknown
- **AND** any caller-owned target or external sentinel SHALL remain byte-for-byte unchanged

#### Scenario: Partial initialization fails closed

- **GIVEN** the invocation created its parent but initialization fails before a complete marker can be validated
- **WHEN** the cleanup trap runs
- **THEN** it SHALL retain that parent and all remaining transient material
- **AND** it SHALL close owned descriptors and report cleanup: unknown
- **AND** it SHALL NOT weaken marker validation to achieve an empty temporary directory

#### Scenario: Pre-existing candidate is never acquired by cleanup

- **GIVEN** a candidate parent path already exists and the invocation fails to create it
- **WHEN** cleanup runs without any owned transient material having been created
- **THEN** the pre-existing path and its contents SHALL remain unchanged
- **AND** cleanup SHALL NOT identify that candidate as an invocation-owned recovery path
- **AND** the original creation failure SHALL remain a nonzero exit

#### Scenario: Fully validated normal and signal cleanup remain successful

- **WHEN** normal exit or a supported signal triggers cleanup for a fully validated invocation-owned parent, payload, and marker
- **THEN** cleanup SHALL remove only those exact paths and close owned descriptors
- **AND** it SHALL report cleanup: ok only after removal is confirmed
- **AND** a deletion failure or unconfirmed removal SHALL report cleanup: unknown

#### Scenario: Unknown cleanup cannot be reported as deployment success

- **GIVEN** bootstrap exits successfully but transient cleanup is unknown
- **WHEN** the receiver and local handoff complete
- **THEN** the overall exit SHALL be nonzero and retain cleanup: unknown
- **AND** an already nonzero bootstrap exit SHALL remain a failure
- **AND** recovery output SHALL include only a non-secret exact-owned path when ownership creation is known, never payload content or secret values
- **AND** subsequent recovery deletion SHALL require renewed validation rather than blanket wildcard removal
