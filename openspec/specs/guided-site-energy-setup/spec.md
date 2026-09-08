# guided-site-energy-setup Specification

## Purpose

TBD - created by archiving change 'add-guided-site-energy-setup'. Update Purpose after archive.

## Requirements

### Requirement: A single named task opens the same site setup everywhere
<!-- requirement-id: U6-R1 -->

The management UI SHALL expose DataHub → 廠區用電設定 as the canonical task. Circuit settings and compatible editor consumption/share cards SHALL open the same setup with site, department and return context. The editor SHALL not maintain an alternate denominator form. Entry from all-sites SHALL request a concrete site; entry from KN SHALL never default to CL.

#### Scenario: Enter from KN share card
<!-- scenario-id: U6-R1-S01 -->

- **GIVEN** an operator selects a KN department share in the editor
- **WHEN** 修改用電來源與占比 is activated
- **THEN** the common setup opens KN and the selected department, preserving unsaved page state and return context

#### Scenario: Site is disabled for playback
<!-- scenario-id: U6-R1-S02 -->

- **GIVEN** KN playback page is hidden but the site has meters
- **WHEN** the operator enters DataHub energy setup
- **THEN** KN accounting remains configurable without enabling its playback page

---
### Requirement: The standard initial setup is four logical screens
<!-- requirement-id: U6-R2 -->

With existing eligible sources, initial setup SHALL use exactly four logical screens: 選廠區, 選總用電來源, 配對部門與比較基準, 確認結果並套用. In-context entry MAY skip the already known site screen. Each screen SHALL preserve back-navigation state. Four screens SHALL not be misrepresented as four mouse clicks regardless of department count. JSONPath, metric key, item ID, formulas and manual period baselines SHALL not be required on this path.

#### Scenario: Normal configuration
<!-- scenario-id: U6-R2-S01 -->

- **GIVEN** eligible KN main and department meters exist
- **WHEN** an untrained operator completes the task
- **THEN** the task ends within the four-screen flow with no external manual and no required technical identifiers

#### Scenario: Go back
<!-- scenario-id: U6-R2-S02 -->

- **GIVEN** three departments have been assigned on screen 3
- **WHEN** the operator goes back to change the total source and returns
- **THEN** department entries remain unless an explicit incompatibility requires a named correction

---
### Requirement: Pickers show human-readable meter meaning and compatible choices
<!-- requirement-id: U6-R3 -->

The shared picker SHALL show site, friendly name, measurement kind, normalized unit, last observed time and distinct register-versus-period values. It SHALL filter same-site eligible energy sources; incompatible entries MAY be visible disabled with a plain-language reason. Candidate suggestions SHALL require operator confirmation and SHALL not infer physical identity or coverage from a name. Advanced transport fields SHALL be progressively disclosed.

#### Scenario: Distinguish power
<!-- scenario-id: U6-R3-S01 -->

- **GIVEN** KN sources include a kW-only power gauge and a cumulative kWh meter
- **WHEN** the total picker opens
- **THEN** the kW item cannot be selected as period energy and says 這是即時功率，不是累積用電

#### Scenario: Similar names
<!-- scenario-id: U6-R3-S02 -->

- **GIVEN** two source entries share the friendly name 總錶
- **WHEN** the operator searches
- **THEN** stable distinguishing identity and source detail are available without auto-selecting either

---
### Requirement: Department setup uses named rows and one shared comparison question
<!-- requirement-id: U6-R4 -->

Screen 3 SHALL allow adding/renaming department rows and choosing one or more eligible meters per row. It SHALL ask 占比要和哪個總量比較 with site total as a recommended but explicitly reviewed choice, selected department sum as an alternative, and named specific meter set under advanced choice. The preview SHALL expose numerator members and common denominator members. Overlap errors SHALL point to both conflicting rows and preserve inputs.

#### Scenario: Multi-meter department
<!-- scenario-id: U6-R4-S01 -->

- **GIVEN** stamping has two eligible meters
- **WHEN** both are selected in its row
- **THEN** the row states it sums their period consumption and shows both selected names

