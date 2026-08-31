## Why

目前 `/settings/mqtt` 同時承擔 broker、topic mappings、Card Data 與 Weather，Device Fleet 的部分編輯仍依賴 `window.prompt`，而單 Server 多廠後 operator 還需要看懂「來源 → semantic metric → derived metric → 哪些頁面/Widget 使用」的完整資料鏈。管理介面若不跟著資料模型重整，底層雖然正確，日常維運仍會被 raw topic、site 與播放設定混在一起拖累。

## What Changes

- 將現有 MQTT/Data Source 管理概念整合為 `Data Hub` information architecture，至少包含 Connections、Sources、Metrics、Derived Metrics、Usage、Diagnostics、External Data；舊 `/settings/mqtt` 可保留相容 redirect/entry，但產品語意不再把所有資料來源都稱為 MQTT。
- Connections 聚焦中央 Mosquitto health/config；Sources 顯示 Solar managed adapter 與 generic MQTT mappings；Metrics 顯示 semantic metric 的 scope、current value、freshness、provenance；Usage 顯示 page/widget consumers；Diagnostics 串起 scope → source → topic → metric → derived/widget。
- Weather/CWA 等資料移到 `External Data` 分區，不再被描述成 MQTT topic management，同時保留既有 weather setting 能力。
- Data Hub 所有 metric/source diagnostics 必須有明確 scope selector（CL、KN、global/all 視操作權限），管理預覽不得影響 formal playback trusted scope。
- Energy History/monitoring diagnostics 在單 Server 模式下提供明確 scope context，range/year/total semantics 保持原契約，不把 global aggregate 冒充某一廠 history。
- Device Fleet 將 `window.prompt`/手輸 group id/site text 改為 typed dialog/drawer/wizard；建立/編輯 Device 時選 Group，Group 顯示/設定 Site Scope 與 Playback Profile。
- Pairing workflow 讓 operator 決定 Site/Group/Playback Profile（必要時由 group 自動帶出），不提供 Pi raw MQTT topic checkbox；Pi 持續只保存 Server/device credential/context。
- 暫不新增 Data Profile。若未來出現單一 Pi 必須混合多廠不同資料集的實際需求，再另開 capability；目前 `siteScope + widget binding scope` 足以滿足 CL/KN 播放。
- FHD/playback 頁面所有新的資料設定仍遵循 editor-capability-first，不在個別 page component 增加管理專用 hardcode。

## Capabilities

### New Capabilities

- `data-hub-management-surface`: 定義 Connections/Sources/Metrics/Derived/Usage/Diagnostics/External Data 的管理 IA、scope context 與 provenance workflow。

### Modified Capabilities

- `mqtt-settings-operations-surface`: MQTT workspace 從混合管理頁收斂為 Data Hub 的 broker/generic MQTT source 子域，保留 mapping 操作但不承擔所有資料概念。
- `mqtt-settings-runtime-preview-streaming`: runtime preview/activity 轉為 scope-aware source/metric diagnostics，並由 Data Hub 呈現。
- `mqtt-settings-weather-management`: Weather 設定移至 External Data，不再要求 operator 在 MQTT 語意下管理 weather。
- `display-card-data-management`: card-centric diagnostics 併入 Metrics/Usage/Diagnostics workflow，保留 provenance、formula、current/display value 與 override 能力。
- `data-source-monitoring-ops`: monitoring diagnostics/reset 操作必須明確指出作用 scope，避免跨廠誤判或誤清資料。
- `device-fleet-management-surface`: Device/Group mutation 改用 typed management controls/wizard，並以 Group/Site/Profile 為配對設定核心。
- `energy-history-range-semantics`: Energy History 增加 scope context，同時保持既有 year/week/month/total period semantics。

## Impact

- Affected management routes/navigation: `apps/web/src/app/routeMeta.ts`, router/navigation labels，以及 MQTT/Data Source/Device Fleet/Energy History 管理頁。
- Affected server management APIs: source/metric diagnostics、usage/provenance、scope-aware history/ops、device/group pairing support；formal playback APIs 不因 management selector 放寬。
- Affected existing UI: `apps/web/src/pages/MqttSettings/*`, `DataSourceSettings`, `DeviceFleet`, `EnergyHistory`，並可能新增 Data Hub components/routes。
- Dependencies: Data Hub 假設 `scope-live-metrics-by-site`、`add-solar-source-adapter`、`add-widget-data-bindings` 與 `add-derived-metric-registry` 的 contracts 已存在或按該順序 rollout。
- Non-goals: 不讓 Pi 管 MQTT、不新增 speculative Data Profile、不在此 change 合併 CL/KN Factory Circuit 不同版型。
