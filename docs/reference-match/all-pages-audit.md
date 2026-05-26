# All Pages Reference Alignment Audit

日期：2026-05-13

## Scope

本文件比對以下兩組來源的「現況」差異，而不是重述既有 rollout 規劃：

- Current app:
  - `apps/web/src/pages/`
  - `apps/web/src/components/`
  - `apps/web/src/app/routeMeta.ts`
  - `apps/web/src/app/router.tsx`
  - `apps/web/src/layouts/LayoutShell.tsx`
  - `apps/web/src/styles/global.css`
  - `apps/web/src/styles/tokens.css`
- Reference prototype:
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/shell.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/components.css`
  - `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/`
  - `docs/reference/kuozui-green-fhd-html-prototype/page-artifacts/`
  - `docs/reference/kuozui-green-fhd-html-prototype/assets/generated/`

判讀標準：

- `not started`: route 存在，但幾乎看不出 reference page 的區塊結構。
- `partial`: 已有 page-specific 文案或區塊，但仍停留在 dashboard/grid/card 模型，與 reference 的 FHD canvas 差距明顯。
- `close`: 主要 shell、layout model、page composition 已接近 reference，只剩細部 refinement。
- `unknown`: 缺少足夠對照資訊。

本文件最初建立於 2026-05-13，作為全站 reference migration 的 baseline audit。經過 shared shell、display pages、settings pages 與最後三頁 migration 後，目前 14 條 route 都已有對應 reference page，且現況可判定為 14 條 route 全部 `close`、0 條 `matched`；authoritative closeout 狀態以 `docs/reference-match/all-pages-checklist.md` 為準。

## Launch Status Role

這份文件現在只負責 launch review 的 supporting input / supporting reference。

- authoritative launch status：`docs/reference-match/display-launch-witness-matrix.md`
- procedure / rerun pack：`docs/reference-match/display-launch-verification-pack.md`

本文件不再維護 page-by-page pass/fail/blocked。

## Reference HTML Pages

1. `01-overview.html`
2. `02-solar.html`
3. `03-factory-circuit.html`
4. `04-images.html`
5. `05-sustainability.html`
6. `06-energy-trend-summary.html`
7. `07-playback-settings.html`
8. `08-image-management.html`
9. `09-mqtt-settings.html`
10. `10-circuit-settings.html`
11. `11-energy-data-history.html`
12. `12-offline-error-display.html`
13. `13-slideshow-preview.html`
14. `14-device-status-details.html`

## Current Routes and Pages

1. `/overview` -> `apps/web/src/pages/Overview/index.tsx`
2. `/solar` -> `apps/web/src/pages/Solar/index.tsx`
3. `/factory-circuit` -> `apps/web/src/pages/FactoryCircuit/index.tsx`
4. `/images` -> `apps/web/src/pages/Images/index.tsx`
5. `/sustainability` -> `apps/web/src/pages/Sustainability/index.tsx`
6. `/trends` -> `apps/web/src/pages/EnergyTrend/index.tsx`
7. `/settings/playback` -> `apps/web/src/pages/PlaybackSettings/index.tsx`
8. `/settings/images` -> `apps/web/src/pages/ImageManagement/index.tsx`
9. `/settings/mqtt` -> `apps/web/src/pages/MqttSettings/index.tsx`
10. `/settings/circuits` -> `apps/web/src/pages/CircuitSettings/index.tsx`
11. `/history` -> `apps/web/src/pages/EnergyHistory/index.tsx`
12. `/offline` -> `apps/web/src/pages/OfflineError/index.tsx`
13. `/slideshow-preview` -> `apps/web/src/pages/SlideshowPreview/index.tsx`
14. `/device-status` -> `apps/web/src/pages/DeviceStatus/index.tsx`

## Page Mapping Table

| Current route | Current React file | Reference HTML file | Reference page CSS file | Page artifacts / asset manifest | Alignment status | Audit note |
| --- | --- | --- | --- | --- | --- | --- |
| `/overview` | `apps/web/src/pages/Overview/index.tsx` | `html-pages/01-overview.html` | `styles/pages/01-overview.css` | No | `close` | FHD playback canvas、title group、hero 與 KPI row 已切到 reference-style absolute composition。 |
| `/solar` | `apps/web/src/pages/Solar/index.tsx` | `html-pages/02-solar.html` | `styles/pages/02-solar.css` | Yes: `page-artifacts/02-solar/asset-manifest.json` | `close` | flow nodes、connector、hero 與 KPI row 已接上 generated assets 與 reference geometry。 |
| `/factory-circuit` | `apps/web/src/pages/FactoryCircuit/index.tsx` | `html-pages/03-factory-circuit.html` | `styles/pages/03-factory-circuit.css` | No | `close` | 已改成 reference-like title group、flow diagram、load panel 與 KPI band，保留 circuits fallback。 |
| `/images` | `apps/web/src/pages/Images/index.tsx` | `html-pages/04-images.html` | `styles/pages/04-images.css` | No | `close` | 主 stage、資訊側欄與縮圖帶已固定到 playback composition。 |
| `/sustainability` | `apps/web/src/pages/Sustainability/index.tsx` | `html-pages/05-sustainability.html` | `styles/pages/05-sustainability.css` | No | `close` | storytelling title、hero、compact KPI 與 stat cards 已對齊 reference body。 |
| `/trends` | `apps/web/src/pages/EnergyTrend/index.tsx` | `html-pages/06-energy-trend-summary.html` | `styles/pages/06-energy-trend-summary.css` | No | `close` | chart staging、summary metrics 與 header cluster 已遷移。 |
| `/settings/playback` | `apps/web/src/pages/PlaybackSettings/index.tsx` | `html-pages/07-playback-settings.html` | `styles/pages/07-playback-settings.css` | No | `close` | management shell 保留，但 control board/page list/status panels 已對齊 reference。 |
| `/settings/images` | `apps/web/src/pages/ImageManagement/index.tsx` | `html-pages/08-image-management.html` | `styles/pages/08-image-management.css` | No | `close` | upload/library/editor 三區已收斂到 reference panel hierarchy。 |
| `/settings/mqtt` | `apps/web/src/pages/MqttSettings/index.tsx` | `html-pages/09-mqtt-settings.html` | `styles/pages/09-mqtt-settings.css` | No | `close` | broker/topic/mapping/preview 四區與 display-state mapping 已集中。 |
| `/settings/circuits` | `apps/web/src/pages/CircuitSettings/index.tsx` | `html-pages/10-circuit-settings.html` | `styles/pages/10-circuit-settings.css` | No | `close` | table hierarchy、feedback side panel 與 validation/dirty mapping 已對齊。 |
| `/history` | `apps/web/src/pages/EnergyHistory/index.tsx` | `html-pages/11-energy-data-history.html` | `styles/pages/11-energy-data-history.css` | No | `close` | selector/KPI/chart/summary band 已切到 reference information wall。 |
| `/offline` | `apps/web/src/pages/OfflineError/index.tsx` | `html-pages/12-offline-error-display.html` | `styles/pages/12-offline-error-display.css` | No | `close` | centered offline panel、background media 與 retry/reconnect contract 已對齊 reference surface。 |
| `/slideshow-preview` | `apps/web/src/pages/SlideshowPreview/index.tsx` | `html-pages/13-slideshow-preview.html` | `styles/pages/13-slideshow-preview.css` | No | `close` | status rail、carousel stage、summary band 已遷移。 |
| `/device-status` | `apps/web/src/pages/DeviceStatus/index.tsx` | `html-pages/14-device-status-details.html` | `styles/pages/14-device-status-details.css` | No | `close` | 左列 status、中央詳情、右側 photo/resource panel 已遷移。 |

## Historical Baseline Drift Summary

### 1. Shell drift

- `apps/web/src/layouts/LayoutShell.tsx` 仍是 `header + scrollable main + footer` 的 flex stack。
- Reference `styles/shell.css` 是 `.viewport > .canvas` 的 1920x1080 fixed design canvas，再用 `transform` 縮放。
- Current app 沒有 page-level `.canvas` 容器，也沒有以設計座標管理 absolute regions。

### 2. Header / footer drift

- `apps/web/src/components/AppHeader.tsx` 使用即時秒數時鐘、環境卡片與 badge box。
- Reference shell 的 header 是 absolute-position brand area、product title、clock、date、weather、status pill，各區塊幾何固定。
- `apps/web/src/components/AppFooterNav.tsx` 目前把 playback/management tabs 分兩群，以 pills 呈現；reference footer 是單一 bottom nav strip、固定 page number pill、slogan 與 decorative branch。

### 3. Canvas drift

- `tokens.css` 雖然有 `--screen-width: 1920px`、`--screen-height: 1080px`，但 current render model 仍是 `max-w-[var(--screen-width)]` 的 centered container。
- `LayoutShell` 的 `main` 是 `overflow-auto`，代表頁面仍可滾動；reference shell 是 `overflow:hidden` 的 kiosk canvas。
- 這代表現在尺寸是「寬度上限」，不是 reference 那種「固定內部設計座標 + viewport scaling」。

### 4. `PageScaffold` dashboardization drift

- `apps/web/src/pages/shared/PageScaffold.tsx` 一律注入 `title / subtitle / description / page number` 的 management-style title block。
- `apps/web/src/components/PageContainer.tsx` 與 `TitleBlock.tsx` 進一步把頁面固定成「上方標題、下方內容」。
- 多數 reference pages 並不是這種資訊架構；它們直接把 title group、hero、chart、control cluster 當成 canvas objects。
- 這是目前全站最核心的 drift 來源。

### 5. Common component drift

- `MetricCard.tsx` 是通用玻璃卡片，不是 reference 的 absolute KPI card primitive。
- `FlowNode.tsx` 與 `FlowConnector.tsx` 是 dashboard-friendly 元件，缺少 reference 所需的 page-specific geometry、L-shape connector、display icon raster binding。
- `PanelCard.tsx` / `SectionWrapper` 將許多頁面自然推向「分區卡片」風格，與 reference 中大量 fixed-position control board / table / media stage 衝突。

### 6. Tailwind / global style drift

- `global.css` 與各 page 內大量 `rounded-[28px]`, `shadow-card`, `bg-white/92`, `grid-cols-*`, `gap-*` 形成統一的 dashboard/card 風格。
- Reference `components.css` 雖然也有 card primitive，但多數是 absolute-position usage，不是 current app 這種「整頁由 grid 撐開」。
- 目前 Tailwind utility 是主要 layout engine；reference 是 page CSS constants + absolute composition。

### 7. Asset pipeline drift

- `page-artifacts` 與 generated raster asset 真正存在的 page-specific bundle，現況只有 `02-solar`。
- 其他頁面雖然有 reference HTML/CSS，但缺少 page-object inventory、asset-manifest、object-binding-map 之類的配套。
- 這表示後續若要追 reference image/icon fidelity，不能假設每頁都已有同等資產基礎。

## Historical Baseline Per-Page Drift Summary

| Route | Layout model drift | Asset drift | Typography drift | Spacing drift | Interaction / data risk |
| --- | --- | --- | --- | --- | --- |
| `/overview` | Hero + KPI 仍是 grid/card，不是 reference hero canvas | 缺 page-specific hero asset binding bundle | Current `TitleBlock` 字級與 reference display title 不同 | KPI row 與 hero offset 不符 reference | 低，主要是 `useLiveMetrics()` fallback 保留 |
| `/solar` | Flow nodes 仍在右側 panel，不是 absolute diagram | 雖有 generated assets，但尚未映射到 reference geometry | Title/subtitle 層級較像 dashboard hero | Hero/photo/flow/KPI 都偏 grid spacing | 中，live metrics 與 fallback 需保留 |
| `/factory-circuit` | 三欄 grid 仍強於 reference diagram board | 無 page artifact bundle | 節點 label、summary 字級與 reference dense board 不同 | Diagram 與 circuit list 間距偏 dashboard | 高，circuits API、threshold、empty-state 都敏感 |
| `/images` | 主圖、側欄、縮圖仍是 card layout，不是 slideshow stage | 僅有 slideshow preview images，缺 page asset manifest | Hero/title 的 reference display typography 尚未建立 | 主圖高度、thumb band、info card 間距不符 | 中，placeholder 與 runtime image list 邊界要保留 |
| `/sustainability` | Story blocks 仍是 cards，不是 long-form FHD canvas | 缺 KPI/hero asset package | 大標與 big-number 字級不符 reference | 六張統計卡仍像 grid，不是 fixed row | 低到中，主要是 mock summary/fallback |
| `/trends` | Chart summary 還是標題下多卡片，不是 reference stage | 無 page artifact bundle | Tabs/mini chart typographic hierarchy 偏 app UI | 多個 card gap 過大，非 reference tight staging | 中，未來若接 history API 要小心 |
| `/settings/playback` | Form + summary 仍是 generic settings grid | 缺 page artifact bundle | Control title / label hierarchy 與 reference control board 不同 | Panel 間距與 reference absolute blocks 不同 | 中，保存與排序流程必須零回歸 |
| `/settings/images` | Asset list/edit panel 仍是 page scaffold 裡的 panels | 缺 artifact bundle | Dense metadata labels 未對齊 reference | Control bar、upload zone、edit panel 的幾何差很多 | 中，圖片操作與空清單狀態敏感 |
| `/settings/mqtt` | 四區塊仍是 grid，不是 reference dense board | 缺 icon/preview asset bundle | Dense labels/preview numbers 字級不一致 | Broker/topic/map/preview 區尺寸差大 | 高，save/test/loading/error 與 topic mapping 風險最高 |
| `/settings/circuits` | 列表與表單仍偏 CRUD dashboard，不是大表格 canvas | 缺 artifact bundle | 表頭、legend、status 欄 typography 未對齊 | Table row、toolbar、legend spacing 不符 | 高，CRUD、validation、error message 不能回歸 |
| `/history` | 缺 reference 左側 selector 與固定大圖表區 | 缺 chart asset bundle | Summary metric 與 chart heading 層級不同 | Current layout 以 grid 撐開，非 fixed dashboard wall | 中，歷史資料為 mock / API 混合 |
| `/offline` | Current 是左右雙欄 panels，reference 是單一 centered alert + background image | 缺 offline artwork binding | Alert headline / bilingual block 不同 | Error detail / retry bar spacing 不同 | 高，offline redirect、retry、returnTo 不可破壞 |
| `/slideshow-preview` | Current preview 是 blocks，不是 reference carousel stage | 只有 generated preview stills，缺 page artifact bundle | Stage title / current page numbers typography 有差 | Carousel, dots, summary band 幾何差大 | 高，`usePageRotation()`、prev/next/play 行為敏感 |
| `/device-status` | Current 是 cards + sections，不是 reference info wall + photo + gauge row | 缺 photo/gauge asset bundle | Hardware info與resource labels層級不符 | 左欄卡片、中央面板、右欄 photo/resources 幾何未對齊 | 高，device actions 與 API feedback 敏感 |

## Recommended Rollout Order

1. 共用 shell / canvas foundation
2. Playback batch A: `/overview` + `/solar`
3. Playback batch B: `/factory-circuit`
4. Playback batch C: `/images` + `/sustainability`
5. Settings batch A: `/settings/playback` + `/settings/images`
6. Settings batch B: `/settings/mqtt`
7. Settings batch C: `/settings/circuits`
8. Monitoring / maintenance batch: `/trends` + `/history` + `/offline` + `/slideshow-preview` + `/device-status`

這個順序與既有 openspec phase 規劃一致，而且符合 current code 的真實風險分布：先修 shell，才不會每頁重做；高互動頁最後拆開收斂。

## High-Risk Pages

- `/settings/mqtt`
  - 原因：broker form、topic mapping、save/test/loading/error state 很多，視覺改動最容易踩互動回歸。
- `/settings/circuits`
  - 原因：CRUD、dirty state、validation、list density 同時存在。
- `/factory-circuit`
  - 原因：要同時處理 flow diagram、circuits API、threshold mapping、empty state。
- `/offline`
  - 原因：routing、retry、returnTo 與 reconnect timing 不能被版面重構破壞。
- `/slideshow-preview`
  - 原因：preview state、queue、manual controls 與 `usePageRotation()` 高耦合。
- `/device-status`
  - 原因：device actions、runtime status、resource panels 與 error feedback 都敏感。

## Low-Risk Pages

- `/overview`
  - 主要是 hero/KPI composition 與 shell 對齊，資料來源單純。
- `/solar`
  - 雖然結構 drift 大，但已有部分資產基礎，且主要風險仍在版面，不在新 API。
- `/images`
  - 版面差距大，但互動複雜度相對低。
- `/sustainability`
  - 主要是 storytelling layout 與 big-number composition，資料面最輕。

## Suggested Implementation Phases

### Phase 0: Audit freeze

- 以本文件固定 page mapping、global drift 與風險排序。
- 不在這一階段改 route contract 或 backend。

### Phase 1: Shared shell and canvas

- 先處理 `LayoutShell`, `AppHeader`, `AppFooterNav`, `PageScaffold`, `PageContainer`, `TitleBlock`。
- 目標是建立真正的 `1920x1080 design canvas + viewport scaling`，並把 `PageScaffold` 從 playback page 主殼層抽離。

### Phase 2: Playback visual shell witnesses

- `/overview`
- `/solar`

目標：

- 驗證新的 playback canvas 是否可承載 hero/title/KPI/flow 等 absolute composition。
- `/solar` 順手驗證唯一現有 `page-artifacts/02-solar` 的資產綁定流程。

### Phase 3: Flow-heavy playback page

- `/factory-circuit`

目標：

- 驗證 flow node、connector、threshold mapping、empty-state 在新 canvas 下的可維護性。

### Phase 4: Media-heavy playback pages

- `/images`
- `/sustainability`

目標：

- 處理主媒體區、thumbnail/storytelling、big-number row 與 placeholder/fallback。

### Phase 5: Low-risk settings pages

- `/settings/playback`
- `/settings/images`

目標：

- 先把較低風險 control board/page density 收斂到 reference。

### Phase 6: High-risk settings pages

- `/settings/mqtt`
- `/settings/circuits`

目標：

- 最小化互動 regression。
- 每頁必須各自保留 save/test/CRUD smoke verification。

### Phase 7: Monitoring and maintenance pages

- `/trends`
- `/history`
- `/offline`
- `/slideshow-preview`
- `/device-status`

目標：

- 修正 dense information layout、runtime-sensitive flow、preview controls 與 maintenance feedback。

## Suggested Common Components to Fix First

1. `apps/web/src/layouts/LayoutShell.tsx`
   - 從 flex stack 改成 reference-style viewport/canvas host。
2. `apps/web/src/components/AppHeader.tsx`
   - 對齊 reference header geometry，而不是 current environment card。
3. `apps/web/src/components/AppFooterNav.tsx`
   - 對齊單一 footer nav strip、page number pill、slogan/branch decoration。
4. `apps/web/src/pages/shared/PageScaffold.tsx`
   - 不再作為 playback pages 的主要 layout shell。
5. `apps/web/src/components/PageContainer.tsx`
   - 降為 management page container，而不是全站預設骨架。
6. `apps/web/src/components/TitleBlock.tsx`
   - 從 generic section title，拆分成 management title block 與 playback title group。
7. `apps/web/src/components/FlowNode.tsx` / `FlowConnector.tsx`
   - 改成可支援 page-specific geometry 與 raster display assets，避免只剩 dashboard node/card。
8. `apps/web/src/components/MetricCard.tsx` / `PanelCard.tsx`
   - 避免讓 KPI 與 settings block 一律退化成同一種玻璃卡片。

## Audit Verdict

- Route mapping：完整，14 對 14。
- Alignment reality：目前 14 條 route 全部 `close`，但仍沒有任何一頁宣稱 `matched`。
- Primary blocker：已從 shell/canvas/layout model 未對齊，收斂成 screenshot evidence、crop、spacing 與 typography 微調。
- Asset readiness：真正完整的 page artifact bundle 目前只有 `02-solar`；其他頁面多為 reference-inspired asset binding。
- 建議：後續進入人工對照與小範圍 polish，不要再重新打開 shared shell 或 backend scope。
