## Context

非設定類 management/support pages 也會在樹莓派上每次進頁重新啟動資料載入。它們的痛點不像 editor 一樣集中，而是分散在 history aggregate、diagnostics、preview catalog、socket reconnect loop、brand profile bootstrap。

具體熱點如下：

- EnergyTrend 使用 useRuntimeRefreshLifecycle 抓 /api/metrics/history?range=...，結構相對乾淨，但 range 切換與 route 重入仍會從空 payload 進入 loading。
- EnergyHistory 在單一 useRuntimeRefreshLifecycle load 中 Promise.all 三支 API：metrics history、daily summary、cumulative counters。任何一支慢都會讓整個 payload 等待。
- DeviceStatus 的 loadStatus 用 Promise.allSettled 同時抓 getDeviceStatus 與 getDeviceLogExportMetadata，旁邊 useDeviceDisplayOpsSummary 又額外載入 display ops summary；目前 status、log export、display ops 沒有首屏分級。
- OfflineError 同時使用 useLiveMetrics、useDisplayOpsSummary、useMqttStatus，並啟動 retry countdown 與 socket reconnect loop。useMqttStatus 本身會 bootstrap status 和 socket client。
- SlideshowPreview 同時啟動 usePageRotation 和 useLiveDisplayPagePreviewCatalog。usePageRotation 會用 usePlaybackController 抓 settings/rotation preview 並啟動 tick；preview catalog 會讀 registry 和所有 live configs。
- BrandAssets 的 syncProfiles 在 mount 後才取得 profile list；dirty blocker 與 display sync draft guard 正確，但可以使用已知 cached active brand 當首屏，再背景刷新完整 profile list。

## Goals / Non-Goals

**Goals:**

- 支援/診斷頁切換時先顯示 route shell 與已知/部分資料，避免慢 diagnostics 或 preview catalog 決定整頁首屏。
- 讓 EnergyHistory 的三類資料可以分段或 partial payload 更新，保留 chart/counter correctness。
- 讓 DeviceStatus 的 device status、log export metadata、display ops summary 各自載入與失敗，不讓單一診斷讀取拖住整頁。
- 讓 OfflineError 避免重複 MQTT bootstrap/reconnect 工作，保留 retry countdown 與 returnTo。
- 讓 SlideshowPreview 先呈現 rotation shell，再背景補齊 live preview cards。
- 讓 BrandAssets 可以先呈現 cached/initial active profile，再背景同步 profile list。
- 所有改動必須保留功能不缺失、不退化、不藏錯。

**Non-Goals:**

- 不改 management 頁面視覺密度或 FHD 佈局。
- 不改 server routes、auth/access boundary、metric history semantics、device safe ops 行為。
- 不新增 web worker 或第三方 data-fetching library。
- 不移除任何 diagnostic card、preview card、retry、export metadata 或 brand profile action。

## Decisions

### Runtime refresh lifecycle supports stale visible payloads

useRuntimeRefreshLifecycle 應支援 initial payload/stale-while-refresh，使 EnergyTrend 與其他 runtime pages 在 route 重入或 range 切換時能保持舊 payload visible 並標示 refresh。這和 playback change 可共用同一 hook capability，但這份 change 驗證 management/support pages 的使用方式。

替代方案是每頁各自保留 previous payload state，會增加重複狀態與 inconsistent error handling。

### Energy history splits history, summary, and cumulative sources

EnergyHistory 應把 snapshots、daily summaries、cumulative counters 分成可獨立成功/失敗的 source state，或用清楚的 load model 表示 partial payload。viewModel 必須仍以相同資料產生相同 chart vectors、valid point counts、aggregate values。

替代方案是保留 Promise.all；最慢或失敗的一支 API 會拖住或破壞整個 history page。

### Device status separates status, log export, and display ops diagnostics

DeviceStatus 的 getDeviceStatus、getDeviceLogExportMetadata、useDeviceDisplayOpsSummary 應各自有 loading/error/accessDenied 狀態。device status 首屏可先呈現，log export 和 display ops 後補；access denied 保持明確。

