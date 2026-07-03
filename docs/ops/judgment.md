# 判斷力 Rubric（repo 層）

> 讀者：任何等級的模型。每節是可執行判準，附正例（✅）與反例（❌）。
> 通用判準（升級模型、換路訊號、品味題處理）見 `~/.claude/ops/judgment.md`；本檔只寫 solar_player 特有的判斷。拿不準時走保守側。

## 1. 何時算「真的完成」（按產物類型）

### 程式碼（server / web / shared）

完成 = 對應測試指令真的跑過、輸出真的看過（指令見 `docs/ops/conventions.md`）。特別條款：改 `apps/server/src/` 頂層檔案時，`pnpm test` 綠燈**不構成證據**，必須直跑該檔測試。

✅ 正例：「改了 `serverRuntimeGuard.ts`。`pnpm --filter @solar-display/server test` 通過，另直跑 `exec tsx --test src/serverRuntimeGuard.test.ts` 通過（4 tests, 0 fail）。」
❌ 反例：「改了 `serverRuntimeGuard.ts`，`pnpm test` 全綠。」——該檔測試根本不在 `pnpm test` 的 glob 內，這個綠燈驗證了零行相關程式。

### Playback 頁視覺（/overview /solar /factory-circuit /images /sustainability）

完成 = fresh witness（`pnpm run fhd:witness`）+ 對照 `docs/reference/FHD/` 的 gap notes + 按 `docs/fhd-witness/evidence-template.md` 的 evidence bundle。三者缺一不可。

✅ 正例：「/solar connector 調整完成。witness 已重跑，與 `02-2.Solar (大).png` 並排比對：connector 粗細一致，flow node 座標差 <2px；剩餘差異 1 項（KPI row 底部間距）已列入 gap notes 待你判定是否 intentional。evidence bundle 在 <路徑>。」
❌ 反例：「樣式已按 FHD 調整，build 通過，component 測試綠燈。」——沒有 witness、沒有對照、沒有 bundle，等於沒驗。

### Spectra change

完成 = tasks 全部做完 **且** 驗證跑過 **且** 已 `/spectra-archive`。checkbox 全勾只是中間狀態。

✅ 正例：tasks 全勾 → 跑 `/spectra-verify` 或對應驗證 → `/spectra-archive` → 回報「已歸檔」。
❌ 反例：把 checkbox 全勾就回報完成，change 留在 `openspec/changes/`。——這正是 repo 積壓 43 個目錄的成因，別再加一個。

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

- 「繼續做 / 續作某個 change」一律 = `/spectra-apply`。`/spectra-ingest` 只有一個用途：需求在中途變動、要把外部 context 回補進 artifacts。SPECTRA 區塊把 "in-progress change to continue" 對到 ingest，指的是「需求變動後接續」的情境，不是單純續作——分不清時選 apply。
- 使用者沒指名 change 就要 apply → 先列出你認為的目標 change 與依據，確認後再動工。`openspec/changes/` 有大量全勾未歸檔目錄，「存在」不等於「進行中」。
- 需求在 apply 中途變了 → 走 `/spectra-ingest` 回補 artifacts，不要直接改 code 讓 artifacts 落後。
- 新需求 vs 既有 change 分不清 → 查 `openspec/changes/` 有沒有涵蓋；沒有就 `/spectra-propose` 開新的，不要塞進不相關的 change。

## 5. 品質底線的最低成本驗法

- **程式碼**：conventions.md 的指令對照表，一條都不省；碰過的 code path 至少一個測試或一次實跑覆蓋。
- **視覺**：witness 三件套（fresh 截圖、gap notes、evidence bundle）。
- **文件/制度檔**：派 fresh agent read-back「只根據這份檔案，你會怎麼做 X」，答錯處就是寫模糊了。
- **批次修改**：抽樣 ≥3 + 全量 grep 確認無漏網。
- **刪除/歸檔**：先全量搜引用，後跑完整檢查（`pnpm run test` + 涉及頂層時的直跑條款）。
