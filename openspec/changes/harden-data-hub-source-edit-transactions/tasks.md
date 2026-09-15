## 0. 跨發布端前置契約
- [ ] 0.1 對齊最新 MQTT-OWNERSHIP、PUBLISH-TAG-REGISTER 與 G 的 KNE/EPR 工程契約，實作 DHT-R6，以對應 PM/KN 驗收案例證明責任不跨界。
- [ ] 0.2 單筆來源配置與報表更正版分開。工程purpose/effective window最多一個authority；E管receiver配置，G管報表交易與投影，更正不走generic PATCH。驗證 DHT-R6 及 G 對應情境；產品實作不因本次文件提交而勾選。

## 1. 合約與相容性
- [ ] 1.1 盤點所有 full-list PUT callers、background writes、來源 identity 使用處（DHT-R4）。
- [ ] 1.2 決定可重用的 stable source identity 與 revision，不假定 table id 永久穩定（DHT-R1）。
- [ ] 1.3 設計 additive migration、資料保留 fixture 與版本能力協商。
- [ ] 1.4 定義單筆 patch/delete/create 與 error/result 合約，沿用現有 route response 慣例。

## 2. Backend 保證
- [ ] 2.1 實作 stable sourceRef/revision 的授權讀取與單筆意圖服務（DHT-R1）。
- [ ] 2.2 原子執行 revision、ownership、impact、uniqueness 與 scope auth 檢查（DHT-R2）。
- [ ] 2.3 保留 E1_SOURCE_REVISION_REQUIRED、managed/derived conflicts 與 selector/scaling metadata。
- [ ] 2.4 實作 canonical request idempotency 與 committed-result recovery（DHT-R3）。
- [ ] 2.5 分離 config commit 與 runtime reconciliation，提供可恢復的狀態。
- [ ] 2.6 遷移 legacy replacement writer，不允許 unversioned bypass；盤點相容 caller後才開 flag（DHT-R4）。

## 3. Frontend 草稿
- [ ] 3.1 將 baseline/draft/observation 分開，採穩定來源鍵與單筆 dirty state（U1-R5）。
- [ ] 3.2 統一 dirty guard 與 Back/scope/refresh/row-switch/close 行為（DHT-R5）。
- [ ] 3.3 接 A 的 panel-local save/discard/errors；失敗保留輸入，成功採 canonical response。
- [ ] 3.4 處理新 draft discard、既有 source impact/delete、同-key unknown-outcome retry。
- [ ] 3.5 實作 server capability fallback，禁止假單筆 full-list save。

## 4. 驗收與遷移
- [ ] 4.1 測同來源衝突、不同 scope 併發、hidden-filter 保留與 stale legacy write。
- [ ] 4.2 測 sourceRef 穩定、migration metadata/history/baseline byte-equivalence。
- [ ] 4.3 測 TOCTOU reference 新增、unknown impact、auth revoke 與 reviewed ownership。
- [ ] 4.4 測 save normalization、live update、IME、一次 guard 與 local draft discard。
- [ ] 4.5 測 committed response lost、same-key recovery、key/body mismatch 與 runtime activation failure。
- [ ] 4.6 focused tests、必要 migration tests、最終 pnpm verify；記錄 rollout/rollback evidence。
