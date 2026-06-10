## Context

設定類管理頁是使用者指出的慢頁核心之一，尤其點 logo 進 /settings/playback 時很明顯。程式碼細看後，慢點集中在每頁把首屏可編輯資料、診斷資料、preview/runtime、polling 與 refresh guard 綁在同一個掛載流程。

具體熱點如下：

- PlaybackSettings 在元件最上層同時啟動 useLiveDisplayPagePreviewCatalog、useDisplayOpsSummary、usePlaybackController，bootstrap 又透過 loadPlaybackConfig 同時抓 getPlaybackSettings、getPlaybackPages、getDisplayRotationPreview。usePlaybackController 內部也抓 getPlaybackSettings 和 getDisplayRotationPreview，造成同頁重複來源讀取。
- useLiveDisplayPagePreviewCatalog 裡的 load 函式與 useEffect bootstrap 幾乎重複同一段 getDisplayPageRegistry、set loading states、buildLiveDisplayPagePreviewStates 流程，且每次對所有 live display pages 做 Promise.all getDisplayPageConfig。
- ImageManagement 的 syncImages 和 useEffect bootstrap 都重複 getImages、getImageStorageUsage、fetchImagePlaylistGovernance 後的 normalize/setState 流程；asset health 與 asset references 也在同頁初始階段掛載。
- MqttSettings 進頁同時 loadSettings、loadTopics、loadWeatherSettings，啟動 5 秒 topic polling，並因 weatherSettings 變更再抓 getWeatherOptions 和 debounce getWeatherPreview。
- CircuitSettings 首屏 loadCircuits 同時依賴 useDisplayReadiness；sync guard reloadNow 又把 circuits 與 readiness 綁成同一輪。

## Goals / Non-Goals

**Goals:**

- 將設定頁首屏資料與延後資料分級：可編輯 form/list 為首屏，diagnostics、preview catalog、runtime countdown、display ops、readiness、polling、asset health、references 為背景或按需載入。
- 簡化重複載入函式，將 bootstrap 與 resync 使用同一個 applyLoadedModel 或 load model helper。
- 減少同頁重複 API：PlaybackSettings 不同時由 loadPlaybackConfig 和 usePlaybackController 重抓相同 settings/rotation preview；preview catalog 不在首屏阻塞。
- 保留所有設定功能、dirty guard、save/test/CRUD、display sync scoping、MQTT password masking、錯誤訊息與 access-denied 行為。

**Non-Goals:**

- 不改管理頁視覺與 DOM 結構，既有 render invariance 仍是保護條款。
- 不更改 server API shape，不新增批次 endpoint。
- 不移除 live preview、display ops、readiness、asset health、weather preview 等功能；只改載入時機與重複函式結構。
- 不讓背景載入失敗靜默成功；錯誤必須在既有 banner、message 或 errorMessage 呈現。

## Decisions

### Playback Settings splits editable config from preview and runtime diagnostics

Playback Settings 的首屏 contract 是 settings 和 pages 可編輯。rotation preview、display ops summary、live display preview catalog、runtime countdown/progress 屬於延後或背景資料。loadPlaybackConfig 應拆成 loadPlaybackEditableModel 與 loadPlaybackDiagnosticsModel，或同等清楚分段；usePlaybackController 若在管理頁只用於 preview，必須吃初始 settings/pages 或延後掛載，避免與 bootstrap 重抓。

替代方案是只 memoize LiveRotationPreviewList，但重複 API 仍存在，無法解決每次進頁慢。

### Live preview catalog uses one load path and bounded background hydration

useLiveDisplayPagePreviewCatalog 應合併 load 與 bootstrap 重複邏輯，提供相同的 loading state 轉換，並允許 caller 指定 immediate visible page set 或 deferred full catalog。PlaybackSettings 與 SlideshowPreview 可以先顯示 rotation shell，再背景補齊 preview cards。

替代方案是保留 Promise.all 全量載入；在 display pages 變多時會把每個管理頁切換都放大成 N 個 config request。

### Image Management centralizes library and playlist model loading

