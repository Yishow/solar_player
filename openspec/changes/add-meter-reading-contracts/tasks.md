# Tasks｜建立電錶累積讀值與量測語意契約

狀態：proposal-only；以下全部為待實作與待驗證項目，不因提案已寫好而打勾。

前置：無

## 1. Implementation and Verification

- [ ] 1.1 **Contract** — 新增 measurement kind、meter identity、revision、epoch 與品質型別，覆蓋 CL/KN 同 key 與 global/all 拒絕案例。（E1-R1 E1-R5）
- [ ] 1.2 **Contract** — 以 decimal 字串完成 Wh/kWh/MWh 与倍率正規化測試，包含大型 register 的 0.125 增量；禁止先轉不安全 number。（E1-R3）
- [ ] 1.3 **Storage** — 建立 additive meter-source 與 sample tables、唯一索引及 migration；確認舊 topic_mappings 與其他資料不被清空。（E1-R1 E1-R2）
- [ ] 1.4 **Ingestion** — 接上 MQTT 接收點的逐筆寫入；相同 retained 訊息十次只接受一次，不以 snapshot poll 製造讀值。（E1-R2）
- [ ] 1.5 **Ingestion** — 實作同 timestamp 衝突隔離及 late-event 保存，較舊事件不能倒退最新 live cache。（E1-R2）
- [ ] 1.6 **Lifecycle** — 實作換錶／單位／倍率 revision 變更與純改名稱不重置 baseline 的對照測試。（E1-R4）
- [ ] 1.7 **Security** — 來源 CRUD 保留管理權限，遮罩憑證與原始 payload；timestamp fallback 明確標示 estimated。（E1-R5）
- [ ] 1.8 **Compatibility** — 建立既有 consumptionEnergy／部門 mapping 清冊，未確認者 needs-review；不自動把所有 factory key 轉成電量。（E1-R6）
- [ ] 1.9 **Compatibility** — 改 sumConsumptionPower 使用明確 consumption-power membership；以 factoryGeneration.powerKw fixture 防止發電混入。（E1-R6）
- [ ] 1.10 **Verification** — 執行 meterReadingService 測試及受影響 MQTT/accumulator regression，保存實際指令與輸出。（E1-R1 E1-R2 E1-R3 E1-R4 E1-R5 E1-R6）
- [ ] 1.11 **Verification** — 執行 shadow ingest／回退演練與 pnpm verify；缺現場遮罩樣本時記錄未驗證項，不勾完現場 acceptance。（E1-R1 E1-R6）

- [ ] 1.12 **V3 MQTT integration** — 串接受控已接收資料清單/穩定tag來源與原任務，依新增契約驗證，不再要求外部client/手填mapping；此change只實作本層整合。（E1-R7）

## Closeout Notes

每個 task 完成時記錄測試名稱、指令、exit code 與證據路徑；不能只寫「測過了」。當前未執行原生 Spectra analyze/validate/park、應用測試或部署。

Archive 與 commit 依 repo workflow 另行執行；不在本草案提前標記。