#### Scenario: Duplicate across rows
<!-- scenario-id: U6-R4-S02 -->

- **GIVEN** meter M is already allocated to stamping
- **WHEN** painting tries to select M
- **THEN** the UI identifies stamping as the existing owner and prevents silently double-counting it

---
### Requirement: Review shows the exact results and scope before activation
<!-- requirement-id: U6-R5 -->

Screen 4 SHALL show site, total sources, department members, comparison basis, same-window numerator and denominator values, calculated percentages, day/month/year coverage, configuration impact and effective-time semantics. Each summary SHALL have a change action returning directly to its input with state preserved. The primary action SHALL name the site, such as 套用觀音用電設定, and distinguish saved configuration from device acknowledgment.

#### Scenario: Concrete review
<!-- scenario-id: U6-R5-S01 -->

- **GIVEN** KN total delta is 1000 kWh and department deltas are 200 and 300 in the same window
- **WHEN** review opens
- **THEN** the operator sees 200/1000=20% and 300/1000=30% with source names and current consumers

#### Scenario: Missing month baseline
<!-- scenario-id: U6-R5-S02 -->

- **GIVEN** day data exists but month-start evidence does not
- **WHEN** the operator reviews the setup
- **THEN** today may show values while month states 缺少月初讀值; the UI does not ask the user to invent a baseline or imply saving recovers history

---
### Requirement: No-source and failed-data states have inline recovery
<!-- requirement-id: U6-R6 -->

An empty picker SHALL provide 在這裡接入電錶, opening U2 in context and returning the created or selected source to the original field without losing setup state. Connection success, mapping saved and sufficient period data SHALL be distinct. New source writes are separately confirmed and remain explicitly saved if the parent setup is later cancelled; preview SHALL not secretly publish test MQTT values. Legacy unreviewed sources SHALL support in-place review rather than demand deleting and recreating them.

#### Scenario: Source is not yet connected
<!-- scenario-id: U6-R6-S01 -->

- **GIVEN** the department source picker is empty
- **WHEN** the operator connects one meter through the inline U2 flow
- **THEN** the source is returned to that department and other setup entries are preserved; extra onboarding is visibly additional to the standard four screens

#### Scenario: Cancel after source creation
<!-- scenario-id: U6-R6-S02 -->

- **GIVEN** a new source was explicitly saved within U2
- **WHEN** the site setup is cancelled
- **THEN** the UI states that the source remains registered but the active accounting profile was not changed

---
### Requirement: Repeat edits open directly instead of replaying onboarding
<!-- requirement-id: U6-R7 -->

After setup, the same surface SHALL present named summaries with 修改總用電來源, 修改部門電錶 and 修改占比基準 actions. A single-field change SHALL use one focused editing surface plus review/apply, without rerunning unaffected screens. Copying a site template MAY copy department names/order but SHALL clear physical meter references and require selecting the target site sources.

#### Scenario: Change denominator only
<!-- scenario-id: U6-R7-S01 -->

- **GIVEN** KN is already configured
- **WHEN** 修改占比基準 is selected
- **THEN** only comparison selection and an impact/result review are required; no broker, site or department re-entry is requested

#### Scenario: Reuse CL department names in KN
<!-- scenario-id: U6-R7-S02 -->

- **GIVEN** the operator copies a department layout from CL to KN
- **WHEN** the template is opened
- **THEN** names are copied while CL meter IDs and active settings are not

---
### Requirement: Typical display tasks use the selected object rather than technical navigation
<!-- requirement-id: U6-R8 -->

The editor SHALL offer object-context tasks: 更換資料, 更換圖片, 修改文字, 調整顯示 and 檢查發布 where compatible. Data changes SHALL use same-site compatible named results; site consumption/share sources SHALL offer the shared site setup action rather than raw denominator controls. Material selection SHALL remain inline. New layout content or custom-binding migration SHALL still require explicit page-draft and publish confirmation.

