# All Pages Reference-Match Checklist

日期：2026-05-14

## Scope

此文件是全站 reference-match QA closeout ledger，承接：

- `docs/reference-match/all-pages-audit.md`
- shared Kuozui FHD shell / reference components migration
- display/playback routes migration
- settings/management routes migration

此文件回答的是「目前每條 route 的 closeout 狀態與證據」，不是重新定義 migration scope。

## Playback Protected-Canonical Inputs

對 `/overview`、`/solar`、`/factory-circuit`、`/images`、`/sustainability` 做 visual review 時，除了本文件的 closeout evidence，還要額外檢查：

- `docs/display-surface-visual-review-checklist.md`
- `docs/reference-match/playback-visual-canonicals.md`

review 不能只寫 `close` 或 `needs manual QA`；還要明確看過：

- `Hero hierarchy`
- `Card-family rhythm`
- `Photo fade`
- `Source-like icon language`
- `Absolute composition`
- `Distance readability`

如果有任何 shared primitive reuse 讓 playback focus region 看起來像 settings board、toolbar、table-first panel，必須標記為 `management-surface drift`，不能當作單純微調。

## Status Vocabulary

- `matched`
  - shell、layout、typography、asset binding、data/interaction 已接近 reference，且沒有已知阻塞 gap。
- `close`
  - 主要結構已對齊 reference，剩餘 gap 以微調或人工目視比對為主。
- `partial`
  - 已有部分 reference 結構或資產，但仍有明顯 drift，不能宣稱接近完成。
- `needs manual QA`
  - 不代表功能失敗；代表此頁的最終 visual evidence 仍需人工目視比對，不能只靠目前 repo 內自動化證據下結論。

判讀規則：

- `Overall Status` 評估頁面整體 alignment reality。
- `Screenshot Status` 單獨評估證據狀態，不覆蓋 `Overall Status`。
- 本輪沒有任何頁面宣稱 `matched`。

## Screenshot Evidence Policy

- repo 目前沒有 Playwright、Puppeteer、Chromatic、ImageMagick 或其他正式 screenshot / diff tooling。
- 本輪沒有新增大型 screenshot framework，符合 QA change scope guard。
- `docs/reference-match/screenshots/current/`、`reference/`、`diff/` 已保留為 evidence container，但目前不作為正式自動比對輸出。
- 本機曾以外部 `chromium` 做過小範圍 ad hoc smoke 截圖：
  - `/tmp/reference-settings-smoke/playback-settings.png`
  - `/tmp/reference-settings-smoke/image-management.png`
  - `/tmp/reference-settings-smoke/mqtt-settings.png`
  - `/tmp/reference-settings-smoke/circuit-settings.png`
- 由於 route-by-route 全批次截圖在本機 external Chromium 上不穩定，且 repo 內沒有正式 screenshot/diff stack，本文件對所有頁面一律標記 `manual screenshot required` 作為 authoritative screenshot status。

## Verification Summary

- `pnpm --filter @solar-display/web build`
  - 通過
- `pnpm --filter @solar-display/web exec tsx --test src/pages/PlaybackSettings/viewModel.test.ts src/pages/ImageManagement/viewModel.test.ts src/pages/MqttSettings/viewModel.test.ts src/pages/CircuitSettings/viewModel.test.ts`
  - 9/9 通過
- `pnpm --filter @solar-display/server test -- src/routes/settings-mqtt.test.ts src/routes/settings-mqtt-save-regression.test.ts src/routes/circuits.test.ts`
  - 通過
  - 注意：server script 會實際跑整包 `src/**/*.test.ts`，不是只跑 3 支指定檔；整包結果通過。

## Route Summary Table

