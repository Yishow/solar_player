# Tasks｜MQTT已接收資料清單與受控來源探索

狀態：實作中；catalog 契約與隔離閘門已落地。

前置：無。

## 1. Implementation and Verification

- [x] 1.1 **Contracts** — 建立observation/reception/capture/candidate shared types及metadata schema，交付 **Observations exist independently of metric mappings**。（M1-R1 M1-R5 M1-R10）
- [x] 1.2 **Scope** — 命名範圍設定、授權查詢與未知namespace的inline分支，交付 **Discovery uses approved named reception scopes**。（M1-R2）
- [x] 1.3 **Tap** — runtime parse前的非阻塞catalog tap與有限候選queue，不改accepted history，交付 **Discovery is isolated from production ingestion**。（M1-R1 M1-R7）
- [x] 1.4 **Session** — unique-ID只讀capture client、非shared訂閱、timeout/reconnect/stop清理。（M1-R3）
- [x] 1.5 **Status** — 逐filter訂閱回覆與coverage/無流量/部分失敗狀態，交付 **Reception evidence is not a broker inventory promise**。（M1-R4）
- [x] 1.6 **Metadata** — 從receiver經extractor到E1保留retain/dup/qos/receivedAt/origin不可變transport evidence，明確映射catalog retained到sample.retain；sourceTimestamp/timestampQuality只由原始時間證據或reviewed timestamp path解析，不以receive-time捏造source time，也不把retained轉成false。交付 **Message provenance and identity claims are evidence based** 與 **Retained and replayed samples do not become fresh measurement evidence**；驗證M1-R5-S03/M1-R5-S04/M1-R6-S03/M1-R6-S04/M1-R6-S05/M1-R6-S06、`TRANSPORT_EVIDENCE_MISSING`與`RETAINED_SOURCE_TIME_UNKNOWN`，以及預設source-required、經sourceRevision/audit核准的allow-receive-time-estimate與retain=false/dup=false/qos∈{0,1,2} fallback限制。（M1-R5 M1-R6）
- [x] 1.7 **Catalog** — 候選tag/欄位搜尋、sampleRefs與version/pagination，選取不隨stream跳動，交付 **Candidate grouping respects tag identity and incomplete schemas**。（M1-R7 M1-R10）
- [x] 1.8 **Bounds** — 實作payload/session/global budgets、rate/drop counters、auth/redaction，交付 **Capture and payload inspection are bounded and authorized**。（M1-R8）
- [x] 1.9 **Offline** — 原地paste/import的有限JSON/scalar evidence與TTL過期提示，且catalog/offline evidence不直接更新accepted history、baseline或freshness，交付 **Offline evidence is available without pretending to be live**；以M1-R9-S01/M1-R9-S02及SQLite snapshot驗證。（M1-R9 M1-R10）
- [x] 1.10 **API** — capture CRUD、樣本與列表/stream API的錯誤語意與server-side scope驗證，交付 **Discovery and mapping APIs share stable references and recoverable states**。（M1-R4 M1-R8 M1-R10）
- [x] 1.11 **Rollout** — feature flag、managed來源合併展示、退出/rollback保持production，交付 **Rollout and rollback preserve existing source ownership**。（M1-R11）
- [x] 1.12 **Tests** — 以隔離MQTT broker/SQLite/API實測正常、拒絕、無資料、retained、重啟重送、無效source timestamp、負載、越權及清理；證明metadata到E1不遺失，`10000` retained舊值對`10100` accepted值不造成立即discontinuity、不寫history、不刷新live/freshness/baseline，再跑repo驗證。（M1-R1 M1-R2 M1-R3 M1-R4 M1-R5 M1-R6 M1-R7 M1-R8 M1-R9 M1-R10 M1-R11）

## Closeout Notes

- 測試驗證：
  1. `pnpm --filter @solar-display/shared test` (155 測通過，exit code 0)
     - `M1 catalog retained maps 1:1 onto sample.retain and never defaults missing evidence to false`
     - `M1 catalog and offline evidence never mutate accepted history`
     - `M1 retained 10000 without source time cannot overwrite accepted 10100`
     - `M1 discovery never defaults to # and requires an approved filter`
     - `M1 payload inspection redacts secrets`
  2. `pnpm --filter @solar-display/server test` (925 測通過，exit code 0)
     - `M1 reception profiles never include broker passwords`
     - `M1 capture accepts only its broker and selected topic filter`
     - `M1 expiry and feature rollback make captures inaccessible`
     - `M1 capture refuses unapproved filters and default #`
     - `M1 catalog tap of retained 10000 does not change accepted 10100 rows`
     - `mqtt-captures.test.ts` (授權阻擋、403/400 邊界)
  3. 交付 Gate：`pnpm verify` 全階段通過。

Archive 與 commit 依 repo workflow 另行執行。

## 2026-09-06 Review follow-up

已完成全部實作與驗收，準備封存。

