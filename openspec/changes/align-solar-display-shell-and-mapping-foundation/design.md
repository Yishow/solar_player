## Context

這個 change 對應 umbrella rollout 的 Phase 0 與 Phase 1。它不處理任何完整頁面視覺遷移，而是把所有後續頁共用的 shell、page density、mapping baseline、evidence matrix 先固定下來。若這一步沒獨立完成，後面每個頁面 batch 都會重新發明一套 shell 與 content classification。

## Goals / Non-Goals

**Goals:**

- 先完成共享 FHD shell foundation。
- 先完成 14 頁 baseline mapping 與 content classification。
- 先完成後續各 phase 共用的 verification matrix。

**Non-Goals:**

- 不在這個 change 內完成任何完整播放頁或管理頁 page body 的 prototype 對位。
- 不調整 backend API、MQTT contract、playback engine 或 CRUD 行為。

## Decisions

### Extract the shared shell before any route-specific batch

先把 shell 與共用 primitives 固定，再允許 route-specific page body migration。這比先做樣板頁再回頭抽象更能避免返工。

### Create a durable 14-page mapping baseline before visual migration

先定義 `01-14` 的 prototype source、route、資料來源、reference-only / fallback-only classification，避免後續頁面一邊切版一邊猜資料契約。

### Gate downstream phases on shell and mapping evidence

後續任何 playback 或 management batch，都只能建立在 shell witness verification 與 mapping baseline 已存在的前提上。

## Implementation Contract

**Behavior**

- 實作者完成這個 change 後，應能在 `/overview` 與 `/settings/playback` 上看到同一套 shell family。
- 實作者應能從 artifact 中查到 `01-14` 每頁的 baseline mapping 與 verification matrix。
- 後續 phase 不得在缺少 shell evidence 與 mapping baseline 的情況下宣稱可開始。

**Interface / data shape**

- `LayoutShell`、`AppHeader`、`AppFooterNav`、`PageScaffold`、`PageContainer`、`PageNumberPill` 的角色與 page density contract 需被固定。
- mapping artifact 需至少包含：prototype page、route、page file、shared primitives、runtime data source、reference-only content、fallback-only content、verification target。

**Failure modes**

- 若 shell foundation 未先完成，route-specific page changes 容易產生 duplicated shell markup。
- 若 mapping baseline 未先完成，後續 changes 容易把 prototype sample value 誤當 runtime requirement。

**Acceptance criteria**

- `pnpm --filter @solar-display/web build` 成功。
- shell witness review 同時覆蓋一條 playback route 與一條 management route。
- `01-14` mapping coverage 無漏頁。

**Scope boundaries**

- In scope：shell、primitives、density variants、baseline mapping、verification matrix。
- Out of scope：各頁 page body prototype 對位與互動頁 save/test/CRUD regression。

## Shell Contract Baseline

### Shared shell family completion criteria

| Shell element | Source file | Locked responsibility | Witness expectation |
| --- | --- | --- | --- |
| `LayoutShell` | `apps/web/src/layouts/LayoutShell.tsx` | 只負責 global kiosk background、header/footer 掛載、route outlet、offline redirect 與 playback rotation | `/overview` 與 `/settings/playback` 不得各自複製 shell markup |
| `AppHeader` | `apps/web/src/components/AppHeader.tsx` | 提供統一 logo/title/time/status header family | 兩條 witness route 的頂部結構一致 |
| `AppFooterNav` | `apps/web/src/components/AppFooterNav.tsx` | 提供播放/管理分組導航、總頁數、品牌尾欄 | 兩條 witness route 的底部導航與頁碼語彙一致 |
| `PageScaffold` | `apps/web/src/pages/shared/PageScaffold.tsx` | 由 route meta 派生 shell density、標題、描述、page number 與內容畫布 | route page body 只負責自身內容，不再手工拼 title/page number |
| `PageContainer` | `apps/web/src/components/PageContainer.tsx` | 統一 title block、content canvas、density-aware spacing | playback 與 management 只透過 density 差異調整節奏 |
| `PageNumberPill` | `apps/web/src/components/PageNumberPill.tsx` | 提供跨 route 共用的頁碼 pill | 不允許各頁自製頁碼樣式 |

### Density variants

| Density | Current routes | Intended use |
| --- | --- | --- |
| `playback` | `/overview` `/solar` `/factory-circuit` `/images` `/sustainability` | 內容導向、hero 與 media 比例較大、title 區塊較寬 |
| `management` | `/trends` `/settings/playback` `/settings/images` `/settings/mqtt` `/settings/circuits` `/history` `/offline` `/slideshow-preview` | 表單、表格、圖表與操作區為主，密度較高 |
| `device-detail` | `/device-status` | 裝置資訊與維護操作混合頁，保留管理頁節奏但允許較寬資訊卡 |

### Reusable shell primitives

