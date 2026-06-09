## Context

`/overview` 兩排卡片版型已存在。KPI 卡 icon 外觀寫死於 `apps/web/src/pages/Overview/overview.css` 的 `.overview-kpi-icon-shell`（白色圓形）與 `.overview-kpi-icon-accent`（green/gold 二元），無法表達 Better 樣稿的「每卡分色＋圓角方形」icon chip。卡內樣式 schema 在 `apps/web/src/pages/shared/displayCardStyleConfig.ts` 目前只有 `iconBoxSize` 等欄位，沒有 icon chip 底色/形狀。發電趨勢卡 `GenerationTrendWidget.tsx` 以 `Sparkline`（細線）渲染，樣稿為填色面積圖。footer 內容種類（sparkline/progress/text/co2-tree/none）已由 `overview-kpi-footer-authoring` 提供，僅 seed 對映需校正。

## Goals / Non-Goals

**Goals:**

- 為每張 Overview KPI 卡與 density widget 提供可編輯的 icon chip 底色、前景色與形狀，經 draft/live 持久化並有 seed fallback。
- icon chip 外觀由 runtime CSS 變數驅動，取代寫死的二元 accent。
- 發電趨勢卡升級為完整資料視覺圖表（平滑填色曲線、Y 軸刻度／格線、X 軸標籤、資料點、峰值標記），維持 runtime-only 與空狀態規則。
- 校正五張 KPI 卡 seed footer 對映與卡片視覺參數，使其對齊 Better 樣稿，達成內容物 ≥90% 相似。
- 趨勢歷史語意校正為瞬時發電功率，並在 mock mode 以 runtime pipeline 產生日照鐘形歷史。

**Non-Goals:**

- 不動 `AppHeader` 頂列與 `AppFooterNav` 底部導覽 IA。
- 不新增 footer 種類、不重排卡片絕對座標。
- 不為其他 playback 頁導入 Better 樣稿，不取代 FHD 頁面 canonical。

## Decisions

- **icon chip 走既有 card-style schema 擴充，不另開 capability**：在 `displayCardStyleConfig` 的 card-style 設定加入 `iconChipBackground`（色字串）、`iconChipForeground`（glyph 色字串）與 `iconChipShape`（`circle` | `rounded-square`）三欄，與 `iconBoxSize` 同層；理由是 icon chip 屬卡內樣式，歸 `overview-card-internal-style-authoring` 最一致，避免新增平行 schema。
- **每卡分色靠既有 per-card cardStyles 結構**：Overview 已對每張卡持有獨立 cardStyle（index.tsx `createDisplayCardStyleConfig(resolvedConfig.cardStyles[key])`），分色即各卡設不同 `iconChipBackground`，無需新增 per-card 容器。
- **runtime var 命名沿用既有慣例**：輸出 `--display-card-icon-chip-bg`、`--display-card-icon-chip-fg` 與 `--display-card-icon-chip-radius`，由 `overview.css` 的 `.overview-kpi-icon-shell` / glyph 消費；`circle` → 50% radius、`rounded-square` → token radius。移除 `.overview-kpi-icon-accent` 的硬寫色，改吃 var。
- **趨勢卡採 Overview-only SVG chart，不引第三方圖表庫**：保留 shared `Sparkline` 的平滑能力以避免既有 caller 回退，但 Overview generation trend 另用專屬 chart helper / view，負責 smooth filled curve、Y 軸刻度與格線、X 軸標籤、每點資料點、peak 標記與 empty state，避免把 Overview-specific density 塞進 shared primitive。
- **漂亮鐘形曲線靠瞬時功率歷史與 mock runtime feed，不在 widget mock**：新增 `metric_snapshots.generation_power` 欄位，由 `SnapshotWriterService` 寫入瞬時功率；Overview 趨勢 reader 優先讀最近 24 筆 `generation_power`，缺值時 fallback 既有 `generation`。在 mock mode 由 `MockMetricsFeedService` 週期寫入 simulated instantaneous metrics 到 live-metrics store，讓既有 accumulator / snapshot-writer pipeline 自然生成鐘形歷史。
- **footer 對映與視覺參數只調 seed 與 CSS 預設**，不改 schema：在 `displayPageConfig.ts` 的 seed kpiCards 與 cardStyles 預設對齊樣稿。

