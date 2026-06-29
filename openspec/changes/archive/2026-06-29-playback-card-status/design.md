## Context

Playback 五頁的資料卡（KPI／數據卡）在指標尚未接好來源時只能顯示假數值或 `--`，無法表達「設置中」。逐卡開啟／隱藏目前僅 Overview 在 `/display-pages/editor` 提供控制；其餘四頁與 card rail 卡（`metric-highlight`／`household-equivalent`）雖然資料模型已有 `visible`，editor region schema 未暴露 toggle。

既有 `display-card-visibility-toggle` spec 已定義 runtime 對 per-card `visible` 的渲染行為與「editor 對宣告 visible 欄位的卡暴露顯示開關」的要求，僅實作覆蓋到 Overview。各頁卡片來源形態不一：Overview/Sustainability/card rail 為靜態 config 節點；Solar KPI row、FactoryCircuit 迴路負載卡、Images caption 卡為 story-runtime 驅動、無 per-card 靜態 config。

## Goals / Non-Goals

**Goals:**

- 為五頁資料卡新增 editor 可設定的「設置中」顯示狀態，runtime 在該狀態以「設置中」文字覆蓋數值、保留標題與卡片樣式，且不影響背後 binding／計算。
- 把「開啟／隱藏」editor 控制覆蓋擴充到五頁＋card rail 卡，沿用既有 `visible` flag 與 runtime 行為。
- 「設置中」與「隱藏」為兩個正交欄位，經既有 draft／live 流程持久化，缺省皆為正常顯示，向後相容舊 draft。

**Non-Goals:**

- 不改卡片背後的資料 binding、metric 計算或 MQTT 來源。
- 不新增正常／設置中以外的狀態值（維護中、離線等）。
- 不調整卡片版面、字級、樣式或 FHD 視覺。
- 不把 flow node、連接線、裝飾元素納入狀態控制。

## Decisions

### 設置中與隱藏採用兩個正交欄位而非單一三值列舉

`隱藏` 沿用既有 per-card `visible: boolean`（已被 `display-card-visibility-toggle` spec 與 runtime 採用）；`設置中` 新增 per-card `status?: "normal" | "configuring"`，缺省／缺欄位視為 `normal`。

選擇兩欄位而非把 `正常／設置中／隱藏` 合成單一 select，原因：合併列舉會與既有 `visible` spec 行為重疊、需要改寫既有 Overview toggle 與 runtime 判斷，破壞向後相容；正交欄位讓「隱藏」直接複用既有能力、「設置中」為純新增，改動面最小且可獨立測試。卡片同時為隱藏與設置中時，**隱藏優先**：不渲染的卡不顯示「設置中」文字。

### story-runtime 驅動卡片以 per-card 狀態 map 取得 config 落點

Overview（`kpiCards`）、Sustainability（大數字卡、`household-today`／`household-cumulative`）、card rail 卡已有靜態 per-card config，直接掛 `status` 並暴露 `visible` toggle。

Solar KPI row、FactoryCircuit 迴路負載卡、Images caption 卡為 story-runtime 驅動、無 per-card 靜態節點。為它們在該頁 `displayPageConfig.ts` 新增以既有 metric/slot key 為鍵的狀態 map（每筆 `{ visible?, status? }`），由該頁 viewModel/runtime 在組卡時查表套用。選擇 key-based map 而非為每張卡硬塞完整 config 節點，是為了沿用既有 story binding 結構、避免重寫 story model。

### Editor 沿用既有欄位型別，不新增 schema 種類

顯示開關用既有 `DisplayEditorToggleFieldSchema`（綁 `visible` path），狀態用既有 `DisplayEditorSelectFieldSchema`（選項 `正常`／`設置中`，綁 `status` path）。`packages/shared/src/displayEditorSchema.ts` 已支援 toggle/select，無需新增欄位型別或 inspector 控制元件。card rail 卡在 `buildCardRailCardFields` 追加這兩個欄位。

## Implementation Contract

**Behavior（操作者觀察）：**

- 在 `/display-pages/editor` 選取任一資料卡，inspector 出現「顯示」開關與「狀態」（正常／設置中）選單。
- 「狀態」設為設置中並發佈後，該卡在 playback runtime 的數值位置顯示「設置中」文字，標題與卡片樣式不變；其餘卡不受影響。
- 「顯示」關閉並發佈後，該卡在 playback runtime 不渲染；卡仍可在 editor region list 選取並重新開啟。
- 五頁所有資料卡（含 Solar/Factory/Images/card rail）皆具備上述兩項控制。

**Data shape：**

- 卡片 config 新增 `status?: "normal" | "configuring"`；缺省／缺欄位＝`normal`。`visible?: boolean` 沿用既有語意（缺省＝顯示）。
- story-runtime 頁面在 `displayPageConfig` 以 metric/slot key 為鍵的狀態 map 承載 `{ visible?, status? }`。

**Failure modes：**

- 舊 draft 無 `status` 欄位 → 視為正常顯示，渲染不變（靜默向後相容）。
- 隱藏與設置中同時為真 → 隱藏優先，卡不渲染。
- seed fallback：seed config 對每張資料卡提供 `status: "normal"`（或省略）與既有 `visible` 預設。

**Acceptance criteria：**

- 新增 targeted tests：runtime 在 `status: "configuring"` 時輸出「設置中」文字而非數值；`visible: false` 時不渲染（涵蓋五頁代表卡與 card rail）。
- editor schema 測試：五頁資料卡 region 含 `visible` toggle 與 `status` select，path 綁定正確。
- draft/live：設定 status/visible 後 draft 記錄對應值並隨發佈傳到 live。
- `pnpm --filter @solar-display/web test`、`pnpm run build` 通過。

**Scope boundaries：**

- 範圍內：卡片狀態資料模型、editor 控制、runtime 呈現、seed fallback、tests。
- 範圍外：背後 binding／計算、卡片視覺樣式、非資料卡元素、Change 2 的換算係數。

## Risks / Trade-offs

- [story-runtime 卡片無靜態 config，新增狀態 map 可能與既有 story binding 命名不一致] → 以既有 metric/slot key 為鍵，apply 階段逐頁核對 key 來源，避免新造識別碼。
- [兩正交欄位讓「隱藏的設置中卡」語意需明確] → 明訂隱藏優先並以測試固定行為。
- [五頁 runtime 改動面廣，恐誤動視覺] → 僅在數值輸出處插入 status 判斷，不碰版面/樣式；以 configRender/viewModel 既有測試守住回歸。

## Migration Plan

- 純資料模型「新增可選欄位」，無 DB schema 變更；舊 draft 缺欄位即正常顯示，無需資料遷移。
- Rollback：移除 status 欄位與 editor 控制即回到現狀；`visible` 擴充覆蓋不影響既有 Overview 行為。

## Open Questions

- 「設置中」文字是否需雙語（中／英）或固定中文？預設固定「設置中」，如需雙語於 apply 階段確認 copy 來源。
- Solar/Factory/Images 各自的 per-card 狀態 map 鍵集合，於 apply 逐頁對既有 story key 確認後定案。