| Primitive | Current file | Contract |
| --- | --- | --- |
| title block | `apps/web/src/components/TitleBlock.tsx` | 統一 section title、description、aside/page-number 位置 |
| section wrapper | `apps/web/src/components/SectionWrapper.tsx` | 統一 panel chrome、section heading、density-aware padding |
| status pill | `apps/web/src/components/StatusBadge.tsx` | 統一 MQTT/socket/device state 標記，不讓後續頁自訂獨立樣式 |
| action cluster | `apps/web/src/components/ActionCluster.tsx` | 統一一組按鈕或快捷操作的排列與間距 |
| media slot | `apps/web/src/components/MediaSlot.tsx` | 統一大圖、hero media、preview frame 的外框與留白 |

### Shell witness routes

- Playback witness route：`/overview`
  - Page file：`apps/web/src/pages/Overview/index.tsx`
  - Expected shell evidence：共享 header、footer、page number、title block、playback density canvas
- Management witness route：`/settings/playback`
  - Page file：`apps/web/src/pages/PlaybackSettings/index.tsx`
  - Expected shell evidence：共享 header、footer、page number、title block、management density canvas

## 14-Page Prototype-To-Runtime Baseline Mapping

| Prototype | Runtime route | Page file | Shared primitives | Major runtime data source | Region classification baseline |
| --- | --- | --- | --- | --- | --- |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/01-overview.html` | `/overview` | `apps/web/src/pages/Overview/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `MetricCard`, `StatusBadge`, `Sparkline` | `useLiveMetrics()` with fallback `apps/web/src/mocks/metrics.ts` | hero slogan/background: reference-only; KPI cards: runtime-bound with fallback-only values; trend sparkline/status copy: runtime-bound with fallback-only mock rendering |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html` | `/solar` | `apps/web/src/pages/Solar/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `FlowNode`, `FlowConnector`, `MetricCard` | current placeholder `apps/web/src/mocks/metrics.ts`; downstream batch must preserve route/data strategy without inventing new API | flow layout and ornaments: reference-only; KPI figures now mock/fallback-only; future live values: runtime-bound once batch A adapter lands |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html` | `/factory-circuit` | `apps/web/src/pages/FactoryCircuit/index.tsx` | `PageScaffold`, `PanelCard`, `FlowNode`, `StatusBadge`, `MetricCard` | `requestJson("/api/circuits")` via `apps/web/src/services/api.ts` | circuit rows/load percentage: runtime-bound; threshold color/label mapping: runtime-bound via page-local adapter; placeholder empty state copy: fallback-only; decorative diagram rhythm: reference-only |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html` | `/images` | `apps/web/src/pages/Images/index.tsx` | `PageScaffold`, `TitleBlock`, `MediaSlot`, `PanelCard` | current placeholder `apps/web/src/mocks/images.ts` | hero media frame/thumbnail rhythm: reference-only; selected image metadata: fallback-only until runtime source exists; slideshow asset binding: runtime-bound when available |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/05-sustainability.html` | `/sustainability` | `apps/web/src/pages/Sustainability/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `MetricCard` | current placeholder `apps/web/src/mocks/sustainability.ts` | big-number layout/story blocks: reference-only; summary values/highlights: fallback-only today, future runtime-bound when summary API exists |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/06-energy-trend-summary.html` | `/trends` | `apps/web/src/pages/EnergyTrend/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `ActionCluster` | current page-local `mockData` in `apps/web/src/pages/EnergyTrend/index.tsx` | chart composition/range control layout: reference-only; trend datapoints and totals: fallback-only for now; future historical query result: runtime-bound |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/07-playback-settings.html` | `/settings/playback` | `apps/web/src/pages/PlaybackSettings/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `ActionCluster`, `KioskInput`, `KioskSelect`, `KioskToggle` | `getPlaybackSettings()`, `getPlaybackPages()`, `updatePlaybackSettings()`, `updatePlaybackPages()` in `apps/web/src/services/api.ts` | form sections and action hierarchy: reference-only; playback settings/page ordering fields: runtime-bound; helper copy/loading strings: fallback-only where no server value exists |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/08-image-management.html` | `/settings/images` | `apps/web/src/pages/ImageManagement/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `StatusBadge`, `ActionCluster` | current placeholder `apps/web/src/mocks/images.ts` | asset row structure and quick-actions layout: reference-only; row status/date/title currently fallback-only; future image library list/action result: runtime-bound |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html` | `/settings/mqtt` | `apps/web/src/pages/MqttSettings/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `StatusBadge`, `ActionCluster`, `KioskInput`, `KioskToggle` | page-local `requestJson()` calls to `/api/settings/mqtt`, `/api/settings/mqtt/topics`, `/api/settings/mqtt/test`, `/api/settings/mqtt/reload` | broker/topic fields and save/test results: runtime-bound; status banner/loading/error text: runtime-bound with fallback-only wording; illustrative dense layout tokens: reference-only |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/10-circuit-settings.html` | `/settings/circuits` | `apps/web/src/pages/CircuitSettings/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `ActionCluster`, `KioskInput`, `KioskToggle` | page-local helpers over `requestJson("/api/circuits")` CRUD in `apps/web/src/pages/CircuitSettings/index.tsx` | circuit CRUD fields/list rows: runtime-bound; validation/error/message copy: runtime-bound with fallback-only defaults; table/form density: reference-only |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/11-energy-data-history.html` | `/history` | `apps/web/src/pages/EnergyHistory/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `MetricCard`, `DataCardGrid` | current page-local `dailySummaries` mock array in `apps/web/src/pages/EnergyHistory/index.tsx` | summary cards/table layout: reference-only; historical rows/totals today fallback-only; future history API payload: runtime-bound |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/12-offline-error-display.html` | `/offline` | `apps/web/src/pages/OfflineError/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `StatusBadge`, `ActionCluster` | `useLiveMetrics()`, `useMqttStatus()`, `getSocketClient()`, React Router `location.state.returnTo` | reconnect state/countdown/navigation: runtime-bound; offline illustration/copy tone: reference-only; last-updated fallback text: fallback-only |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/13-slideshow-preview.html` | `/slideshow-preview` | `apps/web/src/pages/SlideshowPreview/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `ActionCluster`, `MediaSlot` | `usePageRotation()` | current page/progress/queue/settings summary: runtime-bound; preview frame visuals: reference-only; empty queue copy: fallback-only |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/14-device-status-details.html` | `/device-status` | `apps/web/src/pages/DeviceStatus/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `MetricCard`, `ActionCluster` | `requestJson("/api/device/status")`, `requestJson("/api/device/reboot")`, `requestJson("/api/device/clear-cache")` | device stats and maintenance actions: runtime-bound; loading placeholders/failure quiet-fallbacks: fallback-only; card composition and hardware storytelling: reference-only |