替代方案是將 Promise.allSettled 保留在單一 isLoading 下，會讓局部診斷延遲影響整頁。

### Offline and slideshow avoid duplicate bootstrap work

OfflineError 應避免 useMqttStatus 與 socket reconnect loop 重複啟動不必要工作，保留 retry countdown。SlideshowPreview 應讓 usePageRotation 的 rotation shell 與 useLiveDisplayPagePreviewCatalog 的 preview cards 分離，preview catalog pending 不阻塞播放狀態顯示。

替代方案是讓 preview catalog 全量讀取仍在首屏同步發生；這會重複 settings page 的重型 live preview 問題。

### Brand profiles use initial active profile before full list refresh

BrandAssets 可以使用 cached active brand 或 loader-provided active profile 作為 first visible state，再背景同步完整 profile list。dirty blocker、pending action、upload/crop/delete/save 行為維持。

替代方案是只等 getBrandProfiles 完成才顯示全部狀態；在 slow storage 或 Pi 上會讓 brand management 顯得空白。

### Management support behavior and errors remain invariant

所有支援頁 staged loading 必須保留功能不缺失、不退化、不藏錯。history chart/counters、device safe ops/access denied、offline reconnect, slideshow controls, brand profile dirty/save/upload/delete 都必須用測試或手動驗證鎖住。

## Implementation Contract

Behavior:

- EnergyTrend SHALL keep a visible payload or loading state while background refresh runs and SHALL preserve chart output for the same snapshots.
- EnergyHistory SHALL allow snapshots, summaries, and cumulative counters to resolve independently while preserving chart/counter correctness for complete payloads.
- DeviceStatus SHALL show device status, log export, and display ops sections independently, including independent loading, error, and access denied states.
- OfflineError SHALL keep retry countdown, return route, and socket reconnect behavior without starting redundant reconnect/bootstrap loops.
- SlideshowPreview SHALL render rotation status and controls before live preview catalog finishes; preview cards SHALL update when catalog states resolve.
- BrandAssets SHALL preserve dirty blocker and all profile actions while allowing initial active profile display before full list refresh.

Interface / data shape:

- Existing API functions and response shapes remain unchanged.
- Existing page component exports remain unchanged.
- View model output for equivalent fully loaded data remains unchanged.
- useRuntimeRefreshLifecycle result shape remains compatible.

Failure modes:

- Partial source failure SHALL keep successful sections visible and expose the failed section's existing error/degraded state.
- Access denied SHALL remain explicit and SHALL NOT expose restricted payloads.
- Background refresh failure SHALL NOT clear current usable data unless no usable data exists.

Acceptance criteria:

- Unit tests prove each page can render route shell or primary state while deferred sources are pending.
- View model tests prove complete payload output is unchanged.
- Device access denied and safe ops tests continue to pass.
- Existing SlideshowPreview, OfflineError, BrandAssets, EnergyTrend, EnergyHistory tests continue to pass.
- Web tests pass.

Scope boundaries:

- In scope: EnergyTrend, EnergyHistory, DeviceStatus, OfflineError, SlideshowPreview, BrandAssets client-side loading behavior.
- Out of scope: settings pages, DisplayPagesEditor, playback pages, server endpoint changes, visual redesign.

## Risks / Trade-offs

- [Risk] Partial history data can create inconsistent summaries. → Mitigation: viewModel must distinguish missing source state from zero values and tests cover complete and partial payloads.
- [Risk] Independent diagnostic states increase UI state count. → Mitigation: isolate per-section load models and keep content component props explicit.
- [Risk] Offline reconnect changes can affect recovery. → Mitigation: fake timer tests verify retry countdown and reconnect calls.
- [Risk] Brand cached profile can be stale. → Mitigation: background full profile sync updates the selected/draft state unless dirty blocker prevents overwrite.
