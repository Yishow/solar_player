# 判斷力 Rubric（repo 層）

> 讀者：任何等級的模型。每節是可執行判準，附正例（✅）與反例（❌）。
> Claude Code 的通用判準見 `~/.claude/ops/judgment.md`；其他工具遵循自身上位規則。本檔只寫 solar_player 特有的判斷，拿不準時走保守側。

## 1. 何時算「真的完成」（按產物類型）

### 程式碼（server / web / shared）

完成 = 依 `docs/ops/conventions.md` 跑過受影響測試，並實際看過輸出。

✅ 正例：「改了 `serverRuntimeGuard.ts`。`pnpm --filter @solar-display/server test` 通過，輸出包含對應測試。」
❌ 反例：「測試應該有跑到。」——沒有指令與輸出，不能證明受影響路徑已驗證。

### Playback 頁視覺（/overview /solar /factory-circuit /images /sustainability）

完成 = fresh witness（`pnpm run fhd:witness`）+ 對照 `docs/reference/FHD/` 的 gap notes + 按 `docs/fhd-witness/evidence-template.md` 的 evidence bundle。三者缺一不可。

✅ 正例：「/solar connector 調整完成。witness 已重跑，與 `02-2.Solar (大).png` 並排比對：connector 粗細一致，flow node 座標差 <2px；剩餘差異 1 項（KPI row 底部間距）已列入 gap notes 待你判定是否 intentional。evidence bundle 在 <路徑>。」
❌ 反例：「樣式已按 FHD 調整，build 通過，component 測試綠燈。」——沒有 witness、沒有對照、沒有 bundle，等於沒驗。

### Spectra change

完成 = tasks 全部做完 **且** 驗證跑過 **且** 已 archive。Checkbox 全勾只是中間狀態。

✅ 正例：tasks 全勾 → 跑對應驗證 → archive → 回報「已歸檔」。
❌ 反例：把 checkbox 全勾就回報完成，change 仍留在 `openspec/changes/`。

## 2. 何時停下來問使用者（repo 特有清單）

**要問**（任一命中）：
- FHD 差異是否 intentional、是否達 launch 品質——這兩題永遠是使用者的，任何模型不代簽。
- 動 `deploy/`、systemd service、`.env`、`data/`（SQLite 實體）、`uploads/`。
- 批次歸檔或刪除 openspec/changes/（單一 change 做完順手歸檔不用問，批次清理要拿清單核可）。
- 想放寬安全邊界：images 上傳限制、MQTT 密碼遮罩、device reboot 停用。
- 發現需要動 route shell、server API 形狀、SQLite schema、MQTT topic 結構才能達成任務——先問，這通常代表任務被誤解了。

**不要問**（直接做，事後報告）：
- Spectra tasks 計畫內的實作細節、測試先行、命名與檔案切分。
- 跑 witness、跑測試、read-back 驗證——驗證永遠不用批准。
- 「要不要繼續下一個 task」——計畫內的事直接做。

✅ 正例：發現 editor schema 表達不了某 FHD 差距，需要擴 shared schema → 這在 editor capability-first 原則內，直接規劃並做，回報時說明。
❌ 反例：「witness 顯示 KPI 卡間距差 4px，我判斷可接受，已標記完成。」——可不可接受是使用者的判定。

## 3. 方向錯了的訊號（repo 特化；出現就停，退回分岔點）

- 你正要在 playback 頁寫 page-local hardcode 來對齊 FHD → 錯路。正路：定義 editor capability gap，擴 schema/inspector/runtime。
- 你為了修 playback 樣式改了 `apps/web/src/pages/shared/` 的共用 component，management 頁跟著變 → 停，確認影響面再繼續。
- 你發現自己在把 playback 頁的元素換成 generic 管理元件（table、toolbar、glass card）「順便統一風格」 → 這是 management-surface drift，本 repo 明令禁止。
- 你為了達成視覺 polish 開始動 route shell / server API / 資料模型 → 任務範圍錯了，回頭。
- 你在翻 `docs/FHD.01.html` 或 `docs/reference/kuozui-green-fhd-html-prototype/` 找「正確做法」 → 錯來源，回到 `docs/reference/FHD/` PNG 與現行程式。

## 4. Spectra 流程判斷

- `docs/ops/workflow.md` 是 lifecycle 的唯一規則；單純續作走 apply，只有需求中途改變、需要回補 artifacts 時才 ingest。
- 使用者沒指名 change 且無法從上下文唯一判定時，先列出目標與依據；不要只因 change 存在就視為進行中。
- 新需求不屬於既有 change 時另開有界 change，不把無關工作塞入目前 scope。

## 5. 品質底線的最低成本驗法

- **程式碼**：conventions.md 的指令對照表，一條都不省；碰過的 code path 至少一個測試或一次實跑覆蓋。
- **視覺**：witness 三件套（fresh 截圖、gap notes、evidence bundle）。
- **文件/制度檔**：派 fresh agent read-back「只根據這份檔案，你會怎麼做 X」，答錯處就是寫模糊了。
- **批次修改**：抽樣 ≥3 + 全量 grep 確認無漏網。
- **刪除/歸檔**：先全量搜引用，再依 `conventions.md` 跑受影響測試與必要交付 gate。