#### Scenario: Change an image
<!-- scenario-id: U6-R8-S01 -->

- **GIVEN** a selected page image can use managed assets
- **WHEN** 更換圖片 is activated and an asset is chosen
- **THEN** the operator previews it in context and returns to the same object without finding the asset workspace manually

#### Scenario: Fix a department percentage source
<!-- scenario-id: U6-R8-S02 -->

- **GIVEN** a selected share card has an incorrect department source
- **WHEN** 修改用電來源與占比 is activated
- **THEN** the site setup edits the canonical profile; the page can keep its period/style without a second denominator mapping

---
### Requirement: Waiting, blockers and success remain understandable without documentation
<!-- requirement-id: U6-R9 -->

The UI SHALL distinguish 尚未設定, 已設定／等待讀值, 可使用 and 需要修正 with text and action. Errors SHALL explain the concrete problem, affected meter/department and next step without requiring a manual or code lookup. Keyboard focus SHALL return to the triggering field; actions SHALL not depend exclusively on dragging, color or hover. Setup SHALL preserve drafts on network errors and version conflicts.

#### Scenario: Structurally valid but waiting
<!-- scenario-id: U6-R9-S01 -->

- **GIVEN** selected cumulative meters have only one reading
- **WHEN** configuration is applied
- **THEN** success says configuration saved and waiting for sufficient readings, never inventing ready day/month/year totals

#### Scenario: Conflict without data loss
<!-- scenario-id: U6-R9-S02 -->

- **GIVEN** another operator changes the site revision
- **WHEN** this operator applies an older draft
- **THEN** the UI explains the conflict, preserves inputs and offers comparison/review instead of resetting the form

---
### Requirement: Unassisted task completion is a release criterion
<!-- requirement-id: U6-R10 -->

Q1 acceptance SHALL include representative operators unfamiliar with the product, no manual or facilitator instructions beyond the task goal, and observation of both standard and error journeys. The baseline release protocol SHALL use at least three such operators, each completing prepared-source setup and denominator-only edit without external help, wrong-site writes or interpreting a draft as live. Completion time, screen transitions, assistance, errors and failed steps SHALL be recorded; the small sample SHALL not be claimed as proof of a universal usability improvement. A failed critical task SHALL block UX acceptance pending correction and retest.

#### Scenario: Four-screen task study
<!-- scenario-id: U6-R10-S01 -->

- **GIVEN** three unfamiliar operators receive only a task goal and prepared KN sources
- **WHEN** each configures KN total, departments and comparison basis
- **THEN** the evidence records actual completion and screen transitions with no manual; failing users are not trained and then counted as first-time success

#### Scenario: Recurrence and failure study
<!-- scenario-id: U6-R10-S02 -->

- **GIVEN** configured CL/KN profiles and a duplicate-meter test case are available
- **WHEN** operators change KN comparison basis and resolve the conflict
- **THEN** CL remains untouched, the issue is resolved in-context and success is not declared until evidence is reviewed

---
### Requirement: Missing meter setup embeds discovery and batch mapping
<!-- requirement-id: U6-R11 -->

At total-meter and department pickers, the add-in-place action SHALL open M1/M2 inside the current task. Selected profile rows and site SHALL persist; completed sources SHALL return to their intended fields without retyping MQTT topics, selectors or metric keys. The UI SHALL distinguish the four-screen ready-source profile task from the nested source-discovery work, and SHALL not force the user to repeat shared site/connection questions.

#### Scenario: Department meter missing
<!-- scenario-id: U6-R11-S01 -->

- **GIVEN** KN department setup cannot find its meter
- **WHEN** the user selects add from received data and completes M2
- **THEN** the selected department receives its eligible source reference and other draft rows remain unchanged

#### Scenario: Batch add from profile
<!-- scenario-id: U6-R11-S02 -->

- **GIVEN** MAIN and STAMP candidates are selected together
- **WHEN** source and profile review completes
- **THEN** roles are shown once and the user is not sent to a second topic-mapping page or a display-local denominator form
