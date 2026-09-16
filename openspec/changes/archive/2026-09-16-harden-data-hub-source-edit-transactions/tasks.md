## 0. 跨發布端前置契約
- [x] 0.1 對齊最新 MQTT-OWNERSHIP、PUBLISH-TAG-REGISTER 與 G 的 KNE/EPR 工程契約，實作 DHT-R6（Receiver mutations preserve subscriber ownership and single physical-channel authority），以對應 PM/KN 驗收案例證明責任不跨界。 <!-- covers: Receiver mutations preserve subscriber ownership and single physical-channel authority -->
- [x] 0.2 單筆來源配置與報表更正版分開。工程purpose/effective window最多一個authority；E管receiver配置，G管報表交易與投影，更正不走generic PATCH。驗證 DHT-R6 及 G 對應情境（Receiver mutations preserve subscriber ownership and single physical-channel authority）。 <!-- covers: Receiver mutations preserve subscriber ownership and single physical-channel authority, 更新決策與邊界 -->

## 1. 合約與相容性
- [x] 1.1 盤點所有 full-list PUT callers、background writes、來源 identity 使用處，確保舊寫入不繞過保證（DHT-R4: Legacy writes cannot bypass the new safety guarantee）。 <!-- covers: Legacy writes cannot bypass the new safety guarantee, d3. 穩定引用與相容性 -->
- [x] 1.2 決定可重用的 stable source identity 與 revision，不假定 table id 永久穩定（DHT-R1: Generic source mutations use stable identity and version preconditions）。 <!-- covers: Generic source mutations use stable identity and version preconditions, d3. 穩定引用與相容性 -->
- [x] 1.3 設計 additive migration、資料保留 fixture 與版本能力協商（d2. 操作意圖與 api（新增契約提案））。 <!-- covers: Generic source mutations use stable identity and version preconditions, d2. 操作意圖與 api（新增契約提案） -->
- [x] 1.4 定義單筆 patch/delete/create 與 error/result 合約，沿用現有 route response 慣例（d2. 操作意圖與 api（新增契約提案））。 <!-- covers: Generic source mutations use stable identity and version preconditions, d2. 操作意圖與 api（新增契約提案） -->

## 2. Backend 保證
- [x] 2.1 實作 stable sourceRef/revision 的授權讀取與單筆意圖服務（DHT-R1: Generic source mutations use stable identity and version preconditions）。 <!-- covers: Generic source mutations use stable identity and version preconditions, d2. 操作意圖與 api（新增契約提案） -->
- [x] 2.2 原子執行 revision、ownership、impact、uniqueness 與 scope auth 檢查（DHT-R2: Mutation guards apply atomically and preserve source ownership）。 <!-- covers: Mutation guards apply atomically and preserve source ownership, d4. 原子檢查與冪等 -->
- [x] 2.3 保留 E1_SOURCE_REVISION_REQUIRED、managed/derived conflicts 與 selector/scaling metadata（DHT-R2: Mutation guards apply atomically and preserve source ownership）。 <!-- covers: Mutation guards apply atomically and preserve source ownership, d6. 刪除與錯誤 -->
- [x] 2.4 實作 canonical request idempotency 與 committed-result recovery（DHT-R3: Mutation outcomes are idempotent and separate runtime reconciliation）。 <!-- covers: Mutation outcomes are idempotent and separate runtime reconciliation, d4. 原子檢查與冪等 -->
- [x] 2.5 分離 config commit 與 runtime reconciliation，提供可恢復的狀態（DHT-R3: Mutation outcomes are idempotent and separate runtime reconciliation）。 <!-- covers: Mutation outcomes are idempotent and separate runtime reconciliation, d4. 原子檢查與冪等 -->
- [x] 2.6 遷移 legacy replacement writer，不允許 unversioned bypass；盤點相容 caller後才開 flag（DHT-R4: Legacy writes cannot bypass the new safety guarantee）。 <!-- covers: Legacy writes cannot bypass the new safety guarantee, d3. 穩定引用與相容性 -->

## 3. Frontend 草稿
- [x] 3.1 將 baseline/draft/observation 分開，採穩定來源鍵與單筆 dirty state（U1-R5: Filtering and refresh cannot discard other scopes or drafts）。 <!-- covers: Filtering and refresh cannot discard other scopes or drafts, d5. dirty guard 與儲存狀態機 -->
- [x] 3.2 統一 dirty guard 與 Back/scope/refresh/row-switch/close 行為（DHT-R5: Draft lifecycle has recoverable close and discard semantics）。 <!-- covers: Draft lifecycle has recoverable close and discard semantics, d5. dirty guard 與儲存狀態機 -->
- [x] 3.3 接 A 的 panel-local save/discard/errors；失敗保留輸入，成功採 canonical response（d5. dirty guard 與儲存狀態機）。 <!-- covers: Draft lifecycle has recoverable close and discard semantics, d5. dirty guard 與儲存狀態機 -->
- [x] 3.4 處理新 draft discard、既有 source impact/delete、同-key unknown-outcome retry（DHT-R5: Draft lifecycle has recoverable close and discard semantics）。 <!-- covers: Draft lifecycle has recoverable close and discard semantics, d6. 刪除與錯誤 -->
- [x] 3.5 實作 server capability fallback，禁止假單筆 full-list save（d2. 操作意圖與 api（新增契約提案））。 <!-- covers: Generic source mutations use stable identity and version preconditions, d2. 操作意圖與 api（新增契約提案） -->

## 4. 驗收與遷移
- [x] 4.1 測同來源衝突、不同 scope 併發、hidden-filter 保留與 stale legacy write（DHT-R1, DHT-R4）。 <!-- covers: Generic source mutations use stable identity and version preconditions, Legacy writes cannot bypass the new safety guarantee -->
- [x] 4.2 測 sourceRef 穩定、migration metadata/history/baseline byte-equivalence（DHT-R1）。 <!-- covers: Generic source mutations use stable identity and version preconditions, d3. 穩定引用與相容性 -->
- [x] 4.3 測 TOCTOU reference 新增、unknown impact、auth revoke 與 reviewed ownership（DHT-R2）。 <!-- covers: Mutation guards apply atomically and preserve source ownership, d4. 原子檢查與冪等 -->
- [x] 4.4 測 save normalization、live update、IME、一次 guard 與 local draft discard（DHT-R5）。 <!-- covers: Draft lifecycle has recoverable close and discard semantics, d5. dirty guard 與儲存狀態機 -->
- [x] 4.5 測 committed response lost、same-key recovery、key/body mismatch 與 runtime activation failure（DHT-R3）。 <!-- covers: Mutation outcomes are idempotent and separate runtime reconciliation, d4. 原子檢查與冪等 -->
- [x] 4.6 focused tests、必要 migration tests、最終 pnpm verify；記錄 rollout/rollback evidence。 <!-- covers: 更新決策與邊界 -->
