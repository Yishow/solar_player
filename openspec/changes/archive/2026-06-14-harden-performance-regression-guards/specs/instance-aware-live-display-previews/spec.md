## ADDED Requirements

### Requirement: Preview request windows remain stable under order churn

The live display preview catalog SHALL treat requested page keys as a request set for loading priority. Reordering the same requested page keys or including duplicate entries SHALL NOT create a different request-window identity, while adding or removing a page key MUST create a different identity.

#### Scenario: Same requested pages use one request identity

- **WHEN** a management preview surface requests live previews for the same page keys in a different visual order
- **THEN** the preview catalog request identity remains unchanged
- **AND** the surface avoids treating carousel order churn as a new data request

##### Example: ordered and duplicated keys normalize to the same identity

| Requested Page Keys | Expected Identity Match |
| ----- | ----- |
| `solar, overview, solar` compared with `overview, solar` | same identity |
| `overview, solar` compared with `overview, images` | different identity |
