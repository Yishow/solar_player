# Design｜建立電錶累積讀值與量測語意契約

## Context

MetricsAccumulatorService 已讀 consumptionEnergy 並寫 cumulative counter；sumConsumptionPower 卻以 factory 前綴及 kW 篩選。DataHub 自訂來源只有 key/scope/unit/multiplier/valuePath，尚不足以表達 meter identity、counter epoch 與量測種類。本次未取得現場 MQTT payload，不能宣稱已確認每一條來源的實際單位。

## Goals / Non-Goals

**In scope**：在 shared、MQTT ingest 及 SQLite 持久層建立帶版本的物理來源定義、量測語意與逐筆讀值；以明確的 energyFlowRole 取代 metric key 前綴猜測。總錶、部門歸屬及比較分母只由 E6 profile 保存；既有來源先做清冊與確認，不自動把所有 factory 欄位改成 kWh。

**Out of scope**：不改 Solar Collector 已提供的今日／本月發電量語意；不推算電價、不操作現場電錶、不重設實體或既有累積 counter；不把 kWh 冒充 kW，也不在本 change 實作期間差值。

## Dependencies

無；可以先開始。

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測。

## Decisions

### D1. 來源模型

MeterSourceDefinition 包含 meterId、channelId、metricScope(cl/kn)、metricKey、measurementKind(power-gauge/cumulative-energy/interval-energy)、energyFlowRole(consumption/generation/grid-import/grid-export)、inputUnit、scaleDecimal、sourceRevision、enabled、sourceTimestampTimeZone?、timestampPolicy(source-required/allow-receive-time-estimate)、expectedCadenceSeconds、boundaryMaxAgeSeconds。全域僅能是明確的跨廠區衍生結果，不是實體廠區電錶。

E1 不保存 meterRole(site-main/department) 或 departmentId；總錶、部門成員與比較分母只由 E6 的 siteTotal、departments.memberChannelIds、shareBasis 定義。energyFlowRole 描述量測的能源流向，不代表 accounting 歸屬；同一 consumption channel 改選為總錶或部門成員只建立 profile revision，不改 E1 sourceRevision/epoch/baseline。E1 CRUD 遇到 accounting 欄位須回欄位錯誤，不保存影子設定。

sourceTimestampTimeZone 只用於解析裝置沒有 offset 的時間字串，不提供期間邊界。帶 offset/Z 的時間直接解析成 UTC instant；無 offset 時必須使用來源明確設定的有效 IANA timezone，缺設定、非法時間或 DST 歧義均隔離為 SOURCE_TIMESTAMP_INVALID，不借用 E6 或 OS 時區，也不把解析失敗降級成 receive-time-estimated。來源時區與 E6 siteTimeZone 不同是合法設定：先解析 instant，再由 E2 按 E6 profile 分期。E6 siteTimeZone 是唯一日曆邊界權威。timestampPolicy 預設 source-required；只有管理者明確審核後才可保存 allow-receive-time-estimate，批准與 sourceRevision／既有 audit 一起持久化，不接受 packet 或 E6 profile 臨時開啟 fallback。

### D2. 逐筆保存

保留 rawValueDecimal、normalizedValueKwh（decimal string）、sourceTimestamp（UTC instant 或 null）、receivedAt、timestampQuality、quality、epochId、sourceRevision、payloadHash 及 origin、retain、dup、qos。MQTT callback 的 packet 證據經 M1/M2 extractor 原樣傳到 E1；catalog 的 retained 欄位明確映射為 sample.retain，不因 selector 成功而遺失。sourceTimestamp/timestampQuality 可由 reviewed selector 與 E1 時間解析規則從所選 record 取得，保留原始時間證據；不要求 generic callback 先知道每個 tag 的觀測時間，也不得以接收時間充當可信來源時間。缺少 transport 證據不能預設 retain=false。事件於 MQTT 接收時經 admission gate 後寫入，不以每五秒重讀同一份 live snapshot 當新樣本。只有具權限的診斷可看已遮罩原始樣本。

### D3. 唯一性與順序

先做 admission gate，再處理唯一性、順序及 counter continuity。origin=catalog/offline 的樣本只供設定／診斷；正式 MQTT packet 若 retain=true 且無可信 sourceTimestamp，回 quarantined/RETAINED_SOURCE_TIME_UNKNOWN，實際年齡為 unknown。此分支不得新增 accepted history、更新 live 值／lastAcceptedAt／freshness／baseline、建立 epoch、判定 counter discontinuity 或送 meter-readings-changed。即使重啟遺失記憶體去重 cache，仍以 packet 證據擋下，不以 payloadHash 或 receive time 猜它是否為新樣本。

