## MODIFIED Requirements

### Requirement: Filtering and refresh cannot discard other scopes or drafts
<!-- requirement-id: U1-R5 -->

Saving a filtered source view SHALL preserve sources outside that filter. Live observation refresh SHALL not overwrite editable drafts. Navigation with unsaved edits SHALL preserve the draft or require an explicit discard decision. Configuration baselines, editable drafts and observations SHALL be separate. A single-source save SHALL not save another source's draft, and conflicting server changes SHALL not be overwritten silently. All destructive navigation paths SHALL use one coherent dirty-decision mechanism.

#### Scenario: Save one KN source
<!-- scenario-id: U1-R5-S01 -->

- **GIVEN** CL and KN mappings coexist and the view is filtered to KN
- **WHEN** a KN edit is saved
- **THEN** CL mappings remain byte-equivalent in editable configuration

#### Scenario: Live refresh while editing
<!-- scenario-id: U1-R5-S02 -->

- **GIVEN** a source name has unsaved edits
- **WHEN** a new live value arrives
- **THEN** the new observation appears without replacing the edited name

#### Scenario: Concurrent server update
<!-- scenario-id: U1-R5-S03 -->

- **GIVEN** another operator has saved a newer revision of this source
- **WHEN** an old draft is saved
- **THEN** the operation reports a conflict with no overwrite and retains the local draft

#### Scenario: One navigation decision
<!-- scenario-id: U1-R5-S04 -->

- **GIVEN** the editor and workspace both know the draft is dirty
- **WHEN** the operator leaves through Back or scope navigation
- **THEN** one consistent confirmation is shown rather than duplicate prompts

#### Scenario: Normalized save response
<!-- scenario-id: U1-R5-S05 -->

- **GIVEN** the server accepts and normalizes a source name
- **WHEN** the save response is adopted
- **THEN** the saved normalized configuration becomes the clean baseline without preserving a false dirty copy
