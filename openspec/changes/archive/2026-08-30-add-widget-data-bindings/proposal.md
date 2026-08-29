## Why

Overview、Solar 等播放頁目前主要靠 shared static metric contract、page-local arrays 與 index position 把 Widget 對到資料；這讓同一份頁面難以由 Editor 安全選擇不同 semantic metric，也讓 MQTT/topic、site 與視覺設定糾纏。單 Server 多廠後，Widget 必須明確綁定 semantic metric，並預設跟隨播放裝置的 trusted site scope。

## What Changes

- 新增 stable Widget/Card data binding contract；每個 value-bearing widget 以 stable item id 綁定 `metricKey`，不得再以陣列 index 作為資料 identity。
- Data binding 的 scope selector 支援 `inherit-device | cl | kn | global`；正式 playback 預設 `inherit-device`，由 Device → Group → siteScope 解出 cl/kn，頁面本身不直接綁 raw MQTT topic。
- Display Editor 新增獨立 `Data` inspector，與既有視覺/媒體 `Source Connection` 分離；資料面板選 semantic metric、scope、顯示格式與查看 provenance，不把 raw topic 當主要產品介面。
- Management Editor 新增受信任 Preview Context，可選 CL、KN 或具體 Device/Group 來預覽 `inherit-device` binding；不得用播放 API 的 query/header 放寬 formal device scope。
- Overview 與 Solar 先遷移為同一頁面 config 可供 CL/KN 共用，移除 static positional coupling；Factory Circuit 仍保留 CL/KN 不同 page instance/版型，但其 widget binding 使用相同 schema。
- shared playback metric contract 保留為 schema/default/readiness vocabulary 與 migration compatibility，但 authorable page config 的 explicit data binding 成為 widget 實際資料選擇來源。
- 所有 runtime value、freshness、flow state、story copy 必須從同一 resolved binding/context 取得，避免「site-scoped value + global freshness」混搭。
- 本 change 不提供自由公式編輯；Widget 要顯示計算值時只能選已註冊 semantic/derived metric，公式 registry 由後續 `add-derived-metric-registry` change 提供。

## Capabilities

### New Capabilities

- `display-widget-data-binding`: 定義 stable widget identity、semantic metric binding、scope selector、runtime resolution 與 config migration。
- `display-editor-data-preview-context`: 定義 Editor 的 Data inspector 與 trusted CL/KN/Device/Group preview context。

### Modified Capabilities

- `display-page-component-editing`: value-bearing components 必須能由 Editor 編輯 data binding，而不只視覺/content 欄位。
- `display-page-editor-foundation`: Editor inspector model 必須容納獨立 Data capability，遵守 editor-capability-first 原則。
- `display-editor-source-connection-panel`: `來源連接` 明確維持 media/content source 職責，metric binding 移到獨立 Data 面板以避免兩種 source 混淆。
- `playback-metric-contract`: static contract 從 page-local authoritative binding 降為 shared metric vocabulary/default/readiness contract，explicit widget binding 可覆蓋預設選擇。
- `overview-story-metric-binding`: Overview rendered KPI/summary binding 必須由 stable widget data binding 解析而非 position/static list。
- `page-scoped-display-story-runtime`: monitoring story 必須依 effective widget binding resolve metric scope/value/freshness/provenance，而非只靠 page-level static key list。
- `playback-live-metrics-subscription-isolation`: runtime subscription 必須從 effective widget bindings 與其 dependency contract 推導，trusted cross-site binding 只能取得明確需要的 foreign-scope metrics。
- `live-display-page-preview-surfaces`: management live preview 必須以選定 Preview Context resolve `inherit-device` bindings。
- `instance-aware-live-display-previews`: preview identity 必須包含 page instance 與 data preview context，避免同 template instance/context 共用錯誤 resolved data。

## Impact

- Affected shared config/schema: `packages/shared/src/displayPageConfig.ts`, `packages/shared/src/displayEditorSchema.ts`, `packages/shared/src/playbackMetricContract.ts`, display story/binding types。
- Affected Editor: `apps/web/src/pages/DisplayPagesEditor/*`、inspector fields、preview runtime 與 source connection panel naming/placement。
- Affected playback pages: Overview/Solar config、runtimeContent/viewModel 與 Factory Circuit binding adapter。
- Affected server: page config validation/migration、management preview endpoint/reader，以及 binding-aware story/readiness resolution。
- Dependency: formal playback resolution relies on `scope-live-metrics-by-site`; derived formula authoring is explicitly deferred to `add-derived-metric-registry`。
