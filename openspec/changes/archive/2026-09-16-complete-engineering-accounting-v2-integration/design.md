## Context

目前 `site_energy_profiles` 已保存 `schema_version` 與三個 JSON 欄位，但 `siteEnergyProfileRepository.deserialize` 固定回傳 V1，`siteEnergyProfileService`、`profileSourceSnapshot`、`profileReadinessService` 與 `periodConsumptionService` 的型別和演算法也都只接受 physical meter profile。另一方面，工程日報已具備 registration、current head、revision history 與期間聚合，卻只透過工程 results route 回傳摘要。

本 change 要把這兩條既有路徑接在一個明確的 provider boundary。V1 physical 行為必須維持；V2 engineering 使用工程來源與工程日報，不建立虛構 meter rows，也不借用 V1 counter delta。資料庫現有 JSON、preview evidence 與 projection `result_json` / `context_key` 足以保存 versioned profile 與 provider fingerprint，不新增 schema 欄位。

## Goals / Non-Goals

**Goals:**

- 讓 repository 正確 round-trip V1/V2，不把 V2 coercion 成 V1。
- 讓 V2 preview/apply 驗證 engineering member refs、重疊、來源 effective 狀態及 preview snapshot。
- 讓 day/month/year/explicit period 經由一個 typed accounting result contract 分流到 physical 或 engineering provider。
- 讓 readiness、history 與 projection 使用相同 provider 結果和 fingerprint。
- 讓尚未支援 V2 的 consumer 以穩定錯誤明確失敗。

**Non-Goals:**

- 不改工程 MQTT payload、registration workflow 或八工程 identity。
- 不允許一個 profile 混用 physical 與 engineering provider。
- 不從工程期間 kWh 推導即時 kW，也不改 Factory Circuit power destinations。
- 不改 Data Hub/editor 視覺流程。
- 不新增 migration；若 apply 發現現有欄位無法表達必要 contract，必須先更新本設計，而不是自行擴充 schema。

## Decisions

### Repository returns a versioned profile union without coercion

`siteEnergyProfileRepository` 依 persisted `schema_version` 建立 `SiteEnergyProfileV1 | SiteEnergyProfileV2`。V1 保留既有 shape；V2 額外保留 `providerKind` 與 typed `AccountingMemberRef` JSON。未知 version 拋出 `PROFILE_VERSION_UNSUPPORTED`，不得以 V1 default 讀取。

替代方案是新增平行 V2 table。現有 table 已按 site/revision 儲存 immutable profile JSON，平行 table 會拆開 revision selection 與 rollback，因此不採用。

### Provider evidence uses a discriminated snapshot and deterministic fingerprint

profile preview token 的 `source_snapshot_json` 保存 `ProfileProviderSnapshot`：

- physical：現有 canonical meter source snapshots。
- engineering：每個 member 保存 `sourceRef`、`engineeringId`、`mode`、`configurationRevision`、`definitionRevision`、`calendarRevision`、`approvedPublisherId` 與 enabled/reviewed authority。

期間 provider 另計算 deterministic fingerprint，內容為 requested half-open period、profile revision、依 identity/date 排序的 effective head business key、dataRevision、periodStatus、coverage、quality 與 content digest。fingerprint 不包含讀取時間或資料庫 rowid。

替代方案只綁 registration revision。這無法偵測日報 correction/withdrawal，會讓舊 projection 被誤用，因此不採用。

### One accounting result contract wraps provider-specific evidence

新增 shared `AccountingPeriodResult`（名稱可在 apply 時依既有 vocabulary 調整，但欄位不可弱化）：

- `providerKind: "physical" | "engineering"`
- `periodStart`, `periodEnd`, `siteTimeZone`, `profileRevision`
- `valueKwh: string | null`
- `quality: "valid" | "partial" | "invalid" | "unavailable"`
- `coverage: "complete" | "partial" | "unknown"`
- `missingIdentities: string[]`
- `revisionFingerprint: string`
- `issues?: string[]`

physical adapter 包裝既有 `PeriodConsumptionResult`，不改其 delta 演算法與原 response fields。engineering adapter 讀 effective report heads，依 expected engineering identity/date 判斷完整性，直接加總 usable interval values。correction 取新 head；withdrawn/invalid/partial 使 coverage 降級且不得沿用上一版 final。

替代方案把工程日報轉成 meter samples 再走 V1 resolver。這會製造不存在的 baseline、epoch 與 meter identity，違反 EPR-R6，因此不採用。

### V2 preview and apply share the existing optimistic transaction boundary

`/api/data-hub/sites/:scope/energy-profile/preview` 接受 versioned profile union。V2 僅允許 KN、`providerKind=engineering`，並在 token 中保存 canonical draft、provider snapshot、period selection、review time 與 preview result fingerprint。

apply 在同一 immediate transaction 內依序檢查 idempotency receipt、token expiry、canonical draft、expected profile revision、current provider snapshot 和 current period fingerprint，再寫入下一個 profile revision。任何 stale evidence 回傳 409 `PROFILE_SOURCE_CONFLICT`，且 profile、receipt、projection 都維持零寫入。成功 apply 沿用既有 revision/active-row model。

