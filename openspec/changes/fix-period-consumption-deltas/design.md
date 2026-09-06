# Design｜以累積電錶差值計算日／月／年用電

## Context

DailySummaryService 在 service initialize 時用當下 counters 作 baseline，日期切换時以當下 counters 結束舊日並開始新日；負差以 max(...,0) 截掉。MetricResolver 同時存在 JS local-day 與 SQL/UTC date 邊界。這些是程式觀察，不代表已用現場資料重現所有症狀。

## Goals / Non-Goals

**In scope**：新增唯一期間差值 resolver，以 source observation time、電錶身分與明確廠區時區解析期間。保留可稽核基準、端點樣本、品質、缺口與演算法版本；所有 downstream 用同一契約。

**Out of scope**：不新增電價引擎、不對缺日線性補值、不將未知 reset 當 0、不對輸入已是 daily delta 的 channel 再做一次差值；不在本 change 改 UI。

## Dependencies

E1 / add-meter-reading-contracts

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測。

## Decisions

### D1. 期間定義

預設廠區時區 Asia/Taipei，存 IANA timezone。day/month/year 分別從當地日初/月初/1月1日00:00到查詢截止；完成期間為 [start,end)，累積值在 end 邊界是前一期間的終點和下一期間的起點，不重複分配。查詢 now 必須可注入測試，不依作業系統 TZ。

### D2. 數學

連續、未歸零且端點可用：E = normalized(end) − normalized(start)。多錶先各自差分，再按明確非重疊 membership 加總；不得先把不同時刻或不同 epochs 的 registers 混在一起。有效 interval-energy 是加总區間值，power-gauge 不走 counter delta。

### D3. 邊界選擇

先找精確 sourceTimestamp；沒有時僅可用 boundary 之前、且距離不超過來源 boundaryMaxAgeSeconds 的最後一筆，結果標 estimated-boundary 並回傳實際樣本時間與偏移。初始設計預設300秒，可由來源設定調整，不是已確認現場採樣頻率。禁止從 boundary 之後倒推期初。

### D4. 缺資料

缺月初／年初基準時 valueKwh=null，observedDeltaKwh 可呈現已觀測區間差值但必須標 partial；第一筆是 baseline 不是用量。缺日不填0、不補直線。月初與月底均可證實時月總差可正確，即使內部缺每日分配，須另列 dailyCoverage。

### D5. 歸零／換錶／翻表

負增量不以 max(0) 吞掉，也不取絕對值。需要明確的 reset/replacement event。只有舊錶結束與新錶起點均有可信證據時才加總連續 segments；缺任一段標 partial。rollover 僅於設定 modulus 且通過合理性檢查時使用 modulus−previous+current；未知負差 invalid。

### D6. 重啟與亂序

baseline 與 accepted observations 持久化；重啟不重新選「現在」為日初。不以接收日期取代 sourceTimestamp。舊資料補到時重新計算受影響期間，去重及 revision 保證可重入。

### D7. 品質與舍入

quality=exact/estimated-boundary/partial/unavailable/invalid；freshness 另用既有 policy，真實0與沒有值不同。valueKwh 保留 decimal 字串至 API adapter 確認安全範圍，顯示才舍入；不得把每天先四捨五入再算月總。

### D8. 期間截止一致性

to-date 以請求asOf定義共同結束邊界；找不到正好asOf的樣本時仍依300秒或來源設定的向前取樣限制標estimated-boundary，calculatedThrough記實際截止。已完成的歷史期間以是否覆蓋其終點判斷完整性，不因今天沒有新訊息就把去年完整資料變成無效。

## API / Data / State Contracts

resolvePeriodConsumption({metricScope,meterIds,period,start,end,timeZone,asOf,definitionRevision}) 回傳 valueKwh、observedDeltaKwh、quality、freshness、periodStart/End、calculatedThrough、baselineSampleIds、endSampleIds、boundaryOffsets、issues、calculationVersion。所有欄位由服務端產生，前端不得另算一套。

錯誤回應保留既有管理／播放權限邊界；新增錯誤提供穩定 code、可理解訊息與可定位的欄位或 item。缺資料用 null＋品質，不以空字串、NaN 或 0 掩蓋。未識別的 scope、meter、page 或 item 不自動改成 CL。

## Migration and Rollout

以 shadow resolver 對照 E1 samples，不立即替換舊 summaries。先通過固定邊界／重啟 fixture，再交 E3 產生新 projection。回退只切 reader version，不重設電錶或 baseline。

改動採 additive 相容策略；migration 編號與既有型別細節於 apply 對照最新 main，不能依文件預占流水號。任何重算須以副本 dry-run 和差異報告先驗證，正式資料套用另行授權。

## Risks / Trade-offs

首次導入時可能沒有歷史月初／年初樣本，此時不能保證補出完整期間；estimated-boundary 與 exact 必須分開。區間內 gap 與期間邊界 gap 不是同一種品質。

## Verification Strategy

同目錄 test-plan 是 requirement-to-scenario 驗證對照；具體觀測條件以 specs 的 WHEN / THEN 為準。先寫失敗測試，再實作，再跑 regression。不得只修改 test expectation 讓既有錯誤數字通過。

## Source of Progress and Closeout

只有同目錄 tasks.md 的 checkbox 表示本 change 的實作進度。本包全部未勾選；格式檢查或公式 fixture 通過不代表應用程式測試通過。待實作後保存實際命令輸出、review findings 與必要 FHD witness；使用者驗收及 archive/commit 規則依 repo 現行 workflow。
