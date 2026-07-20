## ADDED Requirements

### Requirement: Preserve dirty image management drafts across asset selection changes

The implementation SHALL preserve, explicitly discard, or block unresolved `Image Management` drafts when the operator changes the selected image asset.

#### Scenario: Operator tries to switch away from an edited image

- **WHEN** the operator has unsaved asset-level or playlist-level edits for the currently selected image
- **THEN** the page SHALL require the operator to resolve that draft before silently switching context
- **AND** the previous image draft SHALL NOT disappear without an explicit keep, save, or discard decision

##### Example: Dirty draft is not silently lost

- **GIVEN** image asset A has an unsaved title change in `Image Management`
- **WHEN** the operator clicks image asset B in the library
- **THEN** the UI keeps asset A's draft in an explicit pending state or asks the operator to discard or keep it
- **AND** the page does not behave as if asset A was never edited

### Requirement: Save the selected image management draft against the intended asset and playlist row

The implementation SHALL persist `Image Management` edits against the same selected asset and playlist row that own the active draft session.

#### Scenario: Save applies to the image currently being edited

- **WHEN** the operator saves from `Image Management`
- **THEN** the persisted asset-level fields and playlist-level fields SHALL belong to the same selected image session shown in the UI
- **AND** success feedback SHALL NOT imply that unsaved edits from another image were also persisted

##### Example: Targeted save resyncs the edited image only

- **GIVEN** the operator edited the description and playlist duration for image asset A
- **AND** image asset B was never promoted to the active draft session
- **WHEN** the operator saves from `Image Management`
- **THEN** the server persists image asset A and its corresponding playlist row
- **AND** the resynced selection still resolves to image asset A after the save completes
