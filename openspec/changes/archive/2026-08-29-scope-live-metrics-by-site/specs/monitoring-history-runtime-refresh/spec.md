## ADDED Requirements

### Requirement: Monitoring-history refresh signals identify affected scope

When persisted monitoring snapshots or daily summaries change, the refresh signal SHALL identify the affected metric scope. A scope-specific consumer SHALL refetch only when its selected scope changed, while an authorized management all-scope view MAY refetch for any affected scope.

#### Scenario: CL snapshot is persisted
- **WHEN** a new CL monitoring snapshot is written
- **THEN** the server emits a monitoring-history refresh signal identifying `cl`
- **AND** a KN-only history consumer is not required to refetch solely because of that CL write

#### Scenario: Global history changes
- **WHEN** a global aggregate summary is updated
- **THEN** the refresh signal identifies `global`
- **AND** consumers that explicitly depend on the global history can refetch without relabeling the data as CL or KN