| Route | Reference | Overall Status | Screenshot Status | Notes |
| --- | --- | --- | --- | --- |
| `/overview` | `01-overview.html` | `close` | `needs manual QA` | FHD playback canvas、title group、hero、KPI 已切到 reference-style absolute composition。 |
| `/solar` | `02-solar.html` | `close` | `needs manual QA` | 目前是最完整的 asset-bound page，flow nodes/connectors/KPI row 已按 reference 重新排。 |
| `/factory-circuit` | `03-factory-circuit.html` | `close` | `needs manual QA` | title group、flow diagram、load panel、KPI band 已切到 reference-style playback composition。 |
| `/images` | `04-images.html` | `close` | `needs manual QA` | 主 stage、資訊側欄、縮圖帶已改成 fixed playback composition。 |
| `/sustainability` | `05-sustainability.html` | `close` | `needs manual QA` | storytelling title、hero、compact KPI/stat cards 與 highlight rail 已切到 reference canvas。 |
| `/trends` | `06-energy-trend-summary.html` | `close` | `needs manual QA` | chart staging、summary cards、header cluster 已改成 reference-like absolute layout。 |
| `/settings/playback` | `07-playback-settings.html` | `close` | `needs manual QA` | management shell 保留，內部 control board / page list / status panels 已重排。 |
| `/settings/images` | `08-image-management.html` | `close` | `needs manual QA` | upload/library/editor 三區已改成 reference panel hierarchy，互動保留。 |
| `/settings/mqtt` | `09-mqtt-settings.html` | `close` | `needs manual QA` | broker/topic/mapping/preview 四區與 display-state mapping 已收斂。 |
| `/settings/circuits` | `10-circuit-settings.html` | `close` | `needs manual QA` | table hierarchy、feedback panel、row validation/dirty mapping 已集中。 |
| `/history` | `11-energy-data-history.html` | `close` | `needs manual QA` | selector/KPI/chart/summary band 已改成 reference-like information wall。 |
| `/offline` | `12-offline-error-display.html` | `close` | `needs manual QA` | centered offline panel、background media 與 retry/reconnect contract 已切到 reference error surface。 |
| `/slideshow-preview` | `13-slideshow-preview.html` | `close` | `needs manual QA` | status rail、carousel stage、summary band 已遷移。 |
| `/device-status` | `14-device-status-details.html` | `close` | `needs manual QA` | 左列 status、中央詳情、右側 photo/resource panel 已遷移。 |

## Per-Route Checklist

### `/overview`

- Current React file: `apps/web/src/pages/Overview/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/01-overview.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/01-overview.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
  - 使用共用 FHD playback canvas 與 shared shell。
- Layout status: `close`
  - hero、title、KPI row、supporting panels 已脫離 dashboard grid。
- Typography status: `close`
  - bilingual title hierarchy 已接近 reference，但仍需人工看字距與 line-height。
- Asset binding status: `partial`
  - 使用 reference-oriented image binding，但沒有 page-artifacts manifest。
- Data/interaction status: `close`
  - `useLiveMetrics()` 與 fallback 行為保留。
- Screenshot status: `needs manual QA`
  - repo 無正式 screenshot stack；authoritative evidence 需人工對照。
- Remaining gaps:
  - hero image crop、標題字距、KPI 卡片底部節奏仍需人工目視比對。

### `/solar`

- Current React file: `apps/web/src/pages/Solar/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/02-solar.css`
- Asset manifest: `docs/reference/kuozui-green-fhd-html-prototype/page-artifacts/02-solar/asset-manifest.json`
- Canvas/shell status: `close`
- Layout status: `close`
  - title group、hero banner、flow diagram、KPI row 已按 reference 座標重建。
- Typography status: `close`
- Asset binding status: `close`
  - hero 與 generated PNG icons 已綁定。
- Data/interaction status: `close`
  - `useLiveMetrics()`、`buildSolarViewModel()`、fallback 保留。
- Screenshot status: `needs manual QA`
- Remaining gaps:
  - connector thickness、hero crop、KPI vertical rhythm 仍非 pixel-perfect。

### `/factory-circuit`

- Current React file: `apps/web/src/pages/FactoryCircuit/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/03-factory-circuit.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
- Layout status: `close`
  - 已切到 reference-like playback composition，主體不再依賴舊版 `PageScaffold` body。
