# Design｜修復首頁月用量曲線與顯示狀態

## Context

目前 widget 呼叫受 display client context 保護的 /api/metrics/daily-summary?range=month，僅用 typeof number 篩選、reverse 排列，並將缺日過濾後直接串線。尚未取得現場 HTTP/console trace，不能把所有空圖都斷言為同一原因。

## Goals / Non-Goals

**In scope**：改讀 E3 的正確 daily projections，依廠區與 calendar month 取得資料；對實體播放與管理編輯預覽採用各自合法授權路徑。保留既有 widget id/geometry，修日期、缺口、非有限值、錯誤與重載狀態。

**Out of scope**：不建立電費、單價、報價或稅額計算。「月報價」若是另一个金額卡片，須先確認元件再另行擴規，不能在本 change 偷換需求。也不改主頁導航、SQL schema 或 MQTT 架構。

## Dependencies

E3 / repair-consumption-history-projections

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測。

## Decisions

### D1. 維持相容

不因檔名 PhasePowerTableWidget 改變就破壞既有 phasePower widget config/region id。畫面維持月用量曲線，不恢復舊三相表格。layout、visibility、title設定仍由 editor 控制。

### D2. 明確的讀取情境

實際播放沿用 device-scoped endpoint；管理編輯預覽用授權 management history 與所選 preview scope。缺 context 顯示可修復錯誤，不新增偽裝 device credential，也不移除 preHandler。

### D3. 時序模型

用 ISO local date 排序並校驗是所選月；重複 date 依投影 revision 決勝，不憑 API 目前 DESC 的偶然順序直接 reverse。拒絕 NaN、Infinity、非數值與 invalid quality；0是有效資料點。

### D4. 缺口與圖形

以當月日期槽建軸，缺失日有 null gap，線與區域只畫連續有效段，不跨 gap 補線。單點畫 marker/label，不拉成整月面積；全0保留合理刻度，避免被當無資料。未来日期不添實際用量。

### D5. 狀態與刷新

區分 loading/no-baseline/empty/request-error/unauthorized/stale/partial/ready。監聽 matching scope 的 monitoring-history；頁面、月份、scope改變都換 cache key。舊 request 回來不覆蓋新 scope。failed refresh 可保留明顯 stale 的 last-good，不假裝 fresh。

### D6. 驗收保護

1920x1080 canonical 佈局及使用者既有 geometry/visibility 不變；如增加 quality標記，先確認 editor可表達並記錄 intentional difference 交人工驗收。

## API / Data / State Contracts

Widget 接收 resolved playback/preview context，使用 E3 history response 建立 dates、segments、periodSummary、qualityLabel 與 fetchState。月圖 y軸/tooltip 為 kWh，當月總量若顯示須來自 canonical periodSummary，不盲加不完整日點。

錯誤回應保留既有管理／播放權限邊界；新增錯誤提供穩定 code、可理解訊息與可定位的欄位或 item。缺資料用 null＋品質，不以空字串、NaN 或 0 掩蓋。未識別的 scope、meter、page 或 item 不自動改成 CL。

## Migration and Rollout

先 red tests 重現跨月、缺 context、全0、缺日及 NaN，再替換 model。保留舊 widget key及編輯器設定；回退可回前一 UI版本，但不得恢復 mock fallback 或固定假數字。

改動採 additive 相容策略；migration 編號與既有型別細節於 apply 對照最新 main，不能依文件預占流水號。任何重算須以副本 dry-run 和差異報告先驗證，正式資料套用另行授權。

## Risks / Trade-offs

使用者詞彙「月報價」尚未由截圖確認，因此文件不宣稱已定位金額問題。現場圖表空白也可能同時有無基準與授權問題，兩者要分開測。

## Verification Strategy

同目錄 test-plan 是 requirement-to-scenario 驗證對照；具體觀測條件以 specs 的 WHEN / THEN 為準。先寫失敗測試，再實作，再跑 regression。不得只修改 test expectation 讓既有錯誤數字通過。

## Source of Progress and Closeout

只有同目錄 tasks.md 的 checkbox 表示本 change 的實作進度。本包全部未勾選；格式檢查或公式 fixture 通過不代表應用程式測試通過。待實作後保存實際命令輸出、review findings 與必要 FHD witness；使用者驗收及 archive/commit 規則依 repo 現行 workflow。

## V2 Site-Setup Contract

The overview monthly consumption widget SHALL follow the reviewed E6 siteTotal reference and offer an authorized management action to U6 with the effective site preselected when configuration is absent. It SHALL not ask operators to locate raw metrics or repurpose a department comparison denominator.

規劃中的來源定義唯一放在E6 profile；操作入口由U6承接。詳見 `add-site-energy-accounting-profiles` 與 `add-guided-site-energy-setup` change。新增需求：E4-R6。
