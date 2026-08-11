## Purpose

讓圖片播放清單可為單一 entry 設定生效起迄、星期與每日時段，並以可信的 server-authoritative 時間在 runtime、offline 與管理 preview 中一致計算播放資格，同時只在安全圖片邊界套用變更。

## ADDED Requirements

### Requirement: Playlist entries can define optional date and recurring time eligibility

An image playlist entry SHALL be able to define optional start/end date-time bounds and optional recurring local-day/time windows. Entries without schedule constraints SHALL remain eligible whenever their existing enabled/asset rules allow playback.

#### Scenario: Entry is outside its scheduled campaign dates

- **WHEN** the authoritative playback time is before the entry start or after the entry end
- **THEN** the entry SHALL be schedule-ineligible and excluded from the playable order

#### Scenario: Entry uses an overnight daily window

- **WHEN** an entry is configured for a supported overnight window such as 22:00 through 02:00
- **THEN** eligibility SHALL treat the window as crossing local midnight rather than as an invalid reversed range

### Requirement: Schedule changes apply at a safe image boundary

The runtime SHALL re-evaluate playlist schedule eligibility at image boundaries and SHALL not abruptly remove the currently visible image solely because its schedule expires during its configured display duration.

#### Scenario: Current image expires mid-display

- **WHEN** the current entry reaches its schedule end before its display-duration timer completes
- **THEN** the current display SHALL complete its active slide duration
- **AND** the next selection SHALL exclude that expired entry

### Requirement: Shuffle only includes entries eligible for the evaluated time

- **WHEN** shuffle is enabled and some entries are outside their schedules
- **THEN** the shuffled order SHALL be produced only from entries that are currently eligible and otherwise playable

### Requirement: Scheduled entries fail closed when absolute playback time is untrusted

- **WHEN** offline playback cannot establish a trusted absolute time
- **THEN** entries that require schedule evaluation SHALL be temporarily ineligible
- **AND** unscheduled playable entries SHALL remain available

### Requirement: Management can preview effective playlist eligibility for a future time

- **WHEN** an operator selects a future date/time in the playlist schedule preview
- **THEN** the management surface SHALL show which entries would be eligible and why others are excluded
- **AND** the preview SHALL NOT mutate the live playlist state
