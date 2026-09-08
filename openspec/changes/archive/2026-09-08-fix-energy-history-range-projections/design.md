## Context

問題與範圍見 `proposal.md`、delta spec 及 follow-up review N3、N4。基準為 `98979b6f46b124a7b568167e42cc9a261024fa18`。

`readEnergyHistory` 的 periodSummary 已走新 resolver，但 summaries 仍是原始每日摘要；播放端 daily-summary 則已經做 consumption overlay。`DailySummaryService` 對 CL／KN 的原始 consumption_total 寫 null，因此管理端只讀舊欄位既會漏新資料，也會顯示殘留舊值。

`periodSelectionFromRange` 把 total 對應到 year，week 回 null。前端無法區分「沒有 profile」與「有 profile 但不能計算」，遂退回舊 summary/counter。現行 week 的每日篩選為今天及前六個日期，不是週一起算的日曆週。

## Goals / Non-Goals

**Goals:** 同一日期與證據只計算一種日用電；同一 range 只代表原本的範圍；無法計算仍保留不可用原因。

**Non-Goals:** 不更改原始摘要／快照的定義，不建立新的長期資料平台，不更換圖表。不用歷史重建寫入來修正可在讀取層處理的錯誤。不把 E6 設定日期或最老樣本冒稱設備安裝日期。

## Decisions

### 1. 共用日用電 overlay，不把管理請求轉成裝置請求

從播放端已修正的流程整理出最小共用日投影組合責任，供管理端與播放端使用。Route 繼續決定並授權 scope、範圍和原有日期集合；組合層只替換 consumption 與相應品質資訊。原有月份補日期規則仍由原本呼叫端控制，不能為了共用函式讓其他 range 都變成本月。

使用既有 `resolveDailyConsumptionPoints` 一次載入必要 profile／samples 再處理整組日期。相同日期的 consumption 不以 legacy 欄位作 fallback；generation、co2、selfConsumption、peak 與原始資料列都不改。避免逐日重新載入整份資料造成重複查詢。

替代方案「只改前端忽略壞點」無法修好 API、表格與其他消費者；「回填所有舊摘要」會擴大為正式資料維運，兩者都不採用。

### 2. 在 server 的已授權範圍解析層處理 week／total

Day／month／year 維持現有日曆 resolver。Week／total 不再硬塞成 year 或直接當作無 profile；使用 server 依 range、scope、profile 及 asOf 決定的內部 window，重用同一套累積差值、identity、revision、epoch、邊界年齡及品質計算。

若共用核心需要 window seam，只開放給已驗證的內部 accounting context；public API 仍不得接受任意 start/end/timeZone 來繞過 E6。不得另寫一個以 Number 相減或粗略加總每日值的 resolver。

Week 保留「今天及前六日」的範圍意義，以同一個 asOf 與權威 site calendar 解析邊界；不偷偷改成週一起算，也不因跨月縮短。日摘要 overlay 保留原本請求選出的日期及非用電欄位。

Total 使用明確可辨識的已保存 accounting span：**目前生效的 profile 起點**及該起點的合法來源基準，並回傳實際 periodStart／periodEnd／calculatedThrough。最老留存樣本本身不足以證明完整起點。缺 opening baseline 或跨未證明的 source 邊界時回 null 與具體診斷；有完整連續跨年證據時才能得到 900 而非 300。

錨點選在「目前生效的 revision」而非最早 revision，是因為以最早起點為錨會跨過其後每一次 profile 修訂，使任何調整過帳務設定的站點永遠拿不到 total（year／month 會在下一個期間自行恢復，total 不會）。因此 total 的語意是「現行帳務基準下的累積」，不是設備終身累積；`periodStart` 必須與數值一起呈現在畫面上，否則較短的區間會被誤讀成全部歷史。Week 仍可能跨 profile 邊界，該情況依舊降級為 partial。

### 3. 已設定 profile 的 unavailable 仍是 canonical 結果

沿用既有 response envelope 與 periodSummary 欄位。無 profile 的 legacy compatibility 可以維持 null；有 profile 時，即使無可用值，也回傳具 valueKwh=null、quality、範圍／原因的結果。內部錯誤依既有錯誤規約呈現，不吞成可用的舊數字，也不回傳內部例外。

EnergyHistory、EnergyTrend 根據 canonical 結果顯示資料或缺資料，不能因 value 為 0 或 null 改走 lifetime counter。月曲線與表格使用新的 summaries；卡片仍使用期間結果，保留「整月差值已知但逐日不完整」。不新增第二套前端計算公式。

## Risks / Trade-offs

- [長期範圍沒有足夠起點證據] → 預設 partial/unavailable，明示實際可證明範圍，不能用本年作替代；這比錯誤的漂亮數字更安全。
- [日期與時鐘口徑不同] → 測試固定共享 asOf 並涵蓋 Asia/Taipei 午夜、跨月與跨年。SQLite 的 date('now') 不受 Node mock Date 影響；fixture 應注入同一時鐘或依真正選取邊界建資料，不能用錯誤 fixture 宣稱產品失敗。
- [共用 overlay 意外改掉其他欄位或 date set] → 五個 range、global/no-profile、CL/KN、空集合與舊 sentinel 值逐一比對。
- [長範圍重算較慢] → 重用現有索引與單次載入，避免每個日期重讀所有來源；測試包含跨年資料，但不做與本案無關的快取架構改造。
- [畫面改成 null 後看似資料變少] → 顯示品質與範圍原因，不補零；正常測得的 0 另有回歸測試。

## Verification Approach

先加入 management/display 同日 300、legacy 9999、generation 10 的失敗案例，以及 raw-null rows 的有值與缺證據情境。以同批 API payload 驗證 EnergyHistory／EnergyTrend 卡片、月曲線、表格與既有匯出路徑（若存在）；不能只直接餵一個手寫 periodSummary 就宣稱 API 整合通過。

Range 回歸至少含 year=300／supported total=900、unknown total beginning=null、跨月近七日、缺一個必要基準不補零、profile/source 邊界、已測得零、兩廠區及無 profile／global 保相容。重跑 server、web 相鄰測試、shared build 與 `pnpm verify`。若修改 playback 顯示，再依 repo 的現行 FHD 規則補 witness 與待人工驗收項目；不將管理頁數值測試當成 FHD 驗收。

## Migration Plan

沒有資料表遷移或 raw history 回填。後續 apply 中可用同批隔離輸入比對修復前後 response，部署仍需正常授權；回復版本不應回寫資料。任何正式歷史重建、安裝起點補登或 production profile 修訂都不由此 change 自動執行。
