## ADDED Requirements

### Requirement: Management token transports share one byte comparator

HTTP management-access-token headers and Socket managementAccessToken auth values SHALL delegate token equality to the same comparison implementation. That implementation SHALL compare UTF-8 byte lengths before invoking a prefix-independent timing-safe equality primitive and SHALL reject missing presented values or an unconfigured token. It SHALL NOT admit a token through ordinary string equality or a transport-specific alternative comparator.

HTTP extraction SHALL preserve trimming, empty-value rejection and first-array-element selection. Socket extraction SHALL accept only strings, trim their surrounding whitespace and reject empty or non-string values. The configured token SHALL remain unchanged; token comparison SHALL NOT introduce case folding or Unicode normalization. Existing requested Socket session classes, origin policies, password gates and valid-session fallback SHALL remain unchanged.

#### Scenario: Both transports use the same token outcome matrix

- **GIVEN** a management-trusted Socket request and an HTTP caller with no other trusted-origin or session witness
- **WHEN** each transport presents the same extracted token value
- **THEN** both token paths SHALL produce the same result from the shared comparator

##### Example: Token outcomes

| Configured token | Presented value | Token outcome |
| --- | --- | --- |
| unset | secret-token | rejected |
| empty string | secret-token | rejected |
| secret-token | absent | rejected |
| secret-token | whitespace only | rejected |
| secret-token | secret-token | accepted |
| secret-token | surrounding whitespace plus secret-token | accepted after extraction |
| secret-token | Xecret-token | rejected |
| secret-token | secret-tokeX | rejected |
| secret-token | secret-toke | rejected |

#### Scenario: Byte lengths differ despite equal character counts

- **GIVEN** the configured token is "éa" and the presented token is "aa"
- **WHEN** either transport checks the presented token
- **THEN** the comparator SHALL reject the value using the UTF-8 byte-length guard without invoking the timing-safe equality primitive or throwing a length exception

#### Scenario: Transport-specific extraction remains compatible

- **WHEN** an HTTP token header contains an array whose first element is invalid and second element is valid
- **THEN** the HTTP token path SHALL reject the value using the first element only
- **WHEN** Socket managementAccessToken contains an array, object, number or boolean
- **THEN** the Socket token path SHALL reject it without string coercion

#### Scenario: Token rejection does not erase independent trust

- **GIVEN** a caller has an independently valid management session or a trusted-origin path permitted by the existing password-gate policy
- **WHEN** its token is absent or rejected
- **THEN** the existing access classifier SHALL evaluate that independent trust path without changing its policy
- **AND** a Socket request for a playback-safe class SHALL remain playback-safe regardless of a valid token
