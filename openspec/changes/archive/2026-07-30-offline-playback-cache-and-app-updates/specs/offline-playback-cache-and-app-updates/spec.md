## ADDED Requirements

### Requirement: Persist structured last-known playback snapshots

After a successful authenticated refresh, the Client SHALL atomically store Device context summary, Applied Profile Version, Effective Rotation, Freshness Policy, and Last-known Metrics in IndexedDB. A snapshot SHALL include schemaVersion, profileVersion, siteScope, savedAtServerEpoch, and every metric sourceTimestamp. It SHALL NOT store Pairing Tokens or Device Credentials.

#### Scenario: Snapshot write fails midway

- **WHEN** quota or transaction failure occurs before all required records commit
- **THEN** the prior last-known-good snapshot remains active
- **AND** the partial candidate is not used for playback

##### Example: IndexedDB quota failure

- **GIVEN** release `r10`, Profile Version `7` is active
- **WHEN** writing release `r10`, Profile Version `8` aborts with `QuotaExceededError`
- **THEN** the active pointer still resolves to Profile Version `7`

### Requirement: Cache the App Shell and published assets by content identity

The Service Worker SHALL cache the App Shell, styles, images, and published assets listed by a validated manifest. Cache entries SHALL be keyed by release or Profile Version and content hash. A missing or mismatched required asset SHALL invalidate only the candidate.

#### Scenario: Candidate asset hash does not match

- **WHEN** a downloaded image fails its manifest hash
- **THEN** the candidate is rejected
- **AND** the prior App Shell and asset cache remain available

##### Example: Published image is corrupt

- **GIVEN** `/uploads/images/hero.png` declares SHA-256 `abc...`
- **WHEN** its downloaded bytes produce a different SHA-256
- **THEN** only the new candidate cache is deleted

### Requirement: Recover playback after Server loss and Browser restart

A Client with a complete last-known-good App Shell and playback snapshot SHALL load and continue relative rotation after the Server is unavailable and the Browser restarts. It SHALL use only the last Applied Version and SHALL keep all last-known source timestamps visible.

#### Scenario: Restart offline with a complete cache

- **WHEN** the Server is stopped after a successful cache and Firefox restarts
- **THEN** the Client loads the cached shell, typography styles, images, rotation, and metrics
- **AND** relative page duration continues
- **AND** schedule and age remain frozen until trusted App Time returns

##### Example: Warm CL Device restarts offline

- **GIVEN** a CL Device cached release `r10` and Applied Profile Version `7`
- **WHEN** the Server stops and the Browser process restarts
- **THEN** the Device renders release `r10`, continues relative rotation, and keeps the stored source timestamps

#### Scenario: Restart offline without a complete cache

- **WHEN** required shell or snapshot data is absent
- **THEN** the Client displays an explicit offline unavailable state
- **AND** it does not combine records from different Profile Versions

##### Example: Shell cache and snapshot releases differ

- **GIVEN** the active shell cache is release `r10`
- **WHEN** IndexedDB contains only a release `r9` snapshot
- **THEN** playback shows offline unavailable instead of hydrating release `r9`

### Requirement: Activate staged App updates at a Safe Playback Boundary

The Service Worker SHALL stage an update without forcing skipWaiting or immediate reload. The Client SHALL activate a validated candidate only at a Safe Playback Boundary. Activation failure SHALL preserve the prior App Shell and snapshot.

#### Scenario: App update completes midway through a page

- **WHEN** a validated Service Worker candidate becomes ready during a visible page
- **THEN** the current page is not interrupted
- **AND** activation occurs at the next Safe Playback Boundary

##### Example: Candidate waits for page end

- **GIVEN** release `r11` finishes staging with 8 seconds left on the current page
- **WHEN** the current page reaches its boundary
- **THEN** the waiting worker activates and the current page was never interrupted

### Requirement: Reconcile time and desired version after reconnect

After reconnect, the Client SHALL obtain a valid Server Time Signal and compare Desired and Applied Profile Versions before changing absolute-time behavior or visible playback. Resulting changes SHALL use the Safe Playback Boundary.

#### Scenario: Reconnect finds a newer Desired Version

- **WHEN** an offline Client reconnects with an older Applied Version
- **THEN** it synchronizes App Time, stages the Desired Version, and retains old playback until validation and the boundary

##### Example: Applied Version 7 reconnects to Desired Version 8

- **GIVEN** the Client is playing Applied Profile Version `7`
- **WHEN** reconnect reports trusted App Time and Desired Profile Version `8`
- **THEN** Version `7` remains visible until Version `8` validates and reaches a Safe Playback Boundary