- Typography status: `close`
- Asset binding status: `partial`
- Data/interaction status: `close`
  - circuits API、threshold mapping、empty state 與 fallback flow 都仍保留。
- Screenshot status: `needs manual QA`
- Remaining gaps:
  - connector thickness、bottom KPI vertical rhythm、leaf watermark opacity 仍需人工微調。

### `/images`

- Current React file: `apps/web/src/pages/Images/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/04-images.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
- Layout status: `close`
  - media stage、meta rail、thumbnail row 已固定到 reference-like composition。
- Typography status: `close`
- Asset binding status: `partial`
  - 使用現有圖片與 reference still asset，但無 manifest。
- Data/interaction status: `close`
  - 圖片列表與 fallback 保留。
- Screenshot status: `needs manual QA`
- Remaining gaps:
  - 主視覺裁切、thumb 密度與 caption 字級需人工比對。

### `/sustainability`

- Current React file: `apps/web/src/pages/Sustainability/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/05-sustainability.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/05-sustainability.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
- Layout status: `close`
  - title group、hero、compact KPI/stat cards 與 highlight rail 已接到固定 FHD composition。
- Typography status: `close`
- Asset binding status: `partial`
- Data/interaction status: `close`
- Screenshot status: `needs manual QA`
- Remaining gaps:
  - hero crop、highlight rail density、Trees card 數值節奏仍需人工比對。

### `/trends`

- Current React file: `apps/web/src/pages/EnergyTrend/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/06-energy-trend-summary.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/06-energy-trend-summary.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
- Layout status: `close`
  - chart card、summary metrics、refresh control 已改為 reference-like stage。
- Typography status: `close`
- Asset binding status: `partial`
  - chart 為程式化視覺，無 page-artifact。
- Data/interaction status: `close`
  - 趨勢資料 hook 與 fallback 保留。
- Screenshot status: `needs manual QA`
- Remaining gaps:
  - chart gridline、tab spacing、圖例細節仍需人工視覺檢查。

### `/settings/playback`

- Current React file: `apps/web/src/pages/PlaybackSettings/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/07-playback-settings.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/07-playback-settings.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
  - 保留 management shell，但 page internals 已切到 reference panel hierarchy。
- Layout status: `close`
  - summary row、control panel、status side panel、page list 已重排。
- Typography status: `close`
- Asset binding status: `partial`
  - 以 shared glyph/primitives 為主，非 page-specific assets。
- Data/interaction status: `close`
  - load/save/reorder/schedule/idle 行為保留並有 viewModel test。
- Screenshot status: `needs manual QA`
  - ad hoc smoke screenshot: `/tmp/reference-settings-smoke/playback-settings.png`
- Remaining gaps:
  - 仍保留 management title block，不是 playback canvas。
  - button/toggle 細節還沒做 full pixel matching。

### `/settings/images`

- Current React file: `apps/web/src/pages/ImageManagement/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/08-image-management.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/08-image-management.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
- Layout status: `close`
  - upload zone、library grid、editor panel 已切成 reference board hierarchy。
- Typography status: `close`
- Asset binding status: `partial`
  - 使用 runtime image previews，無 page-artifact manifest。
- Data/interaction status: `close`
  - upload/library/selection/preview/save/delete 保留。
- Screenshot status: `needs manual QA`
  - ad hoc smoke screenshot: `/tmp/reference-settings-smoke/image-management.png`
- Remaining gaps:
  - editor panel 的欄位密度、thumb crop 與 toggle 細節需人工目視比對。

### `/settings/mqtt`

- Current React file: `apps/web/src/pages/MqttSettings/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/09-mqtt-settings.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
- Layout status: `close`
  - broker、live topic、mapping、preview 已切成 dense 4-panel board。
- Typography status: `close`
- Asset binding status: `partial`
  - 以 shared glyph + runtime data cards 為主，非 manifest-driven page assets。
