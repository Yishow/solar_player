## ADDED Requirements

### Requirement: Live page previews resolve data with an explicit Preview Context

Management live page previews that render metric-backed widgets SHALL resolve `inherit-device` bindings from the active trusted Preview Context. Switching Preview Context SHALL recompute data resolution without modifying the page's published binding configuration.

#### Scenario: Preview switches from CL to KN
- **WHEN** an operator previews the same published page first as CL and then as KN
- **THEN** inherited metric-backed widgets resolve KN values/freshness/provenance after the switch
- **AND** widgets explicitly pinned to CL, KN, or global retain their configured scope

#### Scenario: Preview context is unavailable
- **WHEN** a page contains inherited metric bindings and no valid Preview Context can be resolved
- **THEN** the preview shows a diagnosable unresolved-data state for those bindings
- **AND** it SHALL NOT silently choose CL, KN, or a previously cached context
