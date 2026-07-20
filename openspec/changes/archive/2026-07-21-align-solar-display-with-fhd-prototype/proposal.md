## Why

`solar-display` 目前已經具備播放頁、管理頁、MQTT 設定、輪播控制、離線轉頁與裝置狀態等功能，但現有 Spectra change 把 14 個 prototype 頁面放在同一個大 scope 內，容易讓實作者直接把「視覺整合」理解成一次性大改。這種寫法有兩個直接風險：第一，AI 會跳過共用殼層與 page mapping 的前置工作，直接重畫頁面；第二，高風險頁面如 MQTT 設定會和低風險展示頁混在一起，導致 visual refactor 與 interaction regression 一起爆炸。

這次更新 proposal 的目的，不是改變產品方向，而是把原本過寬的變更重新定義成一個 phase-gated rollout contract。最終目標仍然是讓 `solar-display` 對齊 `kuozui-green-fhd-html-prototype` 的 FHD kiosk 視覺語言，但實作必須先完成 shell foundation，再依播放頁、低風險設定頁、高風險設定頁、監控頁等批次逐步遷移，且每一批都要附上 route mapping、驗證命令與人工視覺證據，避免 AI 或後續工程師跳步。

## What Changes

- 把原本的單一大規模視覺整合 change，改寫成有明確 phase order、phase exit criteria、phase evidence bundle 的 rollout spec。
- 建立共享 FHD kiosk shell 的先決條件：先完成 `LayoutShell`、`AppHeader`、`AppFooterNav`、`PageScaffold`、`PageContainer`、page number、density variants 與共用 primitives，再允許任何 route-specific migration 開始。
- 把播放頁拆成三批：`/overview` + `/solar`、`/factory-circuit`、`/images` + `/sustainability`，每批都明確要求 runtime contract、fallback behavior 與 route rotation/offline behavior 不得回歸。
- 把管理頁拆成四批：`/settings/playback` + `/settings/images`、`/settings/mqtt`、`/settings/circuits`、`/trends` + `/history` + `/offline` + `/slideshow-preview` + `/device-status`，依互動風險與資料密度而非頁數平均切分。
- 為每一個 prototype page `01-14` 建立逐頁 mapping：prototype source、React route、主要共享 primitives、主要 runtime data source、reference-only content、fallback-only content、驗證命令與人工 review 項。
- 增加 rollout guardrails，要求每一批次完成後都留下 screenshot、命令輸出、功能 smoke 結果與未解決缺口，後續批次不得在缺少前一批 exit criteria 的情況下啟動。

## Non-Goals

- 不把 14 個頁面當成一次性單 commit 或單 apply session 的工作包。
- 不在本次視覺整合中新增後端 API、變更 MQTT contract、替換 socket event names、重寫輪播引擎或重新設計 route tree。
- 不把 prototype 中的示意數值、臨時圖片、雙語樣本文案視為新的 runtime truth source。
- 不承諾在本次 change 內完成所有正式攝影素材、最終品牌 copy 或新的資料分析能力。

## Capabilities

### New Capabilities

- `phase-gated-visual-rollout`: 定義整個視覺整合 change 的 phase order、風險分批原則、前置條件、退出條件與證據保存規則，避免實作者跳步。
- `fhd-kiosk-shell`: 定義共享 FHD kiosk shell、共用 primitives、density variants、header/footer/page number 與 route 內容容器的完成條件。
- `playback-page-visual-alignment`: 定義播放頁 `01-05` 的分批遷移順序、每頁 composition 對齊、runtime contract 保留、fallback behavior 與驗收方式。
- `management-page-visual-alignment`: 定義管理與輔助頁 `06-14` 的風險分批、操作契約保留、資料密度規則、錯誤顯示與驗收方式。
- `prototype-to-runtime-page-mapping`: 定義逐頁 mapping contract，要求每個 prototype page 都能追溯到 React route、共享 primitives、資料來源、reference-only content 與驗證證據。

### Modified Capabilities

(none)

## Impact

- Affected specs:
  - `phase-gated-visual-rollout`
  - `fhd-kiosk-shell`
  - `playback-page-visual-alignment`
  - `management-page-visual-alignment`
  - `prototype-to-runtime-page-mapping`
