## ADDED Requirements

### Requirement: Playback shell keeps the screen awake

The playback shell SHALL request a `screen` wake lock while it is mounted and wake lock is enabled, on browsers that support the Wake Lock API. The wake lock SHALL be released when the playback shell unmounts.

#### Scenario: Wake lock acquired on supported browser

- **WHEN** the playback shell mounts on a browser that supports the Wake Lock API
- **THEN** the shell SHALL request a `screen` wake lock

#### Scenario: Wake lock released on unmount

- **WHEN** the playback shell unmounts after holding a wake lock
- **THEN** the shell SHALL release the wake lock sentinel

### Requirement: Wake lock is re-acquired when the tab becomes visible

Because a `screen` wake lock is released by the system when the tab is hidden, the playback shell SHALL re-acquire the wake lock when the document becomes visible again and no active sentinel is held.

#### Scenario: Re-acquire on return to visible

- **WHEN** the document `visibilityState` changes to `visible` and no active wake lock sentinel is held
- **THEN** the shell SHALL request a new `screen` wake lock

#### Scenario: No re-acquire while a sentinel is still held

- **WHEN** the document becomes visible while an active wake lock sentinel is already held
- **THEN** the shell SHALL NOT request a duplicate wake lock

##### Example: re-acquire decision

| visibilityState | hasSentinel | Re-acquire? |
| --------------- | ----------- | ----------- |
| visible         | false       | true        |
| visible         | true        | false       |
| hidden          | false       | false       |

### Requirement: Unsupported or denied wake lock degrades silently

The system SHALL detect Wake Lock API support before requesting a lock, and SHALL handle a rejected wake lock request without throwing. When wake lock is unsupported or a request is denied, playback SHALL continue unaffected.

#### Scenario: Unsupported browser does not attempt a request

- **WHEN** the browser does not expose `navigator.wakeLock`
- **THEN** the shell SHALL NOT attempt a wake lock request and SHALL NOT throw

#### Scenario: Rejected request is handled silently

- **WHEN** a `screen` wake lock request is rejected by the browser
- **THEN** the shell SHALL handle the rejection without throwing and playback SHALL continue