ImageManagement 應用單一 loadImageManagementModel/applyImageManagementModel 處理 getImages、getImageStorageUsage、fetchImagePlaylistGovernance 的結果，bootstrap、save 後 resync、display sync resync 共用同一套流程。asset health 與 selected asset references 保持背景診斷，不阻塞 assets/playlist 基礎畫面。

替代方案是只抽 common setState，但仍讓 bootstrap/resync 分岔，後續容易產生 cross-selection save drift。

### MQTT and Circuit settings defer diagnostics and polling

MqttSettings 的首屏是 broker form、topic mappings、weather persisted settings。weather options、weather preview、readiness、live metrics stream、topic polling 必須延後到基礎資料載入後或對應區塊需要時。CircuitSettings 的首屏是 circuits list；readiness 是背景診斷，不得拖住 list 呈現。

替代方案是把所有 API 包進更大的 Promise.all；這會讓最慢的診斷資料決定整頁可見時間。

### Settings behavior and errors remain invariant

所有 staged loading 都必須保留功能不缺失、不退化、不藏錯。save、test connection、upload/delete image、playlist governance、topic polling、circuit add/save/delete、display sync draft guard、RemoteSyncBanner、access-denied、password masking 都必須用測試鎖住。

## Implementation Contract

Behavior:

- /settings/playback SHALL render editable settings/pages as soon as those required reads resolve; display ops, live preview catalog, runtime countdown, and rotation preview SHALL not block the basic form from appearing.
- /settings/images SHALL render image library and playlist governance from a single shared model loader; asset health and selected asset references SHALL load or refresh independently.
- /settings/mqtt SHALL render persisted MQTT/topic/weather settings before weather options/preview and polling complete; polling SHALL start only after initial topic load completes.
- /settings/circuits SHALL render circuit rows when circuit list loads; readiness diagnostics SHALL update separately.
- Any deferred failure SHALL surface through existing message/error UI and SHALL NOT be reported as success.

Interface / data shape:

- Existing service functions getPlaybackSettings, getPlaybackPages, getDisplayRotationPreview, getImages, getImageStorageUsage, fetchImagePlaylistGovernance, getWeatherSettings, getWeatherOptions, getWeatherPreview, circuit CRUD functions keep their current request/response shape.
- Public component props for PlaybackSettingsFormSections, LiveRotationPreviewList, ImageManagementContent, MqttSettingsContent, CircuitSettingsContent remain compatible unless tests are updated to reflect an explicitly equivalent refactor.
- useLiveDisplayPagePreviewCatalog keeps returning definitions and states.

Failure modes:

- Deferred preview/diagnostic load failure SHALL preserve editable state and show the existing error message or degraded state.
- Save/test/CRUD failures SHALL preserve current user feedback and dirty state semantics.
- Access denied behavior on management-only reads SHALL stay explicit and SHALL NOT expose restricted payloads.

Acceptance criteria:

- Focused unit tests prove each page can render first-screen editable state without waiting for deferred diagnostics.
- Existing settings render invariance tests continue to pass.
- Existing save/test/CRUD tests continue to pass, including MQTT password masking and display sync draft guard behavior.
- The web test command passes.

Scope boundaries:

- In scope: PlaybackSettings, ImageManagement, MqttSettings, CircuitSettings client-side loading and function decomposition.
- Out of scope: new server aggregation endpoints, auth behavior changes, route redesign, visual polish, editor-specific staged loading.

## Risks / Trade-offs

- [Risk] Deferred diagnostics can briefly show stale data. → Mitigation: label existing loading/refresh states clearly and update only the diagnostic portions.
- [Risk] Splitting load paths can duplicate state transitions. → Mitigation: centralize each page's applyLoadedModel helper and test bootstrap/resync/save flows against the same helper.
- [Risk] Delaying polling can miss one early topic refresh. → Mitigation: run a first topic load before starting interval polling, preserving existing poll interval afterward.
- [Risk] Preview catalog deferral could remove visible preview cards temporarily. → Mitigation: retain existing loading preview state per page and test renderer-unavailable/config-unavailable states.
