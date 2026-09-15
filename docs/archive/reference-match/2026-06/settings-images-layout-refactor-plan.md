# Settings / Images 排版重構計畫

> 狀態：規劃完成、待實作
> 範圍：`/settings/circuits`、`/settings/playback`、`/settings/images`
> 日期：2026-06-09

## Context

使用者反映 `settings` 群組與 `images` 管理頁「排版不實用、雜訊太多」。經探索確認三頁各自累積了重複標題、裝飾性元素、密集雙語 label、分散的控制項、過窄的編輯區與大量 inline style。

本次重構同時做三件事：**排版整理 + 資訊架構重排 + 視覺語彙統一**。FHD 對照以實用性為主，維持 1920×1080 固定畫布與 absolute positioning 框架。

### 硬性邊界

- 不改 API、資料模型、`viewModel.ts` 輸出語意。
- 不重寫邏輯（stepper 長按、drag 排序、save/add/delete、`CircuitRow` 欄位行為）。
- 不用 page-local hardcode 繞過 editor handoff（crop/focus、asset workspace link 保留）。
- 複用 `apps/web/src/styles/management.css` 既有語彙與 management 元件；新增 class 一律 page-scoped。
- 不刪 `management.css`（跨頁共用）。

### 共用基底參考

`management.css` 提供：`.mgmt-page-title*`、`.mgmt-action(.primary/.danger)`、`.mgmt-status(.is-*)`、`.mgmt-stat-strip` / `.mgmt-stat`、`.mgmt-chip(.is-*)`、`.mgmt-banner(.is-*)`、`.settings-card`，以及 CSS 變數 `--mgmt-page-surface-left:50` / `-top:118` / `-width:1820`。

---

## 已確認的產品決策

1. Playback action 按鈕 → **右上角**，與其他 settings 頁一致。
2. Playback 卡片 title 的 01-04 badge 與 info icon tooltip → **都移除**（輪播順序卡內列表的功能性序號保留）。
3. Circuit readiness findings → **僅 blocking 逐筆展開**；warning-only 收成摘要句。
4. Image 上傳入口 → **只留 library 內 drop zone**，移除右上「上傳圖片」按鈕。

---

## 頁 1：CircuitSettings（先做，風險最低）

檔案：`apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx`、`circuitSettings.css`

| # | 改動 | 位置 | 細節 |
|---|------|------|------|
| 1 | 雙重標題收斂 | `CircuitSettingsContent.tsx:153-156` | 卡片標題主字 `廠區用電迴路` → `迴路清單`；small 改 `{totalCircuitCount} 筆 · 顯示 {enabledCircuitCount}`。h1=頁面身份、卡片=資料摘要。只改文字不改 class。 |
| 2 | 移除 legend | JSX `:237-241` + CSS `.cs-legend*` | 與 table header `.cs-th-dot` 三色點重複。確認 thead `position:sticky` 生效，圖例隨捲動可見。 |
| 3 | findings 改 blocking-only | JSX `:203` | 條件由 `readinessFindings.length > 0` 改為 `blockingReadinessCount > 0`（計數已存在 `:78-79`）。warning-only 靠 `readinessSummary`（`:89-95`）。`slice(0,3)` 不變。 |
| 4 | 垂直節奏收緊 | `circuitSettings.css` | `cs-stats { margin-bottom:16→10; gap:24→20 }`、`cs-readiness { margin-bottom:14→8 }`、`cs-readiness-list { gap:10→8; margin-bottom:16→10 }`。回收空間由 `cs-table-wrap`（`flex:1`）吸收。 |
| 5 | table 欄寬精簡 | `circuitSettings.css` | 目標消除水平捲動（卡內可視寬約 1776）：`col-order 70→56` / `col-name 320→300` / `col-icon 160→132` / `col-topic 280→240` / `col-thr 160→138`(×3) / `col-display 200→220` / `col-ops 130→110`；`min-width 1620→1560`；thead/tbody padding `12px→10px`。實機驗 `col-thr 138` 容納 `is-narrow×2+dash`，不足則 `is-narrow 64→58`。 |
| 6 | inline → class | `.cs-page` scope | `:145` `opacity:.78`→`.cs-status__detail`；`:178` 灰→`.cs-stat__value.is-muted{color:#888d86}`；`:194` 條件色→`.cs-stat__value.is-dirty-accent{color:#c9881a}`+`.is-muted`；`:228/:233` `fontSize:13`→`.cs-empty__hint`。 |

