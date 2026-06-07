## Why

`/overview` 是展示播放器的門面，但目前與 `docs/reference/Better/01.Overivew (大).png` 落差明顯（以下為 1920x1080 實測 DOM 量測，非推論）：版面順序與 Better 相反 — 實際為 hero → density widget 列（canvas `top 516–712`）→ KPI 卡列（`728–916`），而 Better 為 hero → 中段 KPI → 底部 widget；告警通知 widget 預設隱藏（底部僅 3 欄而非 4 欄）；三相電力面板三相皆為 `--` 全空；發電趨勢 sparkline 退化為平線（所有點同高、值固定為 12,346，疑似綁到累積值而非即時功率時序）。三相全空的根因是 `MetricKey` 沒有三相相關 key，因此 MQTT 設定頁無法建立對應 tag、snapshot 也永遠取不到三相值，`buildOverviewPhasePower` 只能輸出 `--`。這讓門面同時有「順序/欄數與 Better 不符」與「三相缺資料、趨勢退化」問題。（註：兩列實測已不重疊，先前推測的「垂直重疊約 100px」經量測不成立，已移除。）

## What Changes

- 依 Better 參考圖把 Overview 重排為正確的三段順序：hero（右側主視覺 + 左側雙語標題）→ 中段 5 張 KPI 卡列 → 底部 4 個 density widget 列（天氣 / 三相電力 / 發電趨勢 / 告警通知）；目前 widget 列在 KPI 列上方，需對調並保持各 band 不重疊。
- 啟用告警通知 widget（`alertNotifications` 預設可見），讓底部維持 Better 的四欄節奏。
- 提升 Overview KPI 卡與 density widget 的 frosted-glass 質感與間距，且維持 Overview-only class 範圍，不動 shared card 基底與其他 playback 頁。
- 新增三相電力 metric keys：`phaseRVoltage`、`phaseRCurrent`、`phaseRPower`、`phaseSVoltage`、`phaseSCurrent`、`phaseSPower`、`phaseTVoltage`、`phaseTCurrent`、`phaseTPower`，並讓這些 key 可在 MQTT 設定頁建立、連結與管理 topic mapping（tag）。
- 讓 server live snapshot 將上述三相 topic mapping 的值以對應 metric key 暴露給前端，使 `PhasePowerTableWidget` 取得真實 R/S/T 電壓/電流/功率；無資料時沿用既有 `--` fallback，不放 mock。
- 修正發電趨勢資料整合：目前 `GenerationTrendWidget` 的 sparkline 退化為平線常數（實測所有點同高、值 12,346，等於 totalGeneration KPI，疑似誤綁累積值）。apply 階段先確認 `realTimePower` `trendSeries` 的實際來源，使趨勢反映即時功率時序（多點且有變化）；無 runtime 趨勢資料時維持既有空狀態，不放 mock。

## Non-Goals

- 不改 shared card 元件基底、route shell、server API envelope 或 SQLite/MQTT 架構。
- 不為三相或趨勢面板注入任何 mock/示意資料；無 runtime 資料時一律走既有空狀態（沿用 no-mock 設計與既有測試斷言）。
- 不把三相 metric 納入 `mqtt-settings-display-coverage` 的「必備 metric」集合（三相為選用 tag，不影響既有 readiness/coverage 判定）。
- 不改其他 playback 頁（Solar / Factory Circuit / Images / Sustainability）的版面或卡片外觀。
- 不以 page-local hardcode 繞過 `/display-pages/editor`；版面座標仍透過既有 display page config / seed 維護。

## Capabilities

### New Capabilities

- `overview-three-phase-power-binding`: 定義三相電力 metric keys、其在 MQTT 設定頁的 tag 建立/連結/管理行為，以及 server snapshot 將三相值暴露給 `PhasePowerTableWidget` 的 runtime 綁定與無資料 fallback 契約。

### Modified Capabilities

- `overview-fhd-better-quality`: 把版面需求細化為 Better 密集看板的正確順序（hero → 中段 KPI 列 → 底部 4 widget 列，且各 band 不重疊），並要求啟用告警通知 widget 以維持四欄節奏。

## Impact

- Affected specs:
  - 新增 `overview-three-phase-power-binding`
  - 修改 `overview-fhd-better-quality`
- Affected code:
  - Modified:
    - packages/shared/src/types.ts
    - apps/server/src/metrics/liveMetrics.ts
    - apps/server/src/routes/settings-mqtt.ts
    - apps/web/src/pages/MqttSettings/
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/layout.ts
    - apps/web/src/pages/Overview/overview.css
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Overview/viewModel.ts
  - New:
    - openspec/changes/align-overview-better-dashboard-closeout/specs/overview-three-phase-power-binding/spec.md
