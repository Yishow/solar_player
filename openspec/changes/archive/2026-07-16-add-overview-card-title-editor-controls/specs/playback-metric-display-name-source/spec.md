## MODIFIED Requirements

### Requirement: Topic custom names are the source of playback metric display names

The system SHALL resolve the default display name of each story-driven playback metric card that maps to a metric_key from that metric's topic mapping custom name, and SHALL deliver the resolved name to playback through the playback-safe display-story payload. When a metric maps to a topic mapping whose nameZh/nameEn is set, the playback card SHALL display that custom name unless the card has an explicitly supported page-scoped non-blank title override. For Overview KPI cards, a non-blank editor title override SHALL take precedence only for that card. Management topic data SHALL NOT be exposed directly to playback sessions; the server story payload remains the sole delivery channel for topic custom names.

#### Scenario: Custom name drives playback label without a page override

- **WHEN** a topic mapping for a given metric_key has a custom Chinese name set
- **AND** a story-driven playback page renders the card with the display-story payload present
- **AND** the card has no supported page-scoped non-blank title override
- **THEN** the card's label displays the custom name resolved by the server story

##### Example: metric_key to default playback label

| metric_key | topic nameZh | Page title override | Rendered playback label |
| --- | --- | --- | --- |
| realTimePower | "即時輸出" | unset | "即時輸出" |
| factoryProductionPower | "一號產線" | unsupported | "一號產線" |

#### Scenario: Overview page title override takes precedence locally

- **WHEN** an Overview KPI card resolves the runtime metric label "即時輸出"
- **AND** that card's editor configuration has the non-blank title override "即時發電功率"
- **THEN** the Overview card displays "即時發電功率"
- **AND** the topic mapping and other metric consumers continue to use "即時輸出"