可信 sourceTimestamp 是依已審核來源解析規則得到且通過驗證的原始觀測 instant，不包含 receivedAt、catalog lastSeen 或 receive-time-estimated。retain/dup/qos 不證明資料新鮮。時間解析只產生值或診斷，不更新 accepted state；若 retain=true 且解析失敗，主隔離原因仍為 RETAINED_SOURCE_TIME_UNKNOWN，另附 SOURCE_TIMESTAMP_INVALID 診斷。缺 transport 證據且無可信 sourceTimestamp 回 quarantined/TRANSPORT_EVIDENCE_MISSING；其他解析失敗的 source timestamp 依 D1 隔離，不走時間缺失 fallback。

通過 gate 後，同一 meter/channel/revision/epoch/sourceTimestamp 的相同值是重複訊息，不能重計。同 timestamp 不同值為衝突事件；保留診斷但不覆寫已接受樣本。retained 帶可信 sourceTimestamp 依此去重，不能以重送 receivedAt 刷新 freshness。延遲且較舊的有效樣本可加入事件紀錄，後續通知 E3 局部重算，不倒退目前 live 值。

### D4. 單位與精度

Wh→kWh 除1000、MWh→kWh 乘1000，先用 decimal arithmetic 轉換及相減、最後顯示才取位。拒絕非法數字、未知單位、負的消耗錶絕對讀值；保留原始字串避免大型 register 在 JavaScript double 中遺失小增量。

### D5. 來源切換

換 Topic、換錶、修正量測種類／energyFlowRole／單位倍率／sourceTimestampTimeZone／timestampPolicy 須建立新 sourceRevision/epoch，記錄操作者與原因，不連接兩個不同口徑讀值。確定同一實體錶可用多條 transport 時只允許一個 primary，其他明確 standby，不相加。E6 accounting 歸屬或 siteTimeZone 變更不改寫 E1 原始樣本。

### D6. 既有來源遷移

先列出 consumptionEnergy 與部門 mapping 清冊；使用者明確確認的廠區用電 channel 標為 cumulative-energy。無法證明種類的舊來源標成 needs-review，不送入期間計算。原 API 欄位不刪，新增契約向後相容；migration 的流水號依 apply 時 main 分配，不預占號碼。

### D7. 儲存與資料量界限

新資料表使用定長來源識別與索引(scope,meter,channel,revision,epoch,sourceTimestamp)，不把完整payload永久存進計算表。accepted observations append-only；隔離訊息保留必要 hash／原因與 transport/time 證據，診斷樣本設大小與存留上限。可信來源時間的唯一性用 source identity 與 sourceTimestamp/value hash，不以 receive time 去重。receive-time-estimated 不屬於可信 sourceTimestamp 索引；timestamp 缺失且 dup=true 的重送不能用新的 receivedAt 新增 accepted observation，回 quarantined/DUPLICATE_SOURCE_TIME_UNKNOWN。

## Implementation Contract

新增 shared 純資料型別與服務契約 ingestMeterReading(definition, sample)，sample 明確攜帶 D2 的 transport/time/origin 證據。回傳 accepted/duplicate/conflict/quarantined、可用時的 readingId 及隔離原因；只有 accepted 的事件推送 meter-readings-changed（內部事件，不替代既有 display sync）。上游不必更改 MQTT Topic 才能導入。只有來自正式接收路徑、retain=false、dup=false、qos 為 0/1/2，且該 sourceRevision 的 timestampPolicy=allow-receive-time-estimate 的缺 timestamp packet，才可記 receive-time-estimated；sourceTimestamp 保持 null，receivedAt 只作估計觀測時間，不冒充原始時間或 exact boundary。缺 timestamp 的 retained、duplicate 或 transport 證據未知情況不能進入 fallback；其餘 source-required 缺 timestamp 情況回 quarantined/SOURCE_TIMESTAMP_REQUIRED。

以 E1-R2-S03 的「重啟後收到舊 retained 10000 kWh、無 timestamp，目前已接受 10100 kWh」確認 gate 在任何 state mutation 前執行，並以 E1-R5-S03/S04 驗證來源時間解析和拒絕案例；期間歸屬由 E2/E6 整合驗證，不在 E1 另建日曆 resolver。

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
