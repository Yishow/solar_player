# Tasks｜建立電錶累積讀值與量測語意契約

狀態：實作中；production admission／live 一致性與來源時間證據已補強，來源 lifecycle／CRUD 與完整 M1/M2 整合仍待完成。

前置：無

## 1. Implementation and Verification

- [x] 1.1 **Contract** — 新增 measurement kind、energyFlowRole、meter identity、revision、epoch 與品質型別；E1 不保存總錶／部門歸屬，來源 CRUD 拒絕 meterRole/departmentId。覆蓋 CL/KN 同 key、global/all 拒絕，以及 E1-R1-S03/S04 的 profile 重選不改 source/baseline 與欄位拒絕案例。（E1-R1 E1-R5） 對照：D1 來源模型；Typed source semantics and physical meter identity。
- [x] 1.2 **Contract** — 以 decimal 字串完成 Wh/kWh/MWh 与倍率正規化測試，包含大型 register 的 0.125 增量；禁止先轉不安全 number。（E1-R3） 對照：D4 單位與精度；Unit normalization preserves small counter increments。
- [x] 1.3 **Storage** — 建立 additive meter-source 與 sample tables、唯一索引及 migration，保存 transport/time 證據；確認 source schema 沒有 accounting 欄位、舊 topic_mappings 與其他資料不被清空，並驗證無來源時間的隔離資料不進 accepted 索引。（E1-R1 E1-R2） 對照：D2 逐筆保存；D7 儲存與資料量界限。
- [ ] 1.4 **Ingestion** — 在去重、counter continuity 與任何 accepted state mutation 之前加入 admission gate；帶可信 source timestamp 的 retained 十次只接受一次，無可信 source timestamp 的 retained 十次全部回 RETAINED_SOURCE_TIME_UNKNOWN。以 E1-R2-S03 重啟隔離 broker＋SQLite fixture 驗證 10000 舊 retained 不覆蓋 10100、不刷 freshness、不改 baseline/epoch、不送事件或製造 discontinuity；不以 snapshot poll 製造讀值。（E1-R2） 對照：Immutable samples and idempotent ingestion。
- [x] 1.5 **Ingestion** — 實作同 timestamp 衝突隔離及 late-event 保存，較舊事件不能倒退最新 live cache。（E1-R2） 對照：D3 唯一性與順序。
- [x] 1.6 **Lifecycle** — 實作換錶／measurementKind／energyFlowRole／單位／倍率／sourceTimestampTimeZone／timestampPolicy revision 變更與純改名稱、E6 accounting 重選不重置 baseline 的對照測試。（E1-R4） 對照：D5 來源切換；Source revisions prevent cross-meter differencing。
- [x] 1.7 **Security** — 來源 CRUD 保留管理權限並遮罩憑證與原始 payload；sourceTimestampTimeZone 僅解析無 offset 時間，E1-R5-S03/S04 驗證 UTC 來源與 Asia/Taipei profile 不同仍解析同一 instant、offset 優先及缺設定／歧義／非法時間隔離。sourceRevision 保存 timestampPolicy（預設 source-required，批准才 allow-receive-time-estimate）；fallback 只允許正式 retain=false/dup=false、qos=0/1/2 的缺 timestamp packet，sourceTimestamp=null 且標 estimated；以 E1-R5-S02/S05/S06 驗證預設 policy 拒絕、transport 證據未知不能 fallback、dup=true 重送回 DUPLICATE_SOURCE_TIME_UNKNOWN 且不新增 accepted。（E1-R5） 對照：Per-site isolation and safe provenance。
- [x] 1.8 **Compatibility** — 建立既有 consumptionEnergy／部門 mapping 清冊，未確認者 needs-review；不自動把所有 factory key 轉成電量。（E1-R6） 對照：D6 既有來源遷移；Reviewed migration and consumption power roles。
- [x] 1.9 **Compatibility** — 改 sumConsumptionPower 使用明確 consumption-power membership；以 factoryGeneration.powerKw fixture 防止發電混入。（E1-R6）
- [x] 1.10 **Verification** — 執行 meterReadingService 測試及受影響 MQTT/accumulator regression，保存實際指令與輸出。（E1-R1 E1-R2 E1-R3 E1-R4 E1-R5 E1-R6）
- [x] 1.11 **Verification** — 執行 shadow ingest／回退演練與 pnpm verify；缺現場遮罩樣本時記錄未驗證項，不勾完現場 acceptance。（E1-R1 E1-R6）

- [ ] 1.12 **V3 MQTT integration** — 串接受控已接收資料清單/穩定tag來源，production callback→M2 extractor→E1 傳遞 origin/retain/dup/qos/receivedAt/sourceTimestamp/timestampQuality；以 E1-R7-S01/S02 及 E1-R2-S03 證明 catalog/offline/wrong-tag 不更新讀值、packet 證據不因 match 遺失。不再要求外部client/手填mapping；此change只實作本層整合。（E1-R7） 對照：Selector provenance accompanies accepted meter observations。

## Closeout Notes

每個 task 完成時記錄測試名稱、指令、exit code 與證據路徑；不能只寫「測過了」。本次已執行文件的 Spectra analyze/validate；尚未執行實作測試、park 或部署，文件檢查不代表 runtime 通過。

Archive 與 commit 依 repo workflow 另行執行；不在本草案提前標記。

## 2026-09-06 Review follow-up

本輪回讀程式與規格後，將僅部分實作或缺驗證的任務重開；已存在的程式保留。修復範圍、缺口與最終驗證見 [整合追蹤](../verify-energy-authoring-journeys/review-followup.md)。未因本輪局部修復宣告整項契約完成。

## 2026-09-07 Continuation

本輪已完成與仍未完成的範圍、回歸證據及驗證結果見 [E1 → E2 → E3 接續紀錄](../verify-energy-authoring-journeys/continuation-20260907.md)。未將局部通過的合成任務提前勾完，尚未 archive／commit。
