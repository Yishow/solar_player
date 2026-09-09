## ADDED Requirements

### Requirement: Direct source writes reconcile committed production subscriptions

After an authorized direct source-management write commits, the system SHALL reconcile production reception against the complete committed enabled mapping set. Re-enabling an existing mapping SHALL not require a server restart before the broker can acknowledge its topic. Disabling a source SHALL remove only subscriptions no remaining enabled owner requires. Managed subscriptions and other sources, including sources in other scopes sharing the same topic, SHALL remain intact.

Source validation, ownership, revision and dependency checks SHALL finish before any runtime reconciliation. A rejected write SHALL cause no runtime subscription mutation. A broker failure after commit SHALL NOT roll back source configuration or misrepresent the configuration as uncommitted. Existing direct-management HTTP status codes and the `{ source }` success shape SHALL remain unchanged; saving configuration SHALL NOT assert that a subscription is acknowledged or a measurement has arrived.

#### Scenario: Re-enable a mapping absent from the connected runtime
- **GIVEN** a reviewed source and its mapping are disabled when the production receiver connects, so the topic is not subscribed
- **WHEN** an authorized direct source update enables that source and the broker acknowledges subscription
- **THEN** the source and mapping are enabled, the runtime subscribes without restart, and a subsequent packet can reach the existing reviewed ingestion path

#### Scenario: Disable the last owner of a topic
- **GIVEN** an active topic has exactly one enabled mapping owner and the source has no blocking dependency
- **WHEN** direct management successfully disables that owner
- **THEN** the source and mapping remain disabled and that no-longer-required generic subscription is removed after commit

#### Scenario: Shared topic keeps its remaining owner
- **GIVEN** two enabled sources, potentially in different sites, use the same topic
- **WHEN** one source is successfully disabled through direct management
- **THEN** the topic remains subscribed for the remaining owner and no unrelated managed or generic topic is removed

#### Scenario: Broker refuses reconciliation after a committed save
- **WHEN** the broker refuses a subscription change following an otherwise successful direct source write
- **THEN** the committed source and mapping remain saved, the existing save response remains truthful, an operational diagnostic identifies reconciliation failure without leaking credentials, and receipt of data is not fabricated

#### Scenario: Retry can restore a committed enabled source
- **GIVEN** a source was successfully saved as enabled but subscription was not acknowledged
- **WHEN** the operator repeats a valid direct source update without changing its measurement semantics and the broker is available
- **THEN** reconciliation is retried from current committed mappings, the required topic becomes active, and no artificial source revision or epoch change is required

#### Scenario: Disconnected receiver learns the desired topic set
- **WHEN** a direct source write commits while production reception is disconnected
- **THEN** the desired subscription state reflects the committed mappings, no active subscription or observed reading is falsely reported, and reconnection can subscribe the required topics through the normal runtime lifecycle

#### Scenario: Failed validation never reaches the broker
- **WHEN** a direct source write is rejected for authorization, validation, ownership, stale revision or unresolved dependency
- **THEN** no subscribe or unsubscribe operation is invoked and all source, mapping and audit state retains the existing rejection semantics
