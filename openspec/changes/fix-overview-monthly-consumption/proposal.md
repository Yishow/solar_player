# E4｜修復首頁月用量曲線與顯示狀態

## Why

使用者回報主頁「月報價」不能正常顯示。最新 main 找到的是 PhasePowerTableWidget 裡的「月用量曲線 / Monthly Consumption」；本 change 先對應這個實際存在的區塊，修正完整讀取與呈現流程。

## Problem and Evidence

目前 widget 呼叫受 display client context 保護的 /api/metrics/daily-summary?range=month，僅用 typeof number 篩選、reverse 排列，並將缺日過濾後直接串線。尚未取得現場 HTTP/console trace，不能把所有空圖都斷言為同一原因。

基準：13535147ad47613cf80b2321d12cb131b30264ab（main，2026-09-04 提交）。來源與觀察界限以本 change 的 Problem and Evidence 與 design.md 為準。這是依原始碼與使用者回報起草的 change，不是現場測試報告。

## What Changes

改讀 E3 的正確 daily projections，依廠區與 calendar month 取得資料；對實體播放與管理編輯預覽採用各自合法授權路徑。保留既有 widget id/geometry，修日期、缺口、非有限值、錯誤與重載狀態。

## Non-Goals

不建立電費、單價、報價或稅額計算。「月報價」若是另一个金額卡片，須先確認元件再另行擴規，不能在本 change 偷換需求。也不改主頁導航、SQL schema 或 MQTT 架構。

## Capabilities

### New Capabilities

- `overview-monthly-consumption-integrity`：修復首頁月用量曲線與顯示狀態；具體規則與例外見同目錄 specs。

### Modified Capabilities

- `overview-density-widgets`：以本 change 的 MODIFIED delta 更新既有完整 requirement，保留未涉及行為。

## Dependencies and Delivery Boundary

- 類型：Bug Fix。
- 優先序：P0。
- 前置 change：E3 / repair-consumption-history-projections。
- 可先評審草案；只有前置契約及對應驗證完成後才可以進入相依實作。
- 本 change 以自己的 tasks 作實作進度來源；其他 change 未完成不能靠此 change 臨時 hardcode 代替。

## Success Criteria

- 每一個 requirement 的 GIVEN / WHEN / THEN 必須由 test-plan 指定的驗證層實際驗證。
- 失敗狀態、權限與跨廠區隔離和正常狀態同為交付條件。
- 保存來源或草稿不代表發布；伺服器發布不代表裝置已套用。
- 所有實作 task、受影響測試、實際 pnpm verify 及必要人工驗收完成後才可 archive。

## Impact

- Existing files to modify（基準路徑／整合點，實作前須依最新 main 再確認）：
  - `apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx`
  - `apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx`
  - `apps/web/src/pages/Overview/displayPageConfig.ts`
  - `apps/web/src/pages/Overview/runtimeContent.tsx`
  - `apps/web/src/pages/Overview/index.tsx`
- Proposed new implementation files（尚未建立，不是本包已實作）：
  - `apps/web/src/pages/Overview/widgets/monthlyConsumptionModel.ts`
  - `apps/web/src/pages/Overview/widgets/monthlyConsumptionModel.test.ts`
- Removed: 無。
- Specification artifacts: `openspec/changes/fix-overview-monthly-consumption/`。
- 本包只新增提案檔；不含應用程式修正、資料库 migration 執行或正式資料更新。

## V2 Revision

補上E4-R6，由E6持有廠區總量/部門来源/比較基準，U6提供四步及日常捷徑。不再要求使用者自行跨頁拼湊設定或編寫公式。
