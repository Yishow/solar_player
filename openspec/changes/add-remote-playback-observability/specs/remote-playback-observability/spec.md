## Purpose

讓管理者能從 Device Status 遠端確認每台 display 目前的播放頁、圖片、剩餘時間、最後換頁與 runtime revision，並在裝置明確支援且管理者按需要求時取得低解析短生命週期畫面證據，而不演變成持續遠端監控。

## ADDED Requirements

### Requirement: Display heartbeat exposes bounded current-playback presence

A live display SHALL be able to report bounded current-playback presence including current route/page identity, applicable image entry, playing/idle state, remaining duration, last safe rotation boundary, runtime revision, and app release without embedding full runtime configuration.

#### Scenario: Device is actively rotating pages

- **WHEN** a display heartbeat is fresh and the display is actively playing
- **THEN** Device Status SHALL show the latest current page and last rotation boundary from that device
- **AND** applicable image entry and remaining-duration context SHALL be shown when available

#### Scenario: Heartbeat becomes stale

- **WHEN** the display heartbeat exceeds its liveness threshold
- **THEN** current-playback presence SHALL be labelled stale or unavailable
- **AND** old presence SHALL NOT be presented as if it were still live

### Requirement: Playback stall hints respect paused and idle states

- **WHEN** heartbeat remains fresh but page-boundary progress exceeds the expected duration plus tolerance
- **THEN** the system MAY flag the display as possibly stalled
- **AND** it SHALL NOT flag an intentionally paused or idle display solely for lacking rotation progress

### Requirement: On-demand thumbnail capture is capability-gated and disabled by default

A display MAY support trusted on-demand capture of a bounded low-resolution thumbnail. Capture SHALL be disabled by default, SHALL require trusted management access, and SHALL report unsupported or disabled status honestly when the device cannot capture.

#### Scenario: Supported device receives a trusted capture request

- **WHEN** thumbnail capture is enabled and a trusted operator explicitly requests current playback evidence
- **THEN** the device/helper SHALL return one bounded current-playback thumbnail with capture time
- **AND** the thumbnail SHALL not be continuously recorded or stored as long-term image history

#### Scenario: Device has no capture capability

- **WHEN** a trusted operator requests a thumbnail from a device that declares capture unsupported
- **THEN** the management surface SHALL report the capability as unavailable
- **AND** it SHALL continue to provide heartbeat playback presence without fabricating an image
