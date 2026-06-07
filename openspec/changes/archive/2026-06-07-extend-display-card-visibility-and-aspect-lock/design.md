## Context

`/display-pages/editor` 已能拖曳、縮放、吸附、發布 Overview KPI 卡片（`display-editor-canvas-manipulation`、`display-editor-alignment-tools`、`display-page-layout-safety-guards`、`display-page-draft-live-publishing`），KPI 卡片各自註冊為 region（`overview-kpi-*`，geometry 走 left/top/width/height 路徑，inspector 有對應 number 欄位）。

缺口有二：region geometry schema 的 `resizeMode` 僅支援 `both/horizontal/vertical/none`，無等比例鎖定；卡片設定無 per-card 的 runtime 顯示旗標，`visibleWhen` 僅控制 inspector 欄位是否出現，與「卡片是否上牆」無關。本設計補上這兩項，套用於 Overview KPI 卡片，並保持其餘 editor 能力重用不重做。

## Goals / Non-Goals

**Goals:**

- region geometry schema 提供等比例鎖定縮放模式，canvas resize 在該模式下維持原始長寬比。
- 顯示卡片設定具備 per-card `visible` 旗標，playback runtime 依旗標決定是否 render。
- editor 為支援卡片提供顯示/隱藏 toggle，寫回 draft 並沿用既有 draft/live 發布；隱藏卡片在 playback 不出現、在 editor 仍可選取與重新顯示。
- Overview 5 張 KPI 卡片為首個套用 surface。

**Non-Goals:**

- 不新增 Better 版的三相電力／發電趨勢／警示通知 widget 與其資料串接（屬後續獨立 change）。
- 不改底部導覽列或新增導覽圖示（屬後續獨立 change）。
- 不改版面安全守則對隱藏卡片的驗證範圍：隱藏卡片的幾何仍須通過既有 layout safety 驗證，本次不放寬。
- 不改 shared header/footer 等 protected-product-choice。
- 不重做既有拖曳、吸附、draft/live、preset 能力。

## Decisions

### 以 resizeMode "proportional" 表達等比例鎖定縮放

在 `DisplayEditorRegionGeometrySchema.resizeMode` 的 union 增加 `"proportional"`。canvas resize 計算在該模式下，依拖動主軸位移推導另一軸，使 width/height 維持 region 起始長寬比；min/max 約束仍套用，超出時等比例夾住。
- 替代方案：在 geometry 另加 `lockAspectRatio?: boolean`。否決原因：與既有 `resizeMode` 概念重疊，會出現 `resizeMode:"horizontal"` 又 `lockAspectRatio:true` 的矛盾組合；用單一 enum 值表達互斥語意較乾淨。
- 替代方案：沿用 Shift 鍵臨時鎖比例。否決原因：展示牆 operator 需要的是「這張卡片永遠等比例」的持久約束，而非每次手動按鍵。

### 以 per-card visible 旗標與 editor toggle 表達卡片顯示與隱藏

Overview KPI 卡片設定每張新增 `visible: boolean`（預設 `true`），型別納入 `OverviewDisplayPageConfig`。playback runtime 對 `visible === false` 的卡片不 render。editor region 的 fields 各加一個 `fieldType: "toggle"` 欄位綁到 `["kpiCards", key, "visible"]`，沿用既有 draft 寫入與 draft/live 發布，無需新 persistence 管線。
- 替代方案：用既有 `visibleWhen`。否決原因：`visibleWhen` 是 inspector 欄位層級的條件顯示，與 playback render 無關，語意不符。
- 替代方案：直接從 config 移除卡片。否決原因：operator 要的是「暫時拿掉、之後再開」，刪除會遺失 geometry 與設定。

### 隱藏卡片仍維持既有幾何驗證

隱藏卡片在 playback 不 render，但其 geometry 仍走既有 layout safety 驗證，不放寬出血／重疊規則。確保「重新顯示」時版面仍合法，避免引入新的驗證分支。

## Implementation Contract

**行為：**
- editor 操作者對某 KPI 卡片切換「顯示／隱藏」toggle → 該卡片 draft 的 `visible` 改變；發布後，playback 的 Overview 對 `visible:false` 的卡片不渲染 DOM，對 `visible:true` 正常渲染；隱藏卡片在 editor 仍出現在 region 清單、可被選取並重新切回顯示。
- 對 `resizeMode:"proportional"` 的 region，於 canvas 任一把手拖動縮放 → 結果 width/height 維持該 region 起始長寬比（容許因整數像素四捨五入的 ±1px 誤差），且不超出 min/max 約束。

**介面／資料形狀：**
- `DisplayEditorRegionGeometrySchema.resizeMode` 型別：`"both" | "horizontal" | "vertical" | "none" | "proportional"`。
- `OverviewDisplayPageConfig.kpiCards[key]` 增加 `visible: boolean`；seed 預設五張皆 `true`。
- 每個 `overview-kpi-${key}` region 的 `fields` 增加一個 toggle：`{ fieldType: "toggle", id: "${key}-visible", label: "顯示", path: ["kpiCards", key, "visible"] }`。
- canvas resize 函式（`canvasInteractions.ts` 的 resize 幾何解算）接受 `resizeMode`，在 `"proportional"` 分支回傳維持比例的尺寸。

**失敗模式：**
- 既有設定無 `visible` 欄位時（migration），runtime 與 schema 解析以 `visible !== false` 視為顯示（缺省即顯示），不得因缺欄位而隱藏卡片或拋錯。
- `resizeMode` 未指定時維持現行預設行為（不鎖比例），不得改變既有 region 的縮放手感。

**驗收標準：**
- `apps/web/src/pages/Overview/cardVisibility.test.ts`：`visible:false` 的 KPI 卡片不出現在 render 輸出；缺省（未設 `visible`）視為顯示。
- `apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts`：`"proportional"` 模式下，給定起始矩形與拖動位移，回傳尺寸長寬比等於起始長寬比（±1px）。
- Overview seed/config 測試：五張 KPI `visible` 預設為 `true`；region schema 含對應 visible toggle 欄位。
- `pnpm --filter @solar-display/web test` 綠；`pnpm run build` exit 0。

**範圍邊界：**
- 僅 shared geometry schema、canvas resize 幾何、Overview KPI config／runtime／region 與其 tests。
- 不含 Better widget、導覽圖示、其他頁面套用、layout safety 規則調整。

## Risks / Trade-offs

- [既有 Overview draft 缺 `visible` 欄位導致 migration 風險] → schema 與 runtime 一律以「缺省即顯示」處理，並加測試覆蓋缺欄位案例。
- [等比例縮放在碰到 min/max 邊界時可能讓另一軸無法等比] → 邊界時以「先夾住觸界軸、再等比推導另一軸」，並接受 ±1px 取整誤差，於測試固定一組邊界案例。
- [proportional 模式擴大 union 可能影響既有耗用 resizeMode 的窮舉處理] → 變更後檢查所有讀取 `resizeMode` 的分支，補上 `"proportional"` 處理，避免落入未定義行為。