## Downstream Verification Matrix

| Batch | Prototype scope | Required command verification | Required manual verification | Evidence gate |
| --- | --- | --- | --- | --- |
| Shell foundation | witness routes only | `pnpm --filter @solar-display/web test -- src/components/shellFoundation.test.ts` and `pnpm --filter @solar-display/web build` | compare `/overview` and `/settings/playback` header/footer/page number/content canvas | no downstream route batch starts before witness evidence exists |
| Playback batch A | `01-overview` + `02-solar` | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/web test -- src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts src/layouts/offlineRouting.test.ts` | compare `/overview` and `/solar` against prototype hierarchy; verify offline redirect and rotation still behave | requires shell evidence + baseline mapping |
| Playback batch B | `03-factory-circuit` | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/web test -- src/layouts/offlineRouting.test.ts` | compare flow diagram, circuit card density, empty-state behavior | requires playback batch A evidence |
| Playback batch C | `04-images` + `05-sustainability` | `pnpm --filter @solar-display/web build` | compare media slot, thumbnail hierarchy, sustainability hero and big-number sections; verify placeholder/fallback states | requires playback batch B evidence |
| Settings batch A | `07-playback-settings` + `08-image-management` | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/server test -- src/routes/playback.test.ts src/routes/images.test.ts` | smoke test reorder, enable toggle, save, image row readability and quick actions | requires shell evidence + baseline mapping |
| Settings batch B | `09-mqtt-settings` | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/server test -- src/routes/settings-mqtt.test.ts src/routes/settings-mqtt-save-regression.test.ts` | smoke test save/test/error/loading/topic mapping flows | requires settings batch A evidence |
| Settings batch C | `10-circuit-settings` | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/server test -- src/routes/circuits.test.ts` | smoke test create/update/delete/load-failure messaging | requires settings batch B evidence |
| Monitoring / maintenance batch | `06-energy-trend-summary` + `11-energy-data-history` + `12-offline-error-display` + `13-slideshow-preview` + `14-device-status-details` | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/web test -- src/layouts/offlineRouting.test.ts src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts` | verify chart/table readability, offline recovery, slideshow controls, device maintenance feedback | requires settings batch C evidence |
| Umbrella final closeout | all `01-14` | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/web test`; `pnpm --filter @solar-display/server test`; `spectra analyze align-solar-display-with-fhd-prototype --json`; `spectra validate align-solar-display-with-fhd-prototype` | 14-route walkthrough with shell consistency, footer navigation, page number, offline behavior, settings smoke summary | no archive/closeout without saved evidence bundle |

## Risks / Trade-offs

- [如果 foundation scope 膨脹成完整頁面改版] → 明確禁止在本 change 內完成 route-specific page body 對位。
- [如果 mapping baseline 寫得太抽象] → 每頁必須列出實際 route、page file、shared primitives、資料來源與 classification。
- [如果 shell primitive 名稱只停留在 spec 而無程式落點] → 在 `apps/web/src/components/` 直接建立 `TitleBlock`、`SectionWrapper`、`ActionCluster`、`MediaSlot` 實作，讓後續 batch 可直接引用。
