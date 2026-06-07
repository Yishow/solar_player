## 1. Shared geometry schema

- [x] 1.1 在 packages/shared/src/displayEditorSchema.ts 的 `DisplayEditorRegionGeometrySchema.resizeMode` union 加入 `"proportional"`，並盤點所有讀取 `resizeMode` 的分支，補上 `"proportional"` 處理且不改既有 `both/horizontal/vertical/none` 預設手感。

## 2. Canvas 等比例縮放（design：以 resizeMode "proportional" 表達等比例鎖定縮放；spec：Region geometry supports a proportional resize mode）

- [x] 2.1 [P] 在 apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts 新增（或建立）失敗測試：給定起始矩形與單軸拖動位移，`"proportional"` 模式回傳尺寸的長寬比等於起始長寬比（±1px），且觸 min/max 邊界時夾住觸界軸並等比推導另一軸。
- [x] 2.2 [P] 在 apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts 的 resize 幾何解算實作 `"proportional"` 分支使測試通過；非 proportional 區域行為不變。滿足 spec requirement「Region geometry supports a proportional resize mode」。

## 3. Overview KPI 設定（design：以 per-card visible 旗標與 editor toggle 表達卡片顯示與隱藏；spec：Editor exposes a visibility toggle that persists through draft and live publishing）

- [x] 3.1 [P] 在 apps/web/src/pages/Overview/displayPageConfig.ts 為 `OverviewDisplayPageConfig.kpiCards[key]` 型別加入 `visible: boolean`，seed 五張預設 `true`；schema 解析對缺省 `visible` 視為顯示。
- [x] 3.2 [P] 為每個 `overview-kpi-${key}` region 的 fields 加入 `{ fieldType: "toggle", id: "${key}-visible", label: "顯示", path: ["kpiCards", key, "visible"] }`，並將該 region geometry 的 `resizeMode` 設為 `"proportional"`；更新對應 config/seed/region 測試斷言。滿足 spec requirement「Editor exposes a visibility toggle that persists through draft and live publishing」。

## 4. Overview runtime 顯示旗標（spec：Display card visibility is controlled by a per-card visible flag）

- [x] 4.1 在 apps/web/src/pages/Overview/cardVisibility.test.ts 新增失敗測試：`visible:false` 的 KPI 卡片不出現在 render 輸出；缺省（未設 `visible`）視為顯示並 render。
- [x] 4.2 在 apps/web/src/pages/Overview/index.tsx 讓 runtime 依 `visible` 旗標決定是否 render 該 KPI 卡片，使測試通過；`visible !== false` 視為顯示。滿足 spec requirement「Display card visibility is controlled by a per-card visible flag」。

## 5. 驗收

- [x] 5.1 確認設計邊界「隱藏卡片仍維持既有幾何驗證」：被隱藏的 KPI 卡片其 geometry 仍走既有 layout safety 驗證，未放寬出血／重疊規則，未新增驗證分支。
- [x] 5.2 執行 `pnpm --filter @solar-display/web test` 與 `pnpm run build`，確認全綠、exit 0，且 design Implementation Contract 的行為與驗收標準均達成。