## Implementation Contract

- **Behavior**：在 `/display-pages/editor` 選取任一 Overview KPI 卡或 density widget，inspector 顯示 icon chip 底色、前景色與形狀控制；變更即時反映於 preview，存檔後 live `/overview` 對應卡 icon chip 改變底色、glyph 色與形狀。發電趨勢卡在有 runtime series 時呈現平滑填色圖表、Y 軸刻度與格線、X 軸標籤、資料點與峰值標記；無資料時維持空狀態文字。mock mode 與 seed 後 `/overview` 趨勢卡皆可經 runtime path 呈現日照鐘形曲線。
- **Interface / data shape**：card-style 設定物件新增 `iconChipBackground: string`、`iconChipForeground: string` 與 `iconChipShape: "circle" | "rounded-square"`。runtime 輸出 CSS 變數 `--display-card-icon-chip-bg`、`--display-card-icon-chip-fg`、`--display-card-icon-chip-radius`。Overview chart helper 產出 nice Y ticks（top tick ≥ peak）與 chart coordinates。server schema 新增 `metric_snapshots.generation_power REAL`；趨勢 reader 優先讀 `generation_power`，缺值時 fallback `generation`。
- **Failure modes**：缺漏或非法 `iconChipBackground` / `iconChipForeground` / `iconChipShape` 時回退 seed 預設，與既有 card-style resolve 的 fallback 行為一致，不丟例外。趨勢卡無 series 時不渲染圖表，落回空狀態；若歷史缺 `generation_power`，reader fallback 既有 `generation` 而非失敗。mock feed 僅在 mock mode 啟動，非 mock 不寫 simulated readings。seed 採 idempotent upsert，重跑不重複堆積。
- **Acceptance criteria**：
  - `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/server test` 全綠；新增/更新測試覆蓋 icon chip schema resolve 的 fallback、CSS 變數輸出、Overview trend chart 的 Y 軸刻度／格線／資料點／peak 標記、有/無 series 分支、`generation_power` 歷史 fallback，以及 mock feed 產生的日照鐘形序列。
  - 既有 `overview-card-internal-style-authoring`、`overview-dashboard-widgets`、server seed 相關測試不退化。
  - live `/overview` witness 對照 Better 樣稿，五張 KPI 卡 icon chip 與趨勢卡曲線/標籤相符；差異記於本 change artifact。
- **Scope boundaries**：In scope — `displayCardStyleConfig.ts`、`displayPageConfig.ts`、`overview.css`、Overview trend chart/view files、`Sparkline.tsx`、`apps/server/src/db/seed.ts`、`apps/server/src/services/SnapshotWriterService.ts`、Overview trend reader / mock feed / migration 與對應測試、四條 spec delta。Out of scope — shell header/nav、其他 playback 頁、footer 種類新增、座標重排、production MQTT / accumulator 架構重寫。

## Risks / Trade-offs

- `Sparkline` 新增 smooth 選項屬共用元件改動：以預設關閉的布林選項保護既有呼叫端，風險可控；若日後需更複雜圖表再評估專用元件。
- `generation_power` 與 mock feed 屬跨子系統改動（web→server）：以單欄位 migration、reader fallback 與 mock-mode-only feed 縮小風險；production ingestion 路徑仍沿用既有 accumulator / snapshot writer。
- `overview-fhd-better-quality` 既有 frosted-glass 要求與 Better 的較輕視覺存在張力：本次以 card-style 參數調整（shadow strength、radius、opacity）對齊，不推翻 frosted-glass 要求，避免影響其他卡。
- icon chip 分色若 seed 配色與品牌規範不一致，僅需調 seed 值，不影響 schema。
