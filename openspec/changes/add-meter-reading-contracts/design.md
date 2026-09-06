# Design｜建立電錶累積讀值與量測語意契約

## Context

MetricsAccumulatorService 已讀 consumptionEnergy 並寫 cumulative counter；sumConsumptionPower 卻以 factory 前綴及 kW 篩選。DataHub 自訂來源只有 key/scope/unit/multiplier/valuePath，尚不足以表達 meter identity、counter epoch 與量測種類。本次未取得現場 MQTT payload，不能宣稱已確認每一條來源的實際單位。

## Goals / Non-Goals

**In scope**：在 shared、MQTT ingest 及 SQLite 持久層建立帶版本的來源定義與逐筆讀值；以明確的計量關係取代 metric key 前綴猜測。廠區主錶與部門子錶各自有身分；既有來源先做清冊与確認，不自動把所有 factory 欄位改成 kWh。

**Out of scope**：不改 Solar Collector 已提供的今日／本月發電量語意；不推算電價、不操作現場電錶、不重設實體或既有累積 counter；不把 kWh 冒充 kW，也不在本 change 實作期間差值。

## Dependencies

無；可以先開始。

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測。

## Decisions

### D1. 來源模型

MeterSourceDefinition 包含 meterId、channelId、metricScope(cl/kn)、metricKey、measurementKind(power-gauge/cumulative-energy/interval-energy)、inputUnit、scaleDecimal、sourceRevision、meterRole(site-main/department)、departmentId、enabled、timeZone、expectedCadenceSeconds、boundaryMaxAgeSeconds。全域僅能是明確的跨廠區衍生結果，不是實體廠區電錶。

### D2. 逐筆保存

保留 rawValueDecimal、normalizedValueKwh（decimal string）、sourceTimestamp、receivedAt、timestampQuality、quality、epochId、sourceRevision、payloadHash。事件於 MQTT 接收時寫入，不以每五秒重讀同一份 live snapshot 當新樣本。只有具權限的診斷可看已遮罩原始樣本。

### D3. 唯一性與順序

同一 meter/channel/revision/epoch/sourceTimestamp 的相同值是重複訊息，不能重計。同 timestamp 不同值為衝突事件；保留診斷但不覆寫已接受樣本。延遲且較舊的有效樣本可加入事件紀錄，後續通知 E3 局部重算，不倒退目前 live 值。

### D4. 單位與精度

Wh→kWh 除1000、MWh→kWh 乘1000，先用 decimal arithmetic 轉換及相減、最後顯示才取位。拒絕非法數字、未知單位、負的消耗錶絕對讀值；保留原始字串避免大型 register 在 JavaScript double 中遺失小增量。

### D5. 來源切換

換 Topic、換錶、修正單位倍率須建立新 sourceRevision/epoch，記錄操作者與原因，不連接兩個不同口徑讀值。確定同一主錶可用多條 transport 時只允許一個 primary，其他明確 standby，不相加。

### D6. 既有來源遷移

先列出 consumptionEnergy 與部門 mapping 清冊；使用者明確確認的廠區用電 channel 標為 cumulative-energy。無法證明種類的舊來源標成 needs-review，不送入期間計算。原 API 欄位不刪，新增契約向後相容；migration 的流水號依 apply 時 main 分配，不預占號碼。

### D7. 儲存與資料量界限

新資料表使用定長來源識別與索引(scope,meter,channel,revision,epoch,sourceTimestamp)，不把完整payload永久存進計算表。accepted observations append-only；隔離訊息保留必要hash/原因，診斷樣本設大小與存留上限。唯一性用source identity與observed time/value hash，不以receive time去重。

## API / Data / State Contracts

新增 shared 純資料型別與服務契約 ingestMeterReading(definition, sample)。回傳 accepted/duplicate/conflict/quarantined 與 readingId；只有 accepted 的事件推送 meter-readings-changed（內部事件，不替代既有 display sync）。上游不必更改 MQTT Topic 才能導入；sourceTimestamp 缺失時可記 receive-time-estimated，不能冒充原始觀測時間。

錯誤回應保留既有管理／播放權限邊界；新增錯誤提供穩定 code、可理解訊息與可定位的欄位或 item。缺資料用 null＋品質，不以空字串、NaN 或 0 掩蓋。未識別的 scope、meter、page 或 item 不自動改成 CL。

## Migration and Rollout

先部署 additive schema 與 shadow ingestion，生產畫面仍用既有資料。對照固定 fixture 與遮罩現場樣本後逐一啟用 reviewed sources。回退時停用新 reader，不刪事件紀錄或改動現場累積值。

改動採 additive 相容策略；migration 編號與既有型別細節於 apply 對照最新 main，不能依文件預占流水號。任何重算須以副本 dry-run 和差異報告先驗證，正式資料套用另行授權。

## Risks / Trade-offs

錯誤單位標籤、同一錶重複 mapping、無 sourceTimestamp、原始 register 已被上游轉成失真 floating point，皆必須有獨立診斷；不能靠自動更正掩蓋。

## Verification Strategy

同目錄 test-plan 是 requirement-to-scenario 驗證對照；具體觀測條件以 specs 的 WHEN / THEN 為準。先寫失敗測試，再實作，再跑 regression。不得只修改 test expectation 讓既有錯誤數字通過。

## Source of Progress and Closeout

只有同目錄 tasks.md 的 checkbox 表示本 change 的實作進度。本包全部未勾選；格式檢查或公式 fixture 通過不代表應用程式測試通過。待實作後保存實際命令輸出、review findings 與必要 FHD witness；使用者驗收及 archive/commit 規則依 repo 現行 workflow。

## V3 MQTT Source Integration

新增E1-R7：以M1/M2補齊來源探索→穩定tag選擇→批次preview/apply。此change維持原有單一權責，UI不再要求先到外部client查訂閱/publish後手抄Topic。M1/M2為新的前置/整合契約，不代表功能已在main。
