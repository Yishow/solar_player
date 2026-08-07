## ADDED Requirements

### Requirement: Expose unpaired display access to management

The `GET /api/device/status` response `data` SHALL include an unpaired display access summary alongside `displayClients`. The summary SHALL contain a count per Display Client Context error code, a total count, the first and most recent occurrence timestamps, and the most recently denied route path. It SHALL be returned only to trusted management requests, consistent with the existing Device Status access boundary.

The summary SHALL NOT contain a client IP address, a User-Agent string, a cookie value, or any other network identifier. The denied route SHALL record the request path only, without its query string.

The set of counted keys SHALL remain bounded to the known Display Client Context error codes, so the summary's memory footprint does not grow with the number of access attempts.

#### Scenario: Unpaired access is counted without affecting display clients

- **WHEN** a client without a valid Device Credential requests a display runtime route and is denied
- **THEN** the unpaired display access summary SHALL increase the count for that error code and the total count
- **AND** the most recent occurrence timestamp and denied route SHALL be updated
- **AND** `data.displayClients` and its summary counts SHALL be unchanged

#### Scenario: Untrusted request receives no unpaired access summary

- **WHEN** an untrusted request calls `GET /api/device/status`
- **THEN** the server SHALL return the management access denied response
- **AND** the response SHALL NOT include the unpaired display access summary

#### Scenario: Summary carries no network identifiers

- **WHEN** the unpaired display access summary is serialized into the response
- **THEN** it SHALL NOT contain a client IP address, a User-Agent string, or a cookie value

#### Scenario: Unknown error codes do not grow the key set

- **WHEN** a denial carries an error code outside the known Display Client Context error codes
- **THEN** the total count SHALL increase
- **AND** the per-code key set SHALL NOT gain a new key

##### Example: Summary state before and after denials

| Situation | totalCount | firstSeenAt | lastDeniedRoute |
| --------- | ---------- | ----------- | --------------- |
| no unpaired access has occurred | 0 | null | null |
| one `device_unpaired` denial on the overview story route | 1 | that denial's timestamp | that route path |
| a second denial on the playback runtime route | 2 | unchanged from the first | the playback runtime route path |

---

### Requirement: Render unpaired display access on Device Status

The `Device Status` management surface SHALL render the unpaired display access summary near the display client section, showing the total count, the most recent occurrence time, and the most recently denied route. When the total count is zero, the surface SHALL explicitly state that no unpaired access has occurred rather than hiding the section, so that "no problem" is distinguishable from "not yet loaded".

#### Scenario: Operator sees ongoing unpaired access

- **WHEN** a trusted operator views `Device Status` while unpaired access has been recorded
- **THEN** the surface SHALL show the total count, the most recent occurrence time, and the most recently denied route

#### Scenario: Zero state is stated explicitly

- **WHEN** a trusted operator views `Device Status` and no unpaired access has been recorded
- **THEN** the surface SHALL state that no unpaired access has occurred
- **AND** the section SHALL NOT be hidden