- Affected code:
  - Modified:
    - `apps/web/src/app/routeMeta.ts`
    - `apps/web/src/components/AppHeader.tsx`
    - `apps/web/src/components/AppFooterNav.tsx`
    - `apps/web/src/components/PageContainer.tsx`
    - `apps/web/src/components/PageNumberPill.tsx`
    - `apps/web/src/components/PanelCard.tsx`
    - `apps/web/src/components/MetricCard.tsx`
    - `apps/web/src/components/KioskButton.tsx`
    - `apps/web/src/components/KioskInput.tsx`
    - `apps/web/src/components/KioskSelect.tsx`
    - `apps/web/src/components/KioskToggle.tsx`
    - `apps/web/src/components/StatusBadge.tsx`
    - `apps/web/src/components/FlowNode.tsx`
    - `apps/web/src/components/FlowConnector.tsx`
    - `apps/web/src/layouts/LayoutShell.tsx`
    - `apps/web/src/layouts/offlineRouting.ts`
    - `apps/web/src/pages/shared/PageScaffold.tsx`
    - `apps/web/src/hooks/usePageRotation.ts`
    - `apps/web/src/hooks/useLiveMetrics.ts`
    - `apps/web/src/hooks/useMqttStatus.ts`
    - `apps/web/src/services/api.ts`
    - `apps/web/src/services/socket.ts`
    - `apps/web/src/pages/Overview/index.tsx`
    - `apps/web/src/pages/Solar/index.tsx`
    - `apps/web/src/pages/FactoryCircuit/index.tsx`
    - `apps/web/src/pages/Images/index.tsx`
    - `apps/web/src/pages/Sustainability/index.tsx`
    - `apps/web/src/pages/PlaybackSettings/index.tsx`
    - `apps/web/src/pages/ImageManagement/index.tsx`
    - `apps/web/src/pages/MqttSettings/index.tsx`
    - `apps/web/src/pages/CircuitSettings/index.tsx`
    - `apps/web/src/pages/EnergyTrend/index.tsx`
    - `apps/web/src/pages/EnergyHistory/index.tsx`
    - `apps/web/src/pages/OfflineError/index.tsx`
    - `apps/web/src/pages/SlideshowPreview/index.tsx`
    - `apps/web/src/pages/DeviceStatus/index.tsx`
    - `apps/web/src/styles/tokens.css`
    - `apps/web/src/styles/global.css`
  - New:
    - `apps/web/src/components/` 下與 FHD shell 對齊的新共享 primitives 檔案
    - `apps/web/src/pages/` 下各頁 page-local adapter 或 view-model 檔案
    - `apps/web/src/styles/` 下對應 shell、density variants、page-group visuals 的新增樣式檔
    - `openspec/changes/align-solar-display-with-fhd-prototype/specs/phase-gated-visual-rollout/spec.md`
  - Removed:
    - (none)
- Affected verification paths:
  - `apps/web/src/hooks/playbackRouteNavigation.test.ts`
  - `apps/web/src/hooks/playbackRouteSync.test.ts`
  - `apps/web/src/layouts/offlineRouting.test.ts`
  - `apps/server/src/routes/playback.test.ts`
  - `apps/server/src/routes/images.test.ts`
  - `apps/server/src/routes/settings-mqtt.test.ts`
  - `apps/server/src/routes/settings-mqtt-save-regression.test.ts`
  - `apps/server/src/routes/circuits.test.ts`
- Affected reference sources:
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/01-overview.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/05-sustainability.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/06-energy-trend-summary.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/07-playback-settings.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/08-image-management.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/10-circuit-settings.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/11-energy-data-history.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/12-offline-error-display.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/13-slideshow-preview.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/14-device-status-details.html`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/tokens.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/shell.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/components.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/01-overview.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/02-solar.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/03-factory-circuit.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/04-images.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/05-sustainability.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/06-energy-trend-summary.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/07-playback-settings.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/08-image-management.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/09-mqtt-settings.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/10-circuit-settings.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/11-energy-data-history.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/12-offline-error-display.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/13-slideshow-preview.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/14-device-status-details.css`