替代方案允許 apply 後再刷新 provider evidence。這會保存一個 operator 未實際預覽的會計結果，因此不採用。

### Provider-aware consumers adopt incrementally and fail visibly elsewhere

readiness、management history 與 canonical period projection是本 change 必須支援的 consumer。它們從 active profile schema/providerKind 選擇 resolver，不靠 member 欄位形狀猜測。

其他 V1-only consumer 必須在入口呼叫 version guard，回傳 `PROFILE_VERSION_UNSUPPORTED` 或現有安全 unavailable envelope並包含該 code；不得 catch 後回退 legacy counter、raw snapshots 或空 V1 profile。每個 consumer 的選擇需由 contract test 固定。

### Existing projection storage keys include provider evidence

沿用 `consumption_projections.context_key`、`input_checksum` 與 `result_json`。V2 `context_key` 納入 providerKind、profile revision、period boundaries 與 revision fingerprint；active lookup 不得命中 physical projection 或舊 fingerprint。新 correction/withdrawal 會產生新 key/result，不覆寫不可變舊結果。

不新增 migration，因為現有欄位已能保存完整結果與 context；apply 前須用 migration fixture 與 restart test 證明。

## Implementation Contract

**Observable behavior**

- 管理者可對 KN 送出 V2 engineering profile preview，看到工程 provider 的期間值、coverage、missing identities 與 readiness；preview 不寫 active profile。
- 同一 draft 和未變 provider evidence 可 apply；response 與後續 GET 保留 `schemaVersion: 2`、`providerKind`、members、revision、effectiveFrom 與 readiness。
- 日報 correction 或 withdrawal 後再次查詢同期間會得到新 fingerprint 與新/降級結果；舊 projection 不會被重用。
- CL V1 與既有 KN V1 的 API payload、計算值、history 及 stored rows 維持既有 contract。

**Interfaces and data shape**

- Shared profile type為 `SiteEnergyProfileV1 | SiteEnergyProfileV2` 的 discriminated union。
- Profile preview/apply endpoints 保持既有 path、authorization、token 與 idempotency request fields；`draft` 擴充為 versioned union。
- V2 preview calculator/result 必須暴露上述 `AccountingPeriodResult` 資訊。若為相容既有 response 而保留 `calculator.period`，欄位須可無損對應，且 `providerKind` 與 `revisionFingerprint` 必須存在。
- Repository GET/list API 必須 round-trip schema version，不得填造 V1-only member fields。

**Failure modes**

- unknown schema：`PROFILE_VERSION_UNSUPPORTED`。
- scope/provider/member mismatch 或 overlapping refs：422，分別使用穩定的 `PROFILE_PROVIDER_INVALID` / `PROFILE_OVERLAP_CONFLICT` domain code及欄位資訊。
- referenced engineering registration 不存在、停用、未核准或 mode 不符：422 `PROFILE_ENGINEERING_SOURCE_UNAVAILABLE`。
- preview 後 profile revision、registration 或 report fingerprint 改變：409 `PROFILE_SOURCE_CONFLICT`，零 domain write。
- V2 requested period 缺資料：正常 typed partial/unavailable result；不得以 500 或 physical fallback 代替。
- V1-only consumer：可辨識的 `PROFILE_VERSION_UNSUPPORTED` unavailable/error contract，不得 silent downgrade。

**Acceptance criteria**

- Shared validation tests固定 mixed-provider、duplicate engineering identity、sourceRef/engineeringId mismatch 與 V1 compatibility。
- Repository/service tests使用 migration-built SQLite，證明 V2 preview/apply/restart readback、idempotent retry、stale registration、stale report fingerprint、rollback 與 CL isolation。
- Provider tests覆蓋 two-day sum、correction replacement、withdrawal degradation、missing identity、zero total與 deterministic fingerprint。
- Route/history/readiness tests證明 management authorization、V2 result shape、projection invalidation及 unsupported consumer failure。
- 最終跑 focused tests、`pnpm verify`、`git diff --check`。

**Scope boundaries**

- In scope：shared contracts、profile repository/preview/apply、provider snapshots、period projection/readiness、management history、對應 routes與 tests。
- Out of scope：MQTT admission重寫、UI redesign、physical/engineering混合會計、power metric derivation、field/device acceptance。

## Risks / Trade-offs

- [Risk] Repository union 會讓大量既有 V1 call site 出現型別錯誤 → 以明確 version guard逐一分類；只有 readiness/history/common projection可新增 V2 branch，其餘 fail visibly。
- [Risk] fingerprint 若依 row order或時間產生會造成無限 projection churn → canonical sort並只納入 business evidence；測試相同資料不同查詢順序得到相同 fingerprint。
- [Risk] preview 到 apply 間日報更新使 operator頻繁遇到 conflict → 這是必要 optimistic concurrency；UI沿用重新 preview流程，不放寬 stale apply。
- [Risk] partial工程資料被誤標為完整 site consumption → result固定攜帶 coverage/missing identities，且 readiness須同時檢查 profile review與 period completeness。
- [Risk] rollback到 V1後殘留 V2 projection → projection lookup key包含 providerKind/profile revision；rollback只切 active profile，不刪除歷史 immutable projection。