- Data/interaction status: `close`
  - load/save/test/reload/topic mapping/disabled-loading-error-success 保留。
- Screenshot status: `needs manual QA`
  - ad hoc smoke screenshot: `/tmp/reference-settings-smoke/mqtt-settings.png`
- Remaining gaps:
  - dense panel padding、數值字級、runtime badge 細節仍需人工比對。

### `/settings/circuits`

- Current React file: `apps/web/src/pages/CircuitSettings/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/10-circuit-settings.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/10-circuit-settings.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
- Layout status: `close`
  - 主表格與 feedback side panel 已切成 reference-like table hierarchy。
- Typography status: `close`
- Asset binding status: `partial`
  - icon 以 shared glyph mapping 處理，無 page-artifact manifest。
- Data/interaction status: `close`
  - list/create/edit/delete/save/dirty/validation 行為保留。
- Screenshot status: `needs manual QA`
  - ad hoc smoke screenshot: `/tmp/reference-settings-smoke/circuit-settings.png`
- Remaining gaps:
  - table column density、threshold cell spacing、legend 視覺仍需人工校對。

### `/history`

- Current React file: `apps/web/src/pages/EnergyHistory/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/11-energy-data-history.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/11-energy-data-history.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
- Layout status: `close`
- Typography status: `close`
- Asset binding status: `partial`
  - chart/table 皆為程式化渲染。
- Data/interaction status: `close`
- Screenshot status: `needs manual QA`
- Remaining gaps:
  - 圖表密度、底部 summary band、table strip 細節需人工目視比對。

### `/offline`

- Current React file: `apps/web/src/pages/OfflineError/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/12-offline-error-display.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/12-offline-error-display.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
- Layout status: `close`
- Typography status: `close`
- Asset binding status: `partial`
- Data/interaction status: `close`
  - 離線 routing、自動返回、retry countdown 與手動重試行為保留。
- Screenshot status: `needs manual QA`
- Remaining gaps:
  - icon glyph、detail row line-height、background fade 與 action density 仍需人工微調。

### `/slideshow-preview`

- Current React file: `apps/web/src/pages/SlideshowPreview/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/13-slideshow-preview.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/13-slideshow-preview.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
- Layout status: `close`
- Typography status: `close`
- Asset binding status: `partial`
  - slideshow preview stills 已綁定，但無 manifest。
- Data/interaction status: `close`
  - preview queue/controls/fallback 保留。
- Screenshot status: `needs manual QA`
- Remaining gaps:
  - stage scale、carousel card overlap 與 dots 細節需人工對照。

### `/device-status`

- Current React file: `apps/web/src/pages/DeviceStatus/index.tsx`
- Reference HTML file: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/14-device-status-details.html`
- Reference CSS file: `docs/reference/kuozui-green-fhd-html-prototype/styles/pages/14-device-status-details.css`
- Asset manifest: `N/A`
- Canvas/shell status: `close`
- Layout status: `close`
- Typography status: `close`
- Asset binding status: `partial`
  - photo/resource visuals 有對應資產，但不是 manifest-driven。
- Data/interaction status: `close`
  - device info/resource/action state 保留。
- Screenshot status: `needs manual QA`
- Remaining gaps:
  - photo crop、gauge/resource density、panel 邊界仍需人工微調比對。

## Remaining Global Gaps

1. 所有頁面的 authoritative screenshot evidence 仍需人工比對，因 repo 沒有正式 screenshot/diff tooling。
2. 目前沒有任何頁面宣稱 `matched`；已遷移頁面最多只能誠實標為 `close`。
3. `asset manifest` 完整度仍只有 solar 最好；其他頁面多為 reference-inspired asset binding，而不是 artifact-driven exact binding。
4. `/factory-circuit`、`/sustainability`、`/offline` 已進入 `close`，但仍有 typography、crop 與 spacing 細節需要人工目視比對。