---

## 頁 2：PlaybackSettings

檔案：`apps/web/src/pages/PlaybackSettings/index.tsx`、`PlaybackSettingsFormSections.tsx`、`playbackSettings.css`、`layout.ts`（文件同步，非 runtime）

1. **三層標題 → 雙層**（對齊 sibling）：`index.tsx:254-262` 移除 `.ps-header-area` wrapper 與 `h2.ps-header-slogan` kicker：
   ```tsx
   <section className="ps-title mgmt-page-title">
     <h1 className="mgmt-page-title__heading">播放<em>設定</em></h1>
     <p className="mgmt-page-title__subtitle">Playback Settings</p>
   </section>
   ```
   CSS 刪 `.ps-header-area`、`.ps-header-slogan`（約 13-24 行）。標題吃 `.mgmt-page-title` 預設座標。

2. **action 按鈕回右上**：`index.tsx:264-285` 拆掉 `.ps-actions` wrapper，兩顆 `.mgmt-action` 直接作 page 子節點。CSS 刪 `.ps-actions*`（約 27-47），改 `.ps-resync { left:1316; width:250 }`、`.ps-save { left:1595; width:250 }`（top:22 由 `.mgmt-action` 基底提供）。`.ps-status` 對齊 sibling 右上 `right:50; top:92`，width 需核對不與按鈕 x 範圍（左緣 1316）重疊，必要時縮窄至 ~430 或下移避讓。

3. **移除卡片裝飾**（`PlaybackSettingsFormSections.tsx`）：刪 4 處 `.ps-badge-number`（01-04，`:207/:286/:323/:396`）與 4 處 `.ps-info-icon` tooltip（`:208-218/:288-297/:325-334/:398-407`）。CSS 刪 `.ps-info-icon`+tooltip 全套（約 305-381）與 `settings-card__title .ps-badge-number` 放大規則（約 184-194）。**保留**輪播順序卡列表項序號（`:256` 功能性）與基底 `.ps-badge-number`。雙語 label 全保留。

4. **垂直節奏重排**：preview surface 拉成頂部整列 `left:50; top:118; width:1820; height≈300`；`.ps-bottom-cards top:378→442`。**關鍵風險**：`.ps-card-wrapper height:478` 在新 top 下會溢出畫布底（442+478>858），須同步縮高至約 372–380 或改自適應，實機驗證底部不裁切。

5. **inline → class**：`PlaybackSettingsFormSections.tsx:371-386` transition speed input 的 11 屬性 inline → 新增 `.ps-text-input`（width:130; height:38; border/radius/padding 對照原值; text-align:right; `font:400 14px/1 var(--font-family-en)`; color:#344039）+ `.ps-text-input:disabled { background:#fbfbfa; opacity:.55; cursor:not-allowed }`。disabled 樣式靠 `:disabled` selector（邏輯不動）。勿與 stepper 專用 `.ps-stepper-input` 混用。

---

## 頁 3：ImageManagement（範圍最大）

檔案：`apps/web/src/pages/ImageManagement/ImageManagementContent.tsx`、`imageManagement.css`

1. **左右卡片比例**：`.im-card-library { left:50; width:1180 }`、gap 30、`.im-card-editor { left:1260; width:610 }`（editor 460→610 +33%）。

2. **縮圖 grid 精簡**：`.im-grid` 5→4 欄，固定欄寬上限避免少量圖片拉伸：`grid-template-columns: repeat(4, minmax(0,273px)); justify-content:start; align-content:start`。`.im-thumb__media height:124→150`。JSX `:343-358` 移除 `.im-thumb__filename`、`.im-thumb__meta` 兩行（保留縮圖+order badge+chips+標題一行）；`.im-thumb__body` padding 收 `8px 10px`。viewModel 欄位不動（editor preview 仍用）。

