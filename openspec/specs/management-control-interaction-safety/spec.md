# management-control-interaction-safety Specification

## Purpose

This capability defines reliable keyboard, focus, accessible naming, and disabled behavior for shared management selects and Device Fleet dialogs. It keeps interactive behavior consistent across their use sites.

## Requirements

### Requirement: Shared management selects support keyboard selection and accessible names

CustomSelect SHALL expose a labelled select-only combobox associated with its listbox, current value, expanded state, and active option. Enabled options SHALL be operable with keyboard and pointer input while preserving the existing value/onChange/options contract and shared CSS classes.

#### Scenario: Keyboard users open and choose an option

- **WHEN** the focused trigger receives ArrowDown, ArrowUp, Enter, or Space
- **THEN** the select SHALL open and identify a valid active option
- **AND** ArrowDown/ArrowUp, Home/End, and printable-key search SHALL navigate enabled options
- **AND** Enter or Space SHALL commit the active enabled option once, close the popup, and restore trigger focus

#### Scenario: Keyboard users dismiss without changing the value

- **WHEN** an open select receives Escape or focus leaves with Tab
- **THEN** it SHALL close without committing an unconfirmed active option
- **AND** Escape SHALL restore trigger focus while Tab SHALL continue normal page traversal

#### Scenario: Use sites expose field names

- **WHEN** a management form renders CustomSelect
- **THEN** the interactive trigger SHALL expose the field label separately from the selected value
- **AND** a hidden native select SHALL NOT be the only labelled or tested representation of the control


<!-- @trace
source: fix-ui-draft-and-interaction-consistency
updated: 2026-09-12
code:
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/DataHub/WeatherCards.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/MqttSettings/MqttWeatherPanel.tsx
tests:
  - apps/web/src/components/management/CustomSelect.interaction.test.tsx
  - apps/web/src/components/management/CustomSelect.useSites.test.ts
  - apps/web/src/pages/DataHub/Weather.test.tsx
  - tests/browser/ui-interactions.spec.ts
-->

---
### Requirement: Disabling a shared select blocks every change path

CustomSelect SHALL close its popup when disabled and SHALL reject changes from option handlers, keyboard input, and hidden native select events. Disabled options and an empty enabled-option set SHALL NOT produce an invented selection.

#### Scenario: The select becomes disabled while open

- **GIVEN** options A and B are available and A is selected
- **WHEN** the popup opens and the component becomes disabled before B is activated
- **THEN** the popup SHALL close and onChange SHALL NOT receive B
- **AND** a stale option or native change event SHALL NOT bypass disabled state


<!-- @trace
source: fix-ui-draft-and-interaction-consistency
updated: 2026-09-12
code:
  - apps/web/src/components/management/CustomSelect.tsx
tests:
  - apps/web/src/components/management/CustomSelect.interaction.test.tsx
  - tests/browser/ui-interactions.spec.ts
-->

---
### Requirement: Fleet dialogs manage focus and dismissal over their lifecycle

GroupEditDialog and PairingDialog SHALL move focus into the dialog on opening, keep keyboard focus within the active dialog, and restore focus on closing. Non-pending Escape SHALL use the existing close action. Pending mutation SHALL prevent dismissal and preserve the existing pairing and CRUD contracts.

#### Scenario: Dialog opens and closes with keyboard

- **WHEN** a Fleet trigger opens a dialog
- **THEN** focus SHALL move to an available field or non-destructive action
- **AND** Tab and Shift+Tab SHALL remain within the dialog
- **AND** Escape outside pending mutation SHALL close through the existing onClose action and restore trigger focus

#### Scenario: The trigger is absent or controls become unavailable

- **WHEN** a dialog closes after its trigger is removed, or no child control is focusable while it is open
- **THEN** focus SHALL move to the Fleet fallback container on close or the dialog itself while open
- **AND** focus SHALL NOT fall through to interactive background content

#### Scenario: Pairing mutation is pending

- **WHEN** a pairing or group mutation is pending and Escape is pressed
- **THEN** the dialog SHALL remain open without starting another mutation
- **AND** closing after completion SHALL preserve the existing token-clearing and group update behavior

<!-- @trace
source: fix-ui-draft-and-interaction-consistency
updated: 2026-09-12
code:
  - apps/web/src/components/management/useModalFocus.ts
  - apps/web/src/pages/DeviceFleet/GroupEditDialog.tsx
  - apps/web/src/pages/DeviceFleet/PairingDialog.tsx
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
tests:
  - apps/web/src/pages/DeviceFleet/dialogFocus.test.tsx
  - tests/browser/ui-interactions.spec.ts
-->