3. **editor 內容分層**（610 寬）：
   - 主層常駐：preview（media 200）+ asset title/desc + 封面 chip + aspect ratio + crop/focus handoff link。
   - 次層收進 `<details class="im-disclosure">`（預設收合）：
     - 「播放設定 Playlist Runtime」整段（`:393-515`），summary 顯示「播放設定 · {N} 列」；內部 order/duration 兩個 stepper 用既有 dead class `.im-form-grid`(1fr 1fr) 並排。
     - 「展示引用 Display References / Triage」（`:544-573`），summary 顯示 live/draft/slideshow 計數，legend 改用 `.mgmt-chip`。
   - Delete Blockers（`:575-590`）**不收合**，改 `.mgmt-banner.is-error` 並移到 actions 上方。

4. **入口/控制整併**：
   - 移除右上 `.im-upload-btn`（JSX `:216-219`），只留 library 內 `.im-uploader` drop zone。右上只留 `.im-resync`（重定位 `left:1620; top:22; width:250`）。
   - 移除 `.im-handoff` 整塊（JSX `:239-248` + CSS `.im-handoff*`），handoff link 縮為 library 標題列右側單行 link（回收 ~100px 給 grid）。
   - `.im-status`（現絕對定位 top:92）改放進 library 標題列 inline，或窄化避免爭位。
   - `.im-stats` 改用共用 `.mgmt-stat-strip`/`.mgmt-stat`（刪本地 `.im-stats/.im-stat*`），tone 改 `.mgmt-stat__value.is-warning`，margin 收 `16→12`。

5. **inline → class**：`:226` `opacity:.75`→`.im-status__detail`；`:268` cover stat→`.im-stat__value.is-text`；`:288` set-all-duration grid→`.im-inline-apply`；`:339/:603` empty desc→`.im-empty__desc`；`:504` bootstrap wrap→`.im-inline-action`。

6. **新增/刪除 class**：
   - 新增（page-scoped）：`.im-disclosure`、`.im-disclosure__summary`（cursor:pointer; list-style:none; chevron）、`.im-inline-apply`、`.im-empty__desc`、`.im-status__detail`、`.im-inline-action`、`.im-stat__value.is-text`。
   - 刪除：`.im-handoff*`、`.im-stats/.im-stat*`（改用 mgmt-stat-strip）、`.im-triage__legend`（改 chip）。

---

## 實作順序

1. CircuitSettings（風險最低，先建立信心）
2. PlaybackSettings（注意卡片高度溢出）
3. ImageManagement（範圍最大：disclosure + 比例 + 入口整併）

每頁流程：CSS 降噪 → JSX 結構調整 → inline 抽 class → 實機驗證。

實作前 grep 確認移除安全（無外部消費者或測試斷言）：`im-upload-btn`、`ps-header-slogan`、`ps-badge-number`、`cs-legend`。

---

## 驗證

### 建置 / 測試
- `pnpm --filter @solar-display/web test`（以前端為主）。
- 動到共用 class 行為時補 `pnpm run build`。
- 先 grep 既有快照/斷言是否引用被刪 class。

### 瀏覽器 witness（`agent-browser` skill，1920×1080）
- `/settings/circuits`：table 無水平捲動、display 欄不溢出、findings warning-only 收為一句、legend 移除後 thead 色點仍可見、卡片底部不裁切。
- `/settings/playback`：雙層標題、按鈕右上、badge/tooltip 已移除、preview 頂部整列、4 卡不溢出底邊、transition speed input 樣式正常（含 disabled）。
- `/settings/images`：4 欄 grid + 少量圖片靠左不拉伸、editor 610 寬主層免捲動、disclosure 收合/展開正常、單一上傳入口、delete blocker 在 actions 上方、stats 用共用語彙。

### Edge case 目視
selection 為空、圖片數 0~3、readiness 無 finding 等情境逐一確認。
```
```
